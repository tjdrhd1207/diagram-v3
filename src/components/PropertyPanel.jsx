import { createContext, useContext, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { NodeWrapper } from '../lib/diagram-library.js';
import { groupColorStyle } from '../lib/groupColors.js';
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

// ScriptNode's node-level `description` is really JS-authoring documentation
// (syntax notes, the full util.* function reference) rather than a
// user-facing summary of the block — it belongs behind the script editor's
// help button, not repeated at the bottom of the property panel.
function hasScriptEditorProp(nodeDef) {
    return nodeDef?.properties?.some((p) => p.customEditorTypeName === 'ScriptEditor') ?? false;
}

function ensureUserData(block, meta) {
    if (!block.userData) {
        const buildTag = meta?.nodes?.[block.metaName]?.buildTag ?? block.metaName;
        block.userData = new NodeWrapper(buildTag);
    }
    return block.userData;
}

/**
 * 대부분의 프로퍼티는 userData.attr(buildName)로 그냥 속성이지만, designer.meta.json을
 * 전수 조사해보니 buildDataType이 두 가지 더 있다(실제 디자이너 파일 대조로 확정 —
 * designerXml.js의 파일 상단 주석 참고):
 * - 'CData': 값이 속성이 아니라 buildName 이름의 자식 엘리먼트 텍스트로 들어간다
 *   (예: ScriptNode의 Script → <javascript><source>...</source></javascript>).
 * - 'XmlChild': 원래 구조화된 서브트리라 텍스트 입력 하나로 안전하게 다시 쓸 방법이
 *   없다 — v1은 읽기만 지원(문자열로 보여주기), 쓰기는 no-op.
 * 이걸 안 챙기면 Script류 프로퍼티는 항상 attr()이 null만 반환해서(값이 아예 속성이
 * 아니므로) 에디터가 늘 빈 채로 보이고, 저장도 조용히 무시된다.
 */
function readPropertyValue(userData, prop) {
    if (!userData) return null;
    if (prop.buildDataType === 'CData' || prop.buildDataType === 'XmlChild') {
        const child = userData.child(prop.buildName);
        return child ? child.value() : null;
    }
    return userData.attr(prop.buildName);
}

function writePropertyValue(userData, prop, value) {
    if (prop.buildDataType === 'CData') {
        const child = userData.child(prop.buildName) ?? userData.appendChild(prop.buildName);
        child.value(value);
        return;
    }
    if (prop.buildDataType === 'XmlChild') {
        // v1 범위 밖 — 구조화된 서브트리를 텍스트 하나로 되돌려 쓰지 않는다.
        return;
    }
    userData.attr(prop.buildName, value);
}

export default function PropertyPanel({ block, meta }) {
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

    // key={block.id}로 감싸서, 다른 블록을 선택하면 아래 필드들이 전부
    // 새 초기값으로 리마운트되도록 한다 (그렇지 않으면 controlled input들이
    // 이전 블록 값을 들고 있는 채로 남는 stale-value 버그가 생김).
    return <PropertyPanelBody key={block.id} block={block} nodeDef={nodeDef} meta={meta} />;
}

function PropertyPanelBody({ block, nodeDef, meta }) {
    const [caption, setCaptionState] = useState(block.caption ?? '');
    const [comment, setCommentState] = useState(block.comment ?? '');
    // 지금 활성(가장 최근에 포커스)된 필드의 key — Field가 이 값과 자기 fieldKey를
    // 비교해서 자기 설명을 보여줄지 스스로 결정한다.
    const [activeFieldKey, setActiveFieldKey] = useState(null);

    // ScriptNode처럼 노드 설명을 도움말 모달로 따로 빼둔 경우는 하단에도 안 보여준다.
    const nodeDescription = hasScriptEditorProp(nodeDef) ? null : nodeDef?.description;
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
                            }}
                        />
                    </Field>

                    <Field fieldKey="comment" label="설명" description="블록에 대한 메모입니다. 빌드 결과에는 포함되지 않습니다.">
                        <textarea
                            value={comment}
                            onChange={(e) => {
                                setCommentState(e.target.value);
                                block.setComment(e.target.value);
                            }}
                            rows={2}
                        />
                    </Field>

                    {nodeDef?.properties?.length > 0 && (
                        <>
                            <div className="property-panel-section-title">속성</div>
                            {nodeDef.properties.map((prop) => (
                                <PropertyField key={prop.name} block={block} prop={prop} meta={meta} nodeDescription={nodeDef.description} />
                            ))}
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

function PropertyField({ block, prop, meta, nodeDescription }) {
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
                    }}
                />
            </Field>
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
                }}
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

function ScriptEditorField({ fieldKey, label, description, isEmpty, value, caption, helpText, onSave }) {
    const [isOpen, setIsOpen] = useState(false);
    const lineCount = value ? value.split('\n').length : 0;

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