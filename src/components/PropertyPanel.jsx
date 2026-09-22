import { createContext, useContext, useEffect, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { NodeWrapper } from '../lib/diagram-library.js';
import { groupColorStyle } from '../lib/groupColors.js';
import { readPropertyValue, writePropertyValue, hasScriptEditorProp } from '../lib/nodeProperties.js';
import ScriptEditorModal from './ScriptEditorModal.jsx';

// 어떤 필드가 지금 활성 상태인지(가장 최근에 포커스됐는지)를 필드 각각이 스스로
// 판단할 수 있도록 올려보내는 컨텍스트 — Field 호출부가 여러 군데(텍스트/설명/
// 체크박스/셀렉트/스크립트버튼)라서 매번 prop을 꽂는 것보다 이쪽이 덜 번거롭다.
// 설명을 패널 한쪽에 모아두는 대신, 활성 필드 자신이 자기 설명을 자기 바로 아래에
// 그려서 스크롤 없이 바로 보이게 한다.
const FieldDescriptionContext = createContext(null);

/**
 * PropertyPanel
 *
 * Shows when exactly one Block is selected. Reads/writes values straight
 * into `block.userData` (an XML NodeWrapper) using each property's
 * `buildName` — NOT `sourceName`. `sourceName` is the meta/UI-facing name;
 * `buildName` is the actual attribute name the ScenarioDesigner build
 * output uses (e.g. TransferNode's "DN" property has buildName "target-dn").
 *
 * Caveat #1 (worked around below): `Diagram.createNode()` always passes
 * `userData: null` for brand-new blocks — that XML fragment only gets
 * populated when a block is loaded via `deserialize()`. So for anything
 * placed fresh from the "삽입" ribbon tab, `block.userData` starts out
 * `null`, and writing into it silently no-ops (`null?.attr(...)` just
 * returns `undefined`, no error). `ensureUserData()` below lazily creates
 * it with `new NodeWrapper(nodeDef.buildTag)` the same way deserialize()
 * would have, the first time a property is actually edited.
 *
 * Caveat #2 (documented, not solved here): editing here goes straight
 * through NodeWrapper.attr() and does NOT go through
 * diagram.actionManager. There is no ActionManager.* action type for
 * custom property changes (only caption/comment/move/etc. are tracked),
 * so these edits are NOT undoable via the ribbon's 실행 취소 button.
 */

// RecordsetGetValueNode 전용: FieldIndex/FieldName 중 하나(둘 중 하나만 유효 —
// meta 설명상 FieldIndex를 쓰면 FieldName은 무시됨)와 Variable이 세미콜론(;)으로
// 구분된 값을 개수 맞춰 나란히 넣어야 하는 한 쌍이라, 세 프로퍼티를 각각 텍스트
// 필드로 따로 보여주는 대신 "이름/인덱스 - 변수" 행을 하나씩 추가하는 매핑
// 편집기 하나로 합쳐서 보여준다(사용자 피드백 — ; 구분 문자열을 직접 타이핑하는
// 대신 필드 단위로 추가/삭제하고 싶다는 요청, RecordsetGetValueNode 외 다른
// 노드에도 같은 이름의 프로퍼티가 나타날 가능성은 낮지만 노드 타입명이 아니라
// 이 세 프로퍼티가 실제로 다 있는지로 판별해 좀 더 안전하게 잡는다).
function findRecordsetFieldTriplet(nodeDef) {
    const props = nodeDef?.properties ?? [];
    const byName = Object.fromEntries(props.map((p) => [p.name, p]));
    if (byName.ColumnIndex && byName.ColumnName && byName.Variable) {
        return byName;
    }
    return null;
}

function ensureUserData(block, meta) {
    if (!block.userData) {
        const buildTag = meta?.nodes?.[block.metaName]?.buildTag ?? block.metaName;
        block.userData = new NodeWrapper(buildTag);
    }
    return block.userData;
}

export default function PropertyPanel({ block, meta, autoOpenScriptEditorBlockId, onAutoOpenScriptEditorConsumed, onDirty }) {
    useStylesheet('/css/property-panel.css');

    if (!block) {
        return (
            <div className="property-panel">
                <div className="property-panel-empty">
                    Please select a block to view its properties.
                </div>
            </div>
        );
    }

    const nodeDef = meta?.nodes?.[block.metaName];
    const autoOpenScript = autoOpenScriptEditorBlockId === block.id;

    // key={block.id}로 감싸서, 다른 블록을 선택하면 아래 필드들이 전부
    // 새 초기값으로 리마운트되도록 한다 (그렇지 않으면 controlled input들이
    // 이전 블록 값을 들고 있는 채로 남는 stale-value 버그가 생김).
    return (
        <PropertyPanelBody
            key={block.id}
            block={block}
            nodeDef={nodeDef}
            meta={meta}
            autoOpenScript={autoOpenScript}
            onAutoOpenScriptConsumed={onAutoOpenScriptEditorConsumed}
            onDirty={onDirty}
        />
    );
}

function PropertyPanelBody({ block, nodeDef, meta, autoOpenScript, onAutoOpenScriptConsumed, onDirty }) {
    const [caption, setCaptionState] = useState(block.caption ?? '');
    const [comment, setCommentState] = useState(block.comment ?? '');
    // 지금 활성(가장 최근에 포커스)된 필드의 key — Field가 이 값과 자기 fieldKey를
    // 비교해서 자기 설명을 보여줄지 스스로 결정한다.
    const [activeFieldKey, setActiveFieldKey] = useState(null);

    // ScriptNode처럼 노드 설명을 도움말 모달로 따로 빼둔 경우는 하단에도 안 보여준다.
    const nodeDescription = hasScriptEditorProp(nodeDef) ? null : nodeDef?.description;
    const recordsetFields = findRecordsetFieldTriplet(nodeDef);
    // 리본/캔버스 블록과 같은 그룹 색상 체계를 재사용 — 새 팔레트를 만들지 않고
    // 지금 선택된 블록의 카테고리 색을 패널 전체의 accent로 그대로 가져다 쓴다.
    const accentStyle = groupColorStyle(nodeDef?.group);

    return (
        <FieldDescriptionContext.Provider value={{ activeFieldKey, setActiveFieldKey }}>
            <div className="property-panel" style={accentStyle}>
                <div className="property-panel-header">
                    {nodeDef?.group && (
                        <div className="property-panel-eyebrow">
                            <span className="property-panel-eyebrow-dot" />
                            {nodeDef.group}
                        </div>
                    )}
                    <div className="property-panel-title">{nodeDef?.displayName ?? block.metaName}</div>
                    <div className="property-panel-subtitle">{block.metaName}</div>
                </div>

                <div className="property-panel-body">
                    {/* onBlur이 아니라 onChange에서 바로 커밋한다 — 캔버스 빈 곳을 클릭해서
                        블록을 선택 해제하면 이 블록의 PropertyPanel 자체가 즉시 언마운트되는데,
                        그 처리가 브라우저의 blur 이벤트 발화보다 먼저 끝나버려서 onBlur 핸들러가
                        아예 호출되지 않는 경우가 있었다 (타이핑한 값이 통째로 사라지는 버그의
                        원인). 매 입력마다 바로 반영하면 그 경쟁 자체가 없어진다. */}
                    <Field fieldKey="caption" label="텍스트" description="블록에 표시되는 이름(캡션)입니다.">
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => {
                                setCaptionState(e.target.value);
                                block.setCaption(e.target.value);
                                onDirty?.();
                            }}
                        />
                    </Field>

                    <Field fieldKey="comment" label="설명" description="블록에 대한 메모입니다. 빌드 결과에는 포함되지 않습니다.">
                        <textarea
                            value={comment}
                            onChange={(e) => {
                                setCommentState(e.target.value);
                                block.setComment(e.target.value);
                                onDirty?.();
                            }}
                            rows={2}
                        />
                    </Field>

                    {nodeDef?.properties?.length > 0 && (
                        <>
                            <div className="property-panel-section-title">속성</div>
                            {nodeDef.properties.map((prop) => {
                                // ColumnIndex/Variable은 아래 ColumnName 자리에서 매핑 편집기
                                // 하나로 같이 그려지므로 각자 자리에서는 건너뛴다.
                                if (recordsetFields && (prop.name === 'ColumnIndex' || prop.name === 'Variable')) {
                                    return null;
                                }
                                if (recordsetFields && prop.name === 'ColumnName') {
                                    return (
                                        <RecordsetFieldMappingField
                                            key="recordset-field-mapping"
                                            block={block}
                                            meta={meta}
                                            fields={recordsetFields}
                                            onDirty={onDirty}
                                        />
                                    );
                                }
                                return (
                                    <PropertyField
                                        key={prop.name}
                                        block={block}
                                        prop={prop}
                                        meta={meta}
                                        nodeDescription={nodeDef.description}
                                        autoOpenScript={autoOpenScript}
                                        onAutoOpenScriptConsumed={onAutoOpenScriptConsumed}
                                        onDirty={onDirty}
                                    />
                                );
                            })}
                        </>
                    )}

                    {nodeDescription && (
                        <div className="property-panel-description">
                            <span className="property-panel-description-icon" aria-hidden="true">i</span>
                            <span>{nodeDescription}</span>
                        </div>
                    )}
                </div>
            </div>
        </FieldDescriptionContext.Provider>
    );
}

function PropertyField({ block, prop, meta, nodeDescription, autoOpenScript, onAutoOpenScriptConsumed, onDirty }) {
    const initial = readPropertyValue(block.userData, prop);
    const [value, setValue] = useState(initial ?? '');
    const isEmpty = prop.required && !value;

    const label = (
        <>
            {prop.displayName || prop.name}
            {prop.required && <span className="property-field-required">*</span>}
        </>
    );

    if (prop.type === 'Boolean') {
        const boolInitial = block.userData ? block.userData.attrAsBoolean(prop.buildName) : false;
        return (
            <Field fieldKey={prop.name} label={label} description={prop.description} isEmpty={false}>
                <input
                    type="checkbox"
                    checked={value === '' ? boolInitial : value === 'true'}
                    onChange={(e) => {
                        const next = String(e.target.checked);
                        setValue(next);
                        ensureUserData(block, meta).attr(prop.buildName, next);
                        onDirty?.();
                    }}
                />
            </Field>
        );
    }

    // meta.json이 이 프로퍼티에 valueSeparator를 정의해뒀다는 건 "여러 값을 구분자로
    // 이어붙인 문자열"이라는 뜻(예: AudioData, SPParams — 설명에도 "여러개를 설정하는
    // 경우 ;로 구분합니다"라고 적혀있다). 그 구분자 문자열을 직접 입력하게 두는 대신
    // 값 하나하나를 필드로 추가/삭제하는 리스트 편집기로 보여준다.
    if (prop.valueSeparator) {
        return (
            <ListPropertyField
                fieldKey={prop.name}
                label={label}
                description={prop.description}
                isEmpty={isEmpty}
                separator={prop.valueSeparator}
                value={value}
                onChange={(next) => {
                    setValue(next);
                    writePropertyValue(ensureUserData(block, meta), prop, next);
                    onDirty?.();
                }}
            />
        );
    }

    if (prop.itemsSourceKey && meta?.itemSources?.[prop.itemsSourceKey]) {
        return (
            <Field fieldKey={prop.name} label={label} description={prop.description} isEmpty={isEmpty}>
                <select
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        writePropertyValue(ensureUserData(block, meta), prop, e.target.value);
                        onDirty?.();
                    }}
                >
                    <option value="">(선택 안 함)</option>
                    {meta.itemSources[prop.itemsSourceKey].map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.display}
                        </option>
                    ))}
                </select>
            </Field>
        );
    }

    if (prop.customEditorTypeName === 'ScriptEditor') {
        return (
            <ScriptEditorField
                fieldKey={prop.name}
                label={label}
                description={prop.description}
                isEmpty={isEmpty}
                value={value}
                caption={prop.customEditorCaption}
                helpText={nodeDescription}
                onSave={(next) => {
                    setValue(next);
                    writePropertyValue(ensureUserData(block, meta), prop, next);
                    onDirty?.();
                }}
                autoOpen={autoOpenScript}
                onAutoOpenConsumed={onAutoOpenScriptConsumed}
            />
        );
    }

    // onBlur이 아니라 onChange에서 바로 커밋한다 — 위 텍스트/설명 필드와 같은 이유
    // (캔버스 빈 곳 클릭으로 블록 선택이 풀리면 PropertyPanel이 blur 이벤트가 뜨기
    // 전에 언마운트돼서 onBlur 핸들러가 아예 안 불릴 수 있음).
    if (prop.type === 'Number') {
        return (
            <Field fieldKey={prop.name} label={label} description={prop.description} isEmpty={isEmpty}>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        writePropertyValue(ensureUserData(block, meta), prop, e.target.value);
                        onDirty?.();
                    }}
                />
            </Field>
        );
    }

    return (
        <Field fieldKey={prop.name} label={label} description={prop.description} isEmpty={isEmpty}>
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    writePropertyValue(ensureUserData(block, meta), prop, e.target.value);
                }}
            />
        </Field>
    );
}

// value(구분자로 이어붙인 문자열)를 필드 단위로 쪼개서 각각 지우기 버튼이 달린
// 입력칸으로 보여주고, "+ 필드 추가"로 새 칸을 늘린다. 편집 중에는 항상 최소
// 한 칸(빈 문자열이라도)을 보여줘야 사용자가 첫 값을 타이핑할 자리가 생긴다 —
// 그 한 칸을 지우면 다시 값 없는 상태(빈 문자열)로 돌아가고, 다음 렌더에서
// 똑같이 빈 칸 하나로 보여진다(무한 루프 아님, split('')이 아니라 빈 문자열
// 자체를 []로 취급하기 때문).
function ListPropertyField({ fieldKey, label, description, isEmpty, separator, value, onChange }) {
    const parsed = value ? value.split(separator) : [];
    const items = parsed.length > 0 ? parsed : [''];

    const commit = (nextItems) => onChange(nextItems.join(separator));

    return (
        <Field fieldKey={fieldKey} label={label} description={description} isEmpty={isEmpty}>
            <div className="property-field-list">
                {items.map((item, index) => (
                    <div className="property-field-list-row" key={index}>
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                                const next = [...items];
                                next[index] = e.target.value;
                                commit(next);
                            }}
                        />
                        <button
                            type="button"
                            className="property-field-list-remove"
                            aria-label="필드 삭제"
                            onClick={() => commit(items.filter((_, i) => i !== index))}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button type="button" className="property-field-list-add" onClick={() => commit([...items, ''])}>
                    + 필드 추가
                </button>
            </div>
        </Field>
    );
}

// ColumnIndex(또는 ColumnName)과 Variable을 같은 순번끼리 짝지어 {key, variable}
// 행 배열로 만든다. 두 소스 문자열의 개수가 안 맞는 저장 데이터(수동 편집 등으로
// 어긋난 경우)도 있을 수 있어 더 긴 쪽 길이에 맞춰 짧은 쪽은 빈 문자열로 채운다.
function zipFields(keySource, variableSource) {
    const keys = keySource ? keySource.split(';') : [];
    const variables = variableSource ? variableSource.split(';') : [];
    const length = Math.max(keys.length, variables.length, 1);
    return Array.from({ length }, (_, i) => ({ key: keys[i] ?? '', variable: variables[i] ?? '' }));
}

// RecordsetGetValueNode의 ColumnIndex/ColumnName/Variable 세 프로퍼티를 하나의
// "이름(또는 인덱스) → 변수" 매핑 편집기로 합쳐서 보여준다. 어느 쪽 키(이름/
// 인덱스)를 쓸지는 라디오로 고르고, 안 쓰는 쪽 프로퍼티는 커밋할 때마다 빈
// 값으로 비워서 값이 예전 모드 그대로 남아 엔진에 혼선을 주는 일이 없게 한다.
function RecordsetFieldMappingField({ block, meta, fields, onDirty }) {
    const initialIndex = readPropertyValue(block.userData, fields.ColumnIndex) ?? '';
    const initialName = readPropertyValue(block.userData, fields.ColumnName) ?? '';
    const initialVariable = readPropertyValue(block.userData, fields.Variable) ?? '';

    const [mode, setMode] = useState(initialIndex ? 'index' : 'name');
    const [rows, setRows] = useState(() => zipFields(mode === 'index' ? initialIndex : initialName, initialVariable));

    const commit = (nextRows, nextMode) => {
        setRows(nextRows);
        setMode(nextMode);
        const data = ensureUserData(block, meta);
        const keyProp = nextMode === 'index' ? fields.ColumnIndex : fields.ColumnName;
        const otherProp = nextMode === 'index' ? fields.ColumnName : fields.ColumnIndex;
        writePropertyValue(data, keyProp, nextRows.map((r) => r.key).join(';'));
        writePropertyValue(data, otherProp, '');
        writePropertyValue(data, fields.Variable, nextRows.map((r) => r.variable).join(';'));
        onDirty?.();
    };

    const updateRow = (index, part, val) => {
        commit(rows.map((row, i) => (i === index ? { ...row, [part]: val } : row)), mode);
    };

    const removeRow = (index) => {
        const next = rows.filter((_, i) => i !== index);
        commit(next.length > 0 ? next : [{ key: '', variable: '' }], mode);
    };

    const isEmpty = fields.Variable.required && rows.every((r) => !r.variable);
    const label = (
        <>
            필드 매핑
            {fields.Variable.required && <span className="property-field-required">*</span>}
        </>
    );
    const keyLabel = mode === 'index'
        ? (fields.ColumnIndex.displayName || fields.ColumnIndex.name)
        : (fields.ColumnName.displayName || fields.ColumnName.name);

    return (
        <Field
            fieldKey="recordset-field-mapping"
            label={label}
            description={`${fields.ColumnName.description} ${fields.Variable.description}`}
            isEmpty={isEmpty}
        >
            <div className="property-field-mapping">
                <div className="property-field-mapping-mode">
                    <label>
                        <input type="radio" checked={mode === 'name'} onChange={() => commit(rows, 'name')} />
                        이름으로
                    </label>
                    <label>
                        <input type="radio" checked={mode === 'index'} onChange={() => commit(rows, 'index')} />
                        인덱스로
                    </label>
                </div>
                <div className="property-field-mapping-header">
                    <span>{keyLabel}</span>
                    <span>{fields.Variable.displayName || fields.Variable.name}</span>
                </div>
                {rows.map((row, index) => (
                    <div className="property-field-mapping-row" key={index}>
                        <input type="text" value={row.key} onChange={(e) => updateRow(index, 'key', e.target.value)} />
                        <input type="text" value={row.variable} onChange={(e) => updateRow(index, 'variable', e.target.value)} />
                        <button
                            type="button"
                            className="property-field-list-remove"
                            aria-label="필드 삭제"
                            onClick={() => removeRow(index)}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button type="button" className="property-field-list-add" onClick={() => commit([...rows, { key: '', variable: '' }], mode)}>
                    + 필드 추가
                </button>
            </div>
        </Field>
    );
}

function ScriptEditorField({ fieldKey, label, description, isEmpty, value, caption, helpText, onSave, autoOpen, onAutoOpenConsumed }) {
    const [isOpen, setIsOpen] = useState(false);
    const lineCount = value ? value.split('\n').length : 0;

    // 블록을 더블클릭했을 때(App.jsx의 onNodeDoubleClicked) 프로퍼티 패널을 거치지
    // 않고 바로 이 모달이 뜨도록 하는 진입점. 매번 다시 열리지 않도록 열자마자
    // "소비"(부모 상태 초기화)한다 — 이후 이 블록을 그냥 선택만 해도 자동으로
    // 열리지 않는다.
    useEffect(() => {
        if (autoOpen) {
            setIsOpen(true);
            onAutoOpenConsumed?.();
        }
    }, [autoOpen, onAutoOpenConsumed]);

    return (
        <>
            <Field fieldKey={fieldKey} label={label} description={description} isEmpty={isEmpty}>
                <button type="button" className="property-field-script-button" onClick={() => setIsOpen(true)}>
                    {value ? `${caption || '스크립트 편집...'} (${lineCount}줄)` : caption || '스크립트 편집...'}
                </button>
            </Field>

            {/* Field wraps its children in a <label> — a click anywhere inside a
                <label> re-focuses the label's control natively, regardless of
                the click target's own CSS position. Rendering the modal as a
                *sibling* of Field (not a child) keeps every click inside it
                from being hijacked back to this button. */}
            {isOpen && (
                <ScriptEditorModal
                    title={caption || '스크립트 편집'}
                    value={value}
                    helpText={helpText}
                    onCancel={() => setIsOpen(false)}
                    onSave={(next) => {
                        onSave(next);
                        setIsOpen(false);
                    }}
                />
            )}
        </>
    );
}

function Field({ fieldKey, label, description, isEmpty, children }) {
    const { activeFieldKey, setActiveFieldKey } = useContext(FieldDescriptionContext) ?? {};
    const isActive = fieldKey != null && activeFieldKey === fieldKey;

    return (
        <label
            className={`property-field ${isEmpty ? 'is-empty' : ''}`}
            title={description || undefined}
            // capture 단계로 붙여서, label 안의 input/select/textarea/button 등
            // 어떤 컨트롤에 포커스가 가든(클릭이든 Tab 이동이든) 한 곳에서 잡는다.
            // React 17+의 onFocus/onBlur는 focusin/focusout 기반이라 자식 포커스도
            // 자연스럽게 버블링돼 올라온다 — Field 각 호출부를 건드릴 필요가 없다.
            onFocus={() => setActiveFieldKey?.(fieldKey)}
        >
            <span className="property-field-label">{label}</span>
            {children}
            {isActive && description && (
                <div className="property-field-description">
                    <span className="property-field-description-icon" aria-hidden="true">i</span>
                    <span>{description}</span>
                </div>
            )}
        </label>
    );
}