import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import '../lib/monacoSetup.js';
// This monaco-editor version exposes the JS language service config as a
// flat named export (not the classic monaco.languages.typescript.* nested
// namespace some older docs/examples reference).
import { javascriptDefaults } from 'monaco-editor/language/typescript/monaco.contribution';
import { useStylesheet } from '../lib/useStylesheet.js';
import { SCRIPT_UTIL_DTS } from '../lib/scriptUtilTypes.generated.js';
import WvParamPreview from './WvParamPreview.jsx';
import QueryBuilderPanel from './QueryBuilderPanel.jsx';
import MciCaseBuilderPanel from './MciCaseBuilderPanel.jsx';

const UTIL_LIB_URI = 'ts:filename/scenario-designer-util.d.ts';

const MIN_BOX_WIDTH = 520;
const MIN_BOX_HEIGHT = 360;
const SIZE_STORAGE_KEY = 'scriptEditorModal.size';

// 모달 전역 설정이다 — 어떤 ScriptNode를 열든 마지막으로 조절한 크기 하나를
// 공유한다(블록별로 따로 기억하지 않음). localStorage 접근은 프라이빗 브라우징
// 등에서 던질 수 있어 항상 try/catch로 감싼다.
function clampBoxSize(width, height) {
  const maxWidth = window.innerWidth * 0.96;
  const maxHeight = window.innerHeight * 0.92;
  return {
    width: Math.min(maxWidth, Math.max(MIN_BOX_WIDTH, width)),
    height: Math.min(maxHeight, Math.max(MIN_BOX_HEIGHT, height)),
  };
}

function loadSavedBoxSize() {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null;
    // 저장 당시보다 지금 화면이 작을 수 있으므로(다른 모니터 등) 현재 뷰포트
    // 기준으로 다시 클램프한다 — 그대로 믿고 쓰면 화면 밖으로 나갈 수 있음.
    return clampBoxSize(parsed.width, parsed.height);
  } catch {
    return null;
  }
}

function saveBoxSize(size) {
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // 저장 실패해도(용량 초과, 프라이빗 모드 등) 기능 자체엔 지장 없음 — 무시.
  }
}

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
  // "보이는 ARS" 화면(app.WV_Param)을 만드는 스크립트일 때, 지금 실행하면 대략
  // 어떤 화면이 나오는지 보여주는 탭 — 도움말과 같은 슬롯을 나눠 쓴다(둘 다
  // 열려있으면 900px 모달이 너무 좁아짐).
  const [showPreview, setShowPreview] = useState(false);
  // 네 사이드 패널(미리보기/도움말/쿼리 빌더/MCI 케이스)은 서로 배타적 — 900px
  // 모달에 두 개 이상이 동시에 뜨면 너무 좁아진다.
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showMciBuilder, setShowMciBuilder] = useState(false);
  // null = 저장된 크기가 없음, CSS의 min(900px, 90vw) 기본값 그대로 사용.
  // localStorage에 저장해둔 값이 있으면 그걸로 시작해서, 이전에 조절한 크기가
  // 다음에 열 때도 유지되도록 한다(모달 전역 설정 — 블록별 아님).
  const [boxSize, setBoxSize] = useState(() => loadSavedBoxSize());
  const editorRef = useRef(null);
  const boxRef = useRef(null);

  // 모서리 4개 전부에서 조절 가능하게 — 모달이 backdrop 위에 항상
  // 가운데정렬(justify-content/align-items: center)돼 있어서, 어느 모서리를
  // 잡든 "중심에서 멀어지는 방향으로 끌면 커진다"로 통일하면 자연스럽다.
  // signX/signY로 그 모서리가 중심 기준 어느 쪽인지만 넘겨주면 나머지 계산은
  // 동일 — bottom-right(1,1), bottom-left(-1,1), top-right(1,-1), top-left(-1,-1).
  const handleResizeStart = (signX, signY) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startRect = boxRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = startRect.width;
    const startHeight = startRect.height;
    // mouseup 시점에 저장해야 하는데 React state는 그 클로저 안에서 최신값을
    // 안 보장하므로, 드래그 도중 계산되는 값을 직접 들고 있다가 그대로 쓴다.
    let latestSize = { width: startWidth, height: startHeight };

    const handleMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) * signX;
      const dy = (moveEvent.clientY - startY) * signY;
      latestSize = clampBoxSize(startWidth + dx, startHeight + dy);
      setBoxSize(latestSize);
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      saveBoxSize(latestSize);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      // Escape closes the side pane first if one is open, so it doesn't also
      // discard the modal (and whatever's been typed) in the same keypress.
      if (showHelp) {
        setShowHelp(false);
      } else if (showPreview) {
        setShowPreview(false);
      } else if (showQueryBuilder) {
        setShowQueryBuilder(false);
      } else if (showMciBuilder) {
        setShowMciBuilder(false);
      } else {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showHelp, showPreview, showQueryBuilder, showMciBuilder, onCancel]);

  return (
    <div className="script-editor-backdrop" onMouseDown={onCancel}>
      <div
        className="script-editor-box"
        ref={boxRef}
        onMouseDown={(e) => e.stopPropagation()}
        style={boxSize ? { width: `${boxSize.width}px`, height: `${boxSize.height}px` } : undefined}
      >
        <div className="script-editor-header">
          <span>{title || '스크립트 편집'}</span>
          <div className="script-editor-header-actions">
            <button
              type="button"
              className={`script-editor-help-toggle ${showMciBuilder ? 'is-active' : ''}`}
              onClick={() => {
                setShowMciBuilder((v) => !v);
                setShowHelp(false);
                setShowPreview(false);
                setShowQueryBuilder(false);
              }}
            >
              MCI 케이스
            </button>
            <button
              type="button"
              className={`script-editor-help-toggle ${showQueryBuilder ? 'is-active' : ''}`}
              onClick={() => {
                setShowQueryBuilder((v) => !v);
                setShowHelp(false);
                setShowPreview(false);
                setShowMciBuilder(false);
              }}
            >
              쿼리 빌더
            </button>
            <button
              type="button"
              className={`script-editor-help-toggle ${showPreview ? 'is-active' : ''}`}
              onClick={() => {
                setShowPreview((v) => !v);
                setShowHelp(false);
                setShowQueryBuilder(false);
                setShowMciBuilder(false);
              }}
            >
              보이는ARS 미리보기
            </button>
            {helpText && (
              <button
                type="button"
                className={`script-editor-help-toggle ${showHelp ? 'is-active' : ''}`}
                onClick={() => {
                  setShowHelp((v) => !v);
                  setShowPreview(false);
                  setShowQueryBuilder(false);
                  setShowMciBuilder(false);
                }}
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

          {showPreview && <WvParamPreview script={draft} />}

          {showQueryBuilder && (
            <QueryBuilderPanel
              script={draft}
              onApply={(next) => {
                setDraft(next);
                setShowQueryBuilder(false);
              }}
              onInsert={(text) => {
                const editor = editorRef.current;
                if (editor) {
                  // 커서(또는 선택 영역) 위치에만 삽입 — 전체 스크립트의 나머지
                  // 부분(빌더가 모르는 앞뒤 코드)은 그대로 둔다. executeEdits가
                  // 모델을 바꾸면 <Editor>의 onChange가 알아서 draft를 갱신한다.
                  editor.pushUndoStop();
                  editor.executeEdits('query-builder-insert', [
                    { range: editor.getSelection(), text, forceMoveMarkers: true },
                  ]);
                  editor.pushUndoStop();
                  editor.focus();
                } else {
                  setDraft((d) => (d ? `${d}\n${text}` : text));
                }
                setShowQueryBuilder(false);
              }}
            />
          )}

          {showMciBuilder && (
            <MciCaseBuilderPanel
              script={draft}
              onApply={(next) => {
                setDraft(next);
                setShowMciBuilder(false);
              }}
              onInsert={(text) => {
                const editor = editorRef.current;
                if (editor) {
                  editor.pushUndoStop();
                  editor.executeEdits('mci-case-builder-insert', [
                    { range: editor.getSelection(), text, forceMoveMarkers: true },
                  ]);
                  editor.pushUndoStop();
                  editor.focus();
                } else {
                  setDraft((d) => (d ? `${d}\n${text}` : text));
                }
                setShowMciBuilder(false);
              }}
            />
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

        <ResizeHandle corner="tl" onMouseDown={handleResizeStart(-1, -1)} />
        <ResizeHandle corner="tr" onMouseDown={handleResizeStart(1, -1)} />
        <ResizeHandle corner="bl" onMouseDown={handleResizeStart(-1, 1)} />
        <ResizeHandle corner="br" onMouseDown={handleResizeStart(1, 1)} />
      </div>
    </div>
  );
}

// 4개 모서리 공용 그립 — 같은 3점 글리프를 CSS에서 모서리별로 뒤집어서
// 재사용한다(script-editor-modal.css의 .script-editor-resize-handle-{tl,tr,bl,br}).
function ResizeHandle({ corner, onMouseDown }) {
  return (
    <div
      className={`script-editor-resize-handle script-editor-resize-handle-${corner}`}
      onMouseDown={onMouseDown}
      title="드래그해서 크기 조절"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="8" cy="2" r="1" />
        <circle cx="8" cy="8" r="1" />
        <circle cx="2" cy="8" r="1" />
      </svg>
    </div>
  );
}
