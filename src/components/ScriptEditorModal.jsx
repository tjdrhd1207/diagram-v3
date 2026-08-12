import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import '../lib/monacoSetup.js';
// This monaco-editor version exposes the JS language service config as a
// flat named export (not the classic monaco.languages.typescript.* nested
// namespace some older docs/examples reference).
import { javascriptDefaults } from 'monaco-editor/language/typescript/monaco.contribution';
import { useStylesheet } from '../lib/useStylesheet.js';
import { SCRIPT_UTIL_DTS } from '../lib/scriptUtilTypes.generated.js';

const UTIL_LIB_URI = 'ts:filename/scenario-designer-util.d.ts';

let utilTypesRegistered = false;

/**
 * beforeMount runs once per <Editor> mount, and @monaco-editor/react can
 * remount the editor (e.g. language change) — addExtraLib would then throw
 * "a library with the same URI has already been added" on the second call.
 * Guard with a module-level flag so it only happens once per page load, no
 * matter how many ScriptEditorModal instances open/close.
 */
function ensureUtilTypesRegistered() {
  if (utilTypesRegistered) return;
  javascriptDefaults.addExtraLib(SCRIPT_UTIL_DTS, UTIL_LIB_URI);
  // These scripts freely reference designer-defined globals ($p, $t, clrError,
  // setError, util.* ...) that aren't declared anywhere Monaco can see, so
  // semantic "undefined name" diagnostics would just be noise here. Keep
  // syntax validation (real typos/braces) on.
  javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  utilTypesRegistered = true;
}

// meta.json's node-level description carries this as one long attribute
// value with no real line breaks (just \t/\n runs from the source XML's
// indentation), which is why it renders as a single unreadable wall of text
// wherever it's dropped into normal-whitespace HTML. Re-wrapping it as
// pre-wrap text needs each line trimmed first, or the original indentation
// noise shows up as ragged leading whitespace instead.
function formatHelpText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Modal wrapper around Monaco, opened from PropertyPanel when a property
 * declares `customEditorTypeName: "ScriptEditor"` in meta (currently just
 * ScriptNode's `Script` property). Registers the scenario-designer `util.*`
 * function set as an extra lib so autocomplete/hover works for it — this is
 * intellisense only, nothing here actually executes the script.
 */
export default function ScriptEditorModal({ title, value, helpText, onSave, onCancel }) {
  useStylesheet('/css/script-editor-modal.css');

  const [draft, setDraft] = useState(value ?? '');
  const [showHelp, setShowHelp] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      // Escape closes the help panel first if it's open, so it doesn't also
      // discard the modal (and whatever's been typed) in the same keypress.
      if (showHelp) {
        setShowHelp(false);
      } else {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showHelp, onCancel]);

  return (
    <div className="script-editor-backdrop" onMouseDown={onCancel}>
      <div className="script-editor-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="script-editor-header">
          <span>{title || '스크립트 편집'}</span>
          <div className="script-editor-header-actions">
            {helpText && (
              <button
                type="button"
                className={`script-editor-help-toggle ${showHelp ? 'is-active' : ''}`}
                onClick={() => setShowHelp((v) => !v)}
              >
                도움말
              </button>
            )}
            <button className="script-editor-close" onClick={onCancel} aria-label="닫기">
              ×
            </button>
          </div>
        </div>

        <div className="script-editor-body">
          <div className="script-editor-editor-pane">
            <Editor
              language="javascript"
              value={draft}
              theme="vs"
              beforeMount={ensureUtilTypesRegistered}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.focus();
              }}
              onChange={(next) => setDraft(next ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                // Chrome's newer EditContext-API input path (Monaco's default
                // here) doesn't reliably re-focus on click inside this modal —
                // clicking to place the cursor left focus stuck on whatever
                // triggered the modal (the "스크립트 편집..." button behind it).
                // Falling back to the classic hidden-textarea input model
                // fixes click-to-focus.
                editContext: false,
              }}
            />
          </div>

          {showHelp && (
            <div className="script-editor-help-pane">
              <div className="script-editor-help-pane-body">{formatHelpText(helpText)}</div>
            </div>
          )}
        </div>

        <div className="script-editor-footer">
          <button className="script-editor-cancel" onClick={onCancel}>
            취소
          </button>
          <button className="script-editor-save" onClick={() => onSave(draft)}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
