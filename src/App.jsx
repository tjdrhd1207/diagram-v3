import { useEffect, useMemo, useRef, useState } from 'react';
import DiagramCanvas from './components/DiagramCanvas.jsx';
import RibbonMenu from './components/RibbonMenu.jsx';
import sampleMeta from './meta/sample-meta.json';
import PropertyPanel from './components/PropertyPanel.jsx';
import { withGroupFaceMeta } from './lib/blockGrouping.js';

export default function App() {
  const diagramRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeInsertNode, setActiveInsertNode] = useState(null);

  // sample-meta.json 자체는 건드리지 않고, 그룹 얼굴 블록이 저장/삭제 시 필요로 하는
  // 합성 메타 엔트리(__GROUP_FACE__)를 얹은 버전을 한 번만 만들어서 하위 컴포넌트
  // 전체에 원래 sampleMeta 대신 이걸 내려준다.
  const effectiveMeta = useMemo(() => withGroupFaceMeta(sampleMeta), []);

  // 정확히 블록 1개가 선택됐을 때만 값이 채워지는 상태 - 프로퍼티 패널이
  // 이 상태를 보고 어떤 블록을 보여줄지 결정한다.
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(( ) => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setActiveInsertNode(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="app-shell">
      <RibbonMenu
        diagramRef={diagramRef}
        meta={effectiveMeta}
        selectedCount={selectedCount}
        selectedBlock={selectedBlock}
        activeInsertNode={activeInsertNode}
        onInsertClick={setActiveInsertNode}
      />

      <div className="workspace">
        <div className="canvas-area">
          <DiagramCanvas
            ref={diagramRef}
            meta={effectiveMeta}
            onSelectionChange={setSelectedCount}
            onSelectedBlockChange={setSelectedBlock}
            onInsertModeConsumed={() => setActiveInsertNode(null)}
            options={{
              onZoomed: (scale) => setZoom(scale),
            }}
          />
        </div>

        <PropertyPanel block={selectedBlock} meta={effectiveMeta} />
      </div>

      <div className="app-statusbar">
        <span>선택된 노드: {selectedCount}개</span>
        <span>확대/축소: {Math.round((1 / zoom) * 100) || 100}%</span>
      </div>
    </div>
  );
}
