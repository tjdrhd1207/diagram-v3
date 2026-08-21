import { useEffect, useMemo, useRef, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { groupColorStyle } from '../lib/groupColors.js';
import { isGroupFace } from '../lib/blockGrouping.js';


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
export default function RibbonMenu({
  diagramRef,
  meta,
  selectedCount = 0,
  selectedBlock,
  activeInsertNode,
  onInsertClick,
  onNewProject,
  onOpenProject,
  onOpenProjectFolder,
  onSaveProject,
}) {
  useStylesheet('/css/ribbon-menu.css');

  const [activeTab, setActiveTab] = useState('홈');
  const [clickedButton, setClickedButton] = useState(null);
  const canAlign = selectedCount >= 2;
  const canGroup = selectedCount >= 2;
  const isFaceSelected = selectedCount === 1 && isGroupFace(selectedBlock);

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
            <RibbonGroup label={canGroup ? '그룹' : '그룹 (2개 이상 선택 필요)'}>
              <RibbonButton icon="⛶" label="그룹으로 묶기" disabled={!canGroup} onClick={() => call('groupSelection')} />
              <RibbonButton icon="⛝" label="그룹 해제" disabled={!isFaceSelected} onClick={() => call('ungroupSelection')} />
            </RibbonGroup>
          </>
        )}

        {activeTab === '삽입' && (
          <InsertCategoryRow
            meta={meta}
            activeInsertNode={activeInsertNode}
            onPickNode={(nodeName) => handleInsertClick(nodeName)}
          />
        )}

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
          <>
            <RibbonGroup label="프로젝트">
              <RibbonButton icon="🗋" label="새 프로젝트" onClick={onNewProject} />
              <RibbonButton icon="📄" label="열기" onClick={onOpenProject} />
              <RibbonButton icon="📂" label="프로젝트 열기" onClick={onOpenProjectFolder} />
              <RibbonButton icon="💾" label="저장" onClick={onSaveProject} />
            </RibbonGroup>
            <RibbonGroup label="내보내기">
              <RibbonButton icon="⭳" label="이미지 다운로드" onClick={() => call('downloadImage')} />
              <RibbonButton icon="🖶" label="인쇄" onClick={() => call('printImage')} />
            </RibbonGroup>
          </>
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
    // withGroupFaceMeta()가 얹어주는 그룹 얼굴 같은 합성 엔트리는 사용자가 직접
    // "삽입"할 수 있는 노드 타입이 아니므로 목록에서 제외한다.
    if (def.internal) continue;
    const groupName = def.group || '기타';
    (byGroup[groupName] ??= []).push([nodeName, def]);
  }
  return byGroup;
}

// "삽입" 탭 전용 — 66종 노드를 리본에 전부 펼치면 화면 절반 가까이 차지해서(사용자
// 피드백), 카테고리 버튼 한 줄 + 클릭 시 그 카테고리만 담은 플라이아웃 드롭다운으로
// 바꿨다. 다른 탭들과 리본 높이가 같아지고, 카테고리 안에 검색창도 있어서 "음성"처럼
// 항목이 많은 카테고리도 스크롤 없이 타이핑으로 바로 찾을 수 있다.
function InsertCategoryRow({ meta, activeInsertNode, onPickNode }) {
  const [openCategory, setOpenCategory] = useState(null);
  const containerRef = useRef(null);

  const byCategory = useMemo(() => groupNodesByCategory(meta?.nodes), [meta]);

  useEffect(() => {
    if (!openCategory) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openCategory]);

  return (
    <div className="ribbon-insert-row" ref={containerRef}>
      {Object.entries(byCategory).map(([groupName, entries]) => {
        const isOpen = openCategory === groupName;
        const hasActive = entries.some(([nodeName]) => nodeName === activeInsertNode);
        return (
          <div className="ribbon-insert-category" key={groupName} style={groupColorStyle(groupName)}>
            <button
              type="button"
              className={`ribbon-insert-category-button ${isOpen ? 'is-open' : ''} ${hasActive ? 'has-active' : ''}`}
              onClick={() => setOpenCategory(isOpen ? null : groupName)}
            >
              {groupName}
              <span className="ribbon-insert-category-count">{entries.length}</span>
            </button>
            {isOpen && (
              <InsertCategoryFlyout
                entries={entries}
                activeInsertNode={activeInsertNode}
                onPickNode={(nodeName) => {
                  onPickNode(nodeName);
                  setOpenCategory(null);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 캔버스 2D 컨텍스트 텍스트 측정을 재사용 — 카테고리 전환/검색마다 새로 만들
// 필요 없다(단 하나의 <canvas>만 필요, DOM에 붙이지도 않음).
let measureCanvasCtx = null;
function getMeasureCtx() {
  if (!measureCanvasCtx) {
    measureCanvasCtx = document.createElement('canvas').getContext('2d');
  }
  return measureCanvasCtx;
}

// .ribbon-button-label과 동일한 폰트로 라벨들 중 가장 긴 것의 실제 렌더링 폭을 재서,
// 그 카테고리의 모든 칸을 그 폭에 맞춘다. "..." 말줄임을 쓰면 "CTI 호전환", "CTI
// 호전환 완료", "CTI 호전환 재접속"처럼 접두어가 같은 라벨들이 전부 "CTI 호전환..."
// 로 보여서 구분이 안 되는 문제가 있었다 — 잘라내는 대신 제일 긴 라벨 기준으로 칸
// 자체를 넓혀서 전부 한 줄로 온전히 보이게 한다.
const LABEL_FONT = "600 11px Pretendard, 'Malgun Gothic', -apple-system, sans-serif";
const BUTTON_HORIZONTAL_PADDING = 16; // .ribbon-button의 padding: 6px 8px 좌우 합
const MIN_COLUMN_WIDTH = 56; // 라벨이 아주 짧아도 아이콘이 눌리지 않을 최소 폭

function measureWidestLabelWidth(entries) {
  const ctx = getMeasureCtx();
  ctx.font = LABEL_FONT;
  let widest = 0;
  for (const [nodeName, def] of entries) {
    const label = def.displayName ?? nodeName;
    widest = Math.max(widest, ctx.measureText(label).width);
  }
  return Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest) + BUTTON_HORIZONTAL_PADDING);
}

function InsertCategoryFlyout({ entries, activeInsertNode, onPickNode }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      ([nodeName, def]) =>
        (def.displayName ?? nodeName).toLowerCase().includes(q) || nodeName.toLowerCase().includes(q)
    );
  }, [entries, query]);

  // 검색으로 걸러지더라도 칸 폭은 카테고리 전체 기준으로 고정해둔다 — 검색어를
  // 입력할 때마다 칸 크기가 들썩이면 오히려 더 산만해 보인다.
  const columnWidth = useMemo(() => measureWidestLabelWidth(entries), [entries]);
  // 플라이아웃 폭을 고정값(320px)으로 두면, 라벨이 긴 카테고리는 칸이 넓어진 만큼
  // 한 줄에 2개밖에 못 들어가 세로로 길게 늘어졌다 — 칸 폭에 맞춰 최대 4열까지는
  // 나오도록 컨테이너 폭도 같이 계산한다(항목이 4개 미만이면 그 개수만큼만).
  const flyoutWidth = useMemo(() => {
    const columns = Math.max(1, Math.min(4, entries.length));
    const gaps = (columns - 1) * 6;
    const horizontalPadding = 20; // .ribbon-insert-flyout의 padding: 10px 좌우 합
    return Math.min(480, columns * columnWidth + gaps + horizontalPadding);
  }, [entries, columnWidth]);

  return (
    <div
      className="ribbon-insert-flyout"
      style={{ '--ribbon-insert-col-width': `${columnWidth}px`, width: `${flyoutWidth}px` }}
    >
      <input
        className="ribbon-insert-flyout-search"
        type="text"
        placeholder="노드 검색..."
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="ribbon-insert-flyout-hint">클릭 후 캔버스를 클릭하세요</div>
      <div className="ribbon-insert-flyout-list">
        {filtered.length === 0 && <div className="ribbon-insert-flyout-empty">검색 결과가 없습니다.</div>}
        {filtered.map(([nodeName, def]) => (
          <RibbonButton
            key={nodeName}
            icon={def.icon}
            label={def.displayName ?? nodeName}
            active={activeInsertNode === nodeName}
            onClick={() => onPickNode(nodeName)}
          />
        ))}
      </div>
    </div>
  );
}

function RibbonGroup({ label, children, style }) {
  return (
    <div className="ribbon-group" style={style}>
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
