import { useEffect, useRef, useState } from 'react';
import DiagramCanvas from './components/DiagramCanvas.jsx';
import RibbonMenu from './components/RibbonMenu.jsx';
import sampleMeta from './meta/sample-meta.json';

export default function App() {
  const diagramRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeInsertNode, setActiveInsertNode] = useState(null);

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

      <div className="canvas-area">
        <DiagramCanvas
          ref={diagramRef}
          meta={sampleMeta}
          onSelectionChange={setSelectedCount}
          onInsertModeConsumed={() => setActiveInsertNode(null)}
          options={{
            onZoomed: (scale) => setZoom(scale),
          }}
        />
      </div>

      <div className="app-statusbar">
        <span>선택된 노드: {selectedCount}개</span>
        <span>확대/축소: {Math.round((1 / zoom) * 100) || 100}%</span>
      </div>
    </div>
  );
}
