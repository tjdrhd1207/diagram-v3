import { useEffect, useRef, useState } from 'react';
import DiagramCanvas from './components/DiagramCanvas.jsx';
import RibbonMenu from './components/RibbonMenu.jsx';
import sampleMeta from './meta/sample-meta.json';
import PropertyPanel from './components/PropertyPanel.jsx';

export default function App() {
  const diagramRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeInsertNode, setActiveInsertNode] = useState(null);
  
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
        meta={sampleMeta}
        selectedCount={selectedCount}
        activeInsertNode={activeInsertNode}
        onInsertClick={setActiveInsertNode}
      />

      <div className="workspace">
        <div className="canvas-area">
          <DiagramCanvas
            ref={diagramRef}
            meta={sampleMeta}
            onSelectionChange={setSelectedCount}
            onSelectedBlockChange={setSelectedBlock}
            onInsertModeConsumed={() => setActiveInsertNode(null)}
            options={{
              onZoomed: (scale) => setZoom(scale),
            }}
          />
        </div>

        <PropertyPanel block={selectedBlock} meta={sampleMeta} />
      </div>

      <div className="app-statusbar">
        <span>선택된 노드: {selectedCount}개</span>
        <span>확대/축소: {Math.round((1 / zoom) * 100) || 100}%</span>
      </div>
    </div>
  );
}
