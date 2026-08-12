import { useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { NodeWrapper } from '../lib/diagram-library.js';
import ScriptEditorModal from './ScriptEditorModal.jsx';

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

    const commitCaption = () => block.setCaption(caption);
    const commitComment = () => block.setComment(comment);

    return (
        <div className="property-panel">
            <div className="property-panel-header">
                <div className="property-panel-title">{nodeDef?.displayName ?? block.metaName}</div>
                <div className="property-panel-subtitle">{block.metaName}</div>
            </div>

            <div className="property-panel-body">
                <Field label="텍스트">
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaptionState(e.target.value)}
                        onBlur={commitCaption}
                    />
                </Field>

                <Field label="설명">
                    <textarea
                        value={comment}
                        onChange={(e) => setCommentState(e.target.value)}
                        onBlur={commitComment}
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

                {nodeDef?.description && !hasScriptEditorProp(nodeDef) && (
                    <div className="property-panel-description">{nodeDef.description}</div>
                )}
            </div>
        </div>
    );
}

function PropertyField({ block, prop, meta, nodeDescription }) {
    const initial = block.userData ? block.userData.attr(prop.buildName) : null;
    const [value, setValue] = useState(initial ?? '');
    const isEmpty = prop.required && !value;

    const commit = () => ensureUserData(block, meta).attr(prop.buildName, value);

    const label = (
        <>
            {prop.displayName || prop.name}
            {prop.required && <span className="property-field-required">*</span>}
        </>
    );

    if (prop.type === 'Boolean') {
        const boolInitial = block.userData ? block.userData.attrAsBoolean(prop.buildName) : false;
        return (
            <Field label={label} description={prop.description} isEmpty={false}>
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
            <Field label={label} description={prop.description} isEmpty={isEmpty}>
                <select
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        ensureUserData(block, meta).attr(prop.buildName, e.target.value);
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
                label={label}
                description={prop.description}
                isEmpty={isEmpty}
                value={value}
                caption={prop.customEditorCaption}
                helpText={nodeDescription}
                onSave={(next) => {
                    setValue(next);
                    ensureUserData(block, meta).attr(prop.buildName, next);
                }}
            />
        );
    }

    if (prop.type === 'Number') {
        return (
            <Field label={label} description={prop.description} isEmpty={isEmpty}>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={commit}
                />
            </Field>
        );
    }

    return (
        <Field label={label} description={prop.description} isEmpty={isEmpty}>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} />
        </Field>
    );
}

function ScriptEditorField({ label, description, isEmpty, value, caption, helpText, onSave }) {
    const [isOpen, setIsOpen] = useState(false);
    const lineCount = value ? value.split('\n').length : 0;

    return (
        <>
            <Field label={label} description={description} isEmpty={isEmpty}>
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

function Field({ label, description, isEmpty, children }) {
    return (
        <label className={`property-field ${isEmpty ? 'is-empty' : ''}`} title={description || undefined}>
            <span className="property-field-label">{label}</span>
            {children}
        </label>
    );
}