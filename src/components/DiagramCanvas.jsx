import { forwardRef, useEffect, useImperativeHandle, useId, useRef, useState } from 'react';
import { Diagram } from '../lib/diagram-library.js';
import LinkEventPicker from './LinkEventPicker.jsx';
import { buildGroupColorPallete, paletteKeyForGroup } from '../lib/groupColors.js';

// createNode()가 막 만든 블록은 diagram.components에 diagram.nextSeq-1 아이디로
// 곧바로 등록돼 있다 (Component 생성자가 동기적으로 등록함) — onNodeCreated는
// diagram.ready가 false인 새 캔버스에서는 절대 안 뜨기 때문에 (아래 setCreateMode
// 주석 참고) 이 방식으로 "방금 만든 블록"을 직접 찾아서 그룹 색을 입힌다.
// [MEMO]는 meta.nodes에 없는 특수 노드라 group이 없고, Memo는 setColor가
// 없으므로 자연히 건너뛴다.
function applyGroupColorToNewestBlock(diagram, meta, nodeName) {
  if (!diagram) return;
  const group = meta?.nodes?.[nodeName]?.group;
  const newestId = String(diagram.nextSeq - 1).padStart(8, '0');
  const block = diagram.components.get(newestId);
  if (!block || typeof block.setColor !== 'function') return;
  block.setColor(paletteKeyForGroup(group, 'bg'), paletteKeyForGroup(group, 'icon'));
}

/**
 * DiagramCanvas
 *
 * Thin React shell around the vanilla `Diagram` class. React only ever
 * renders the empty <svg> tag below — everything inside it (blocks,
 * links, memos) is created and mutated directly by diagram-library.js.
 * Treat this component as an "uncontrolled" wrapper, the same pattern
 * you'd use for D3 or CodeMirror: React mounts the container once and
 * then gets out of the way.
 *
 * Known library-side caveats this wrapper works around (see README.md
 * for the full write-up):
 *  1. Diagram's constructor takes a CSS selector string, not a node
 *     reference, so we generate a unique id with useId().
 *  2. Diagram registers each `options.onXxx` callback exactly once —
 *     if we handed it an inline arrow function from props directly,
 *     it would keep calling a stale closure forever. We register one
 *     stable wrapper and read the latest callback from a ref instead.
 *  3. There is no diagram.destroy(). Removing the <svg> from the DOM
 *     lets the browser GC the element and its listeners, but the
 *     library's internal `diagrams` module map still holds a
 *     reference to the instance. That's a real (small) leak on
 *     repeated mount/unmount — flagged here, not silently patched,
 *     since fixing it means editing diagram-library.js itself.
 */
const DiagramCanvas = forwardRef(function DiagramCanvas(
  { meta, options = {}, onSelectionChange, onSelectedBlockChange, onInsertModeConsumed, className },
  forwardedRef
) {
  const rawId = useId().replace(/:/g, '');
  const svgId = `diagram-canvas-${rawId}`;
  const diagramInstanceRef = useRef(null);
  const [linkPicker, setLinkPicker] = useState(null)
  const selectedItemsRef = useRef(new Set());

  // Keep the latest versions of caller-supplied callbacks without
  // re-registering them with the library on every render.
  const latestOptionsRef = useRef(options);
  const latestOnSelectionChangeRef = useRef(onSelectionChange);
  const latestOnSelectedBlockChangeRef = useRef(onSelectedBlockChange);
  const latestOnInsertModeConsumedRef = useRef(onInsertModeConsumed);
  useEffect(() => {
    latestOptionsRef.current = options;
    latestOnSelectionChangeRef.current = onSelectionChange;
    latestOnSelectedBlockChangeRef.current = onSelectedBlockChange;
    latestOnInsertModeConsumedRef.current = onInsertModeConsumed;
  });

  useEffect(() => {
    if (!meta) return;

    // 선택된 아이템 집합을 직접 들고 있다가, "정확히 블록 1개만 선택된"
    // 상태일 때만 그 블록을 프로퍼티 패널 쪽으로 올려보낸다. Memo/Link도
    // 같은 onNodeSelected를 타고 들어올 수 있어서 metaName 존재 여부로
    // "이건 Block이다"를 구분한다 (Block만 metaName/userData를 가짐).
    const notifySelectionChanged = () => {
      const items = selectedItemsRef.current;
      latestOnSelectionChangeRef.current?.(items.size);
      const sole = items.size === 1 ? [...items][0] : null;
      const soleBlock = sole && typeof sole.metaName === 'string' ? sole : null;
      latestOnSelectedBlockChangeRef.current?.(soleBlock);
    };

    const diagram = new Diagram(`#${svgId}`, meta, {
      ...latestOptionsRef.current,
      // Diagram.defaultOptions.colorPallete is deep-merged (mergeDeep), so
      // this only *adds* our group-* keys alongside the built-in named
      // colors rather than replacing the palette.
      colorPallete: buildGroupColorPallete(),
      onNodeSelected: (item) => {
        selectedItemsRef.current.add(item);
        notifySelectionChanged();
        latestOptionsRef.current.onNodeSelected?.(item);
      },
      onNodeUnSelected: (item) => {
        selectedItemsRef.current.delete(item);
        notifySelectionChanged();
        latestOptionsRef.current.onNodeUnSelected?.(item);
      },
      onNodeClicked: (...args) => latestOptionsRef.current.onNodeClicked?.(...args),
      onNodeCreated: (...args) => latestOptionsRef.current.onNodeCreated?.(...args),
      onNodeChanged: (...args) => latestOptionsRef.current.onNodeChanged?.(...args),
      onZoomed: (...args) => latestOptionsRef.current.onZoomed?.(...args),
      onDiagramModified: (...args) => latestOptionsRef.current.onDiagramModified?.(...args),
      onNodeModifyingCaption: (...args) => latestOptionsRef.current.onNodeModifyingCaption?.(...args),
      onNodeModifyingComment: (...args) => latestOptionsRef.current.onNodeModifyingComment?.(...args),
      onLinkCreating: (originBlock, e, callback) => {
        // 주의: 이 옵션은 다른 onXxx 콜백들과 다르다 — "알림"이 아니라
        // "요청/응답" 콜백이다. Diagram은 diagram.options.onLinkCreating이
        // 존재하기만 해도(내용과 무관하게) 자신의 기본 prompt() 폴백을 스킵하고
        // 이 함수에게 완전히 위임해버린다. 그래서 여기서 항상 callback을
        // 호출해줘야 한다 — 안 그러면 Anchor._mouseup 안의 Promise가 영원히
        // pending 상태로 멈춰서 링크가 조용히 하나도 안 만들어진다.
        const custom = latestOptionsRef.current.onLinkCreating;
        if (custom) {
          custom(originBlock, e, callback);
          return;
        }

        // 기본 동작: meta(designer_meta.json)의 해당 노드 타입 links 정의를
        // 그대로 선택지로 보여준다 — 자유 입력 prompt() 대신, 실제
        // ScenarioDesigner가 그 노드 타입에 대해 허용하는 이벤트 목록을 사용.
        const nodeDef = meta?.nodes?.[originBlock.metaName];
        const linkDefs = nodeDef?.links ?? [];

        if (linkDefs.length === 0) {
          // meta에 links 정의가 없는 노드 타입은 예전처럼 자유 입력으로 폴백.
          callback(window.prompt('이벤트(선택지) 이름을 입력하세요:'));
          return;
        }

        const usedNames = new Set(
          [...originBlock.links.values()]
            .filter((link) => link.blockOrigin === originBlock)
            .map((link) => link.caption)
        );

        setLinkPicker({
          x: e.clientX,
          y: e.clientY,
          nodeLabel: nodeDef.displayName ?? originBlock.metaName,
          options: linkDefs,
          usedNames,
          onPick: (name) => {
            setLinkPicker(null);
            callback(name);
          },
          onCancel: () => {
            setLinkPicker(null);
            callback(null);
          },
        });
      },
    });

    diagramInstanceRef.current = diagram;

    return () => {
      // See caveat #3 above — this clears the visible canvas but does
      // not remove the instance from the library's internal registry.
      diagramInstanceRef.current = null;
    };
    // meta is treated as immutable for the lifetime of this canvas —
    // swapping node types at runtime would need a real re-init story.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, svgId]);

  useImperativeHandle(forwardedRef, () => ({
    // Escape hatch for anything not wrapped below.
    getInstance: () => diagramInstanceRef.current,

    createNode: (nodeName, x, y) => {
      diagramInstanceRef.current?.createNode(nodeName, x, y);
      applyGroupColorToNewestBlock(diagramInstanceRef.current, meta, nodeName);
    },
    setCreateMode: (nodeName) => {
      diagramInstanceRef.current?.setCreateMode(nodeName);
      // onNodeCreated는 diagram.ready가 true일 때만 발생하는데, deserialize()로
      // 파일을 불러온 적 없는 새 캔버스에서는 ready가 영원히 false라 안 뜬다.
      // 대신 라이브러리 내부의 "다음 클릭 한 번에 소비" 동작을 그대로 미러링.
      // 이 리스너는 라이브러리 자신의 click 핸들러(svg 생성 시점에 이미
      // 등록됨)보다 나중에 등록되므로, 같은 클릭 이벤트에 대해 항상 그
      // 다음에 실행된다 — 즉 이 시점엔 createNode()가 이미 끝나 있다.
      if (nodeName) {
        diagramInstanceRef.current?.svg?.addEventListener(
          'click',
          () => {
            latestOnInsertModeConsumedRef.current?.();
            applyGroupColorToNewestBlock(diagramInstanceRef.current, meta, nodeName);
          },
          { once: true }
        );
      }
    },

    undo: () => diagramInstanceRef.current?.undo(),
    redo: () => diagramInstanceRef.current?.redo(),
    copy: () => diagramInstanceRef.current?.copy(),
    cut: () => diagramInstanceRef.current?.cut(),
    paste: () => diagramInstanceRef.current?.paste(),
    remove: () => {
      // diagram.delete()는 선택된 아이템들을 지우면서 onNodeUnSelected를
      // 개별적으로 쏘지 않는다. 그대로 두면 우리 selectedItemsRef가
      // 삭제된(이제 쓸모없는) 블록 참조를 계속 들고 있게 되어 프로퍼티
      // 패널이 죽은 블록을 계속 보여줄 수 있음 — 직접 비워준다.
      diagramInstanceRef.current?.delete();
      selectedItemsRef.current.clear();
      latestOnSelectionChangeRef.current?.(0);
      latestOnSelectedBlockChangeRef.current?.(null);
    },
    selectAll: () => diagramInstanceRef.current?.selectAll(),
    unselectAll: () => diagramInstanceRef.current?.unselectAll(),

    align: (type) => diagramInstanceRef.current?.align(type),

    zoomIn: () => diagramInstanceRef.current?.zoomIn(),
    zoomOut: () => diagramInstanceRef.current?.zoomOut(),
    zoomReset: () => diagramInstanceRef.current?.zoomReset(),

    downloadImage: () => diagramInstanceRef.current?.downloadImage(),
    printImage: () => diagramInstanceRef.current?.printImage(),

    lock: (level) => diagramInstanceRef.current?.lock(level),
    isLocked: () => diagramInstanceRef.current?.isLocked() ?? false,
  }));

  return (
    <>
      <svg
        id={svgId}
        className={className ?? 'diagram-canvas'}
        role="img"
        aria-label="IVR 시나리오 다이어그램 캔버스"
      />
      {linkPicker && (
        <LinkEventPicker
          x={linkPicker.x}
          y={linkPicker.y}
          nodeLabel={linkPicker.nodeLabel}
          options={linkPicker.options}
          usedNames={linkPicker.usedNames}
          onPick={linkPicker.onPick}
          onCancel={linkPicker.onCancel}
        />
      )}
    </>
  );
});

export default DiagramCanvas;
