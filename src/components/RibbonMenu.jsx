import { useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';


const TABS = ['홈', '삽입', '정렬', '보기', '파일'];

const ALIGN_BUTTONS = [
  { type: 'start', label: '왼쪽 맞춤', icon: '⊢' },
  { type: 'center', label: '가운데 맞춤(가로)', icon: '⊦' },
  { type: 'end', label: '오른쪽 맞춤', icon: '⊣' },
  { type: 'top', label: '위쪽 맞춤', icon: '⊤' },
  { type: 'middle', label: '가운데 맞춤(세로)', icon: '⊥' },
  { type: 'bottom', label: '아래쪽 맞춤', icon: '⊨' },
  { type: 'halign', label: '가로 균등 분포', icon: '⇔' },
  { type: 'valign', label: '세로 균등 분포', icon: '⇕' },
];

/**
 * RibbonMenu is intentionally "dumb" — every button just calls a method
 * on the DiagramCanvas ref. All the actual behavior lives in
 * diagram-library.js; this component only decides what's visible/enabled.
 */
export default function RibbonMenu({ diagramRef, meta, selectedCount = 0, activeInsertNode, onInsertClick }) {
  useStylesheet('/css/ribbon-menu.css');

  const [activeTab, setActiveTab] = useState('홈');
  const [clickedButton, setClickedButton] = useState(null);
  const canAlign = selectedCount >= 2;

  const call = (method, ...args) => diagramRef.current?.[method]?.(...args);

  const handleInsertClick = (nodeName) => {
    if (activeInsertNode === nodeName) {
      call('setCreateMode', null);
      onInsertClick(null);
    } else {
      call('setCreateMode', nodeName);
      onInsertClick(nodeName);
    }
  };

  return (
    <div className="ribbon">
      <div className="ribbon-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`ribbon-tab ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ribbon-body">
        {activeTab === '홈' && (
          <>
            <RibbonGroup label="실행 취소">
              <RibbonButton icon="↶" label="실행 취소" onClick={() => call('undo')} />
              <RibbonButton icon="↷" label="다시 실행" onClick={() => call('redo')} />
            </RibbonGroup>
            <RibbonGroup label="클립보드">
              <RibbonButton icon="✂" label="잘라내기" onClick={() => call('cut')} />
              <RibbonButton icon="⧉" label="복사" onClick={() => call('copy')} />
              <RibbonButton icon="📋" label="붙여넣기" onClick={() => call('paste')} />
            </RibbonGroup>
            <RibbonGroup label="편집">
              <RibbonButton icon="🗑" label="삭제" onClick={() => call('remove')} />
              <RibbonButton icon="▦" label="전체 선택" onClick={() => call('selectAll')} />
            </RibbonGroup>
          </>
        )}

        {activeTab === '삽입' &&
          Object.entries(groupNodesByCategory(meta?.nodes)).map(([groupName, entries]) => (
            <RibbonGroup key={groupName} label={`${groupName} (클릭 후 캔버스를 클릭)`}>
              {entries.map(([nodeName, def]) => (
                <RibbonButton
                  key={nodeName}
                  icon={def.icon}
                  label={def.displayName ?? nodeName}
                  active={activeInsertNode === nodeName}
                  onClick={() => handleInsertClick(nodeName)}
                />
              ))}
            </RibbonGroup>
          ))}

        {activeTab === '정렬' && (
          <RibbonGroup label={canAlign ? '정렬' : '정렬 (2개 이상 선택 필요)'}>
            {ALIGN_BUTTONS.map((btn) => (
              <RibbonButton
                key={btn.type}
                icon={btn.icon}
                label={btn.label}
                disabled={!canAlign}
                onClick={() => call('align', btn.type)}
              />
            ))}
          </RibbonGroup>
        )}

        {activeTab === '보기' && (
          <RibbonGroup label="확대/축소">
            <RibbonButton icon="＋" label="확대" onClick={() => call('zoomIn')} />
            <RibbonButton icon="－" label="축소" onClick={() => call('zoomOut')} />
            <RibbonButton icon="⟲" label="100%" onClick={() => call('zoomReset')} />
          </RibbonGroup>
        )}

        {activeTab === '파일' && (
          <RibbonGroup label="내보내기">
            <RibbonButton icon="⭳" label="이미지 다운로드" onClick={() => call('downloadImage')} />
            <RibbonButton icon="🖶" label="인쇄" onClick={() => call('printImage')} />
          </RibbonGroup>
        )}
      </div>
    </div>
  );
}

// meta.nodes[x].group is real data from designer_meta.json (e.g. "시나리오",
// "음성", "컨트롤", "서비스") — use it to form ribbon sub-groups the same
// way the "정렬"/"클립보드" groups are hand-written above.
function groupNodesByCategory(nodes) {
  const byGroup = {};
  for (const [nodeName, def] of Object.entries(nodes ?? {})) {
    const groupName = def.group || '기타';
    (byGroup[groupName] ??= []).push([nodeName, def]);
  }
  return byGroup;
}

function RibbonGroup({ label, children }) {
  return (
    <div className="ribbon-group">
      <div className="ribbon-group-buttons">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  );
}

// designer_meta.json ships icons as file paths ("icons/prompt.svg"), and
// we don't have those asset files in this scaffold. Rather than render a
// broken <img>, fall back to the node's initial as a placeholder badge.
// Swap this for a real <img src={`/${icon}`} /> once the icon set exists.
function RibbonButton({ icon, label, onClick, disabled, active }) {
  const isAssetPath = typeof icon === 'string' && icon.includes('/');
  return (
    <button
      className={`ribbon-button ${active ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-pressed={active || undefined}  
    >
      <span className="ribbon-button-icon" aria-hidden="true">
        {isAssetPath ? (
          <span className="ribbon-button-icon-placeholder">{label?.[0] ?? '□'}</span>
        ) : (
          icon ?? '□'
        )}
      </span>
      <span className="ribbon-button-label">{label}</span>
    </button>
  );
}
