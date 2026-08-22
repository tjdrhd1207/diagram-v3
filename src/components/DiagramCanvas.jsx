import { forwardRef, useEffect, useImperativeHandle, useId, useRef, useState } from 'react';
import { Diagram } from '../lib/diagram-library.js';
import LinkEventPicker from './LinkEventPicker.jsx';
import { useStylesheet } from '../lib/useStylesheet.js';
import { buildGroupColorPallete, paletteKeyForGroup } from '../lib/groupColors.js';
import {
  createGroup,
  dissolveGroup,
  isGroupFace,
  prepareSelectionForDeletion,
  rehydrateGroupsAfterDeserialize,
  reconcileGroupBounds,
} from '../lib/blockGrouping.js';
import { syncLinkOverlapBadges } from '../lib/linkOverlap.js';

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

// Block.deserialize()는 diagram.meta.nodes[metaName]를 가드 없이 바로 읽고 그
// 자리에서 .buildTag에 접근한다(diagram-library.js 확인) — meta.json에 없는
// meta-name을 쓰는 블록이 하나라도 있으면 그 즉시 TypeError를 던지며 나머지
// 블록은 아예 만들어지지도 않는다. designer.meta.json은 66종류 노드를 정의하고
// 있어 실제 운영 시나리오도 대부분 커버하지만, 혹시 모를 미지의 타입에 대비해
// Diagram.deserialize()를 실제로 호출하기 전에 미리 훑어서 어떤 meta-name이
// 빠져있는지 정확히 알려주기 위한 사전 검사 — 실패 원인을 콘솔 에러 하나로
// 뭉개지 않고, 사용자가 meta.json에 뭘 추가해야 하는지 바로 알 수 있게 한다.
function findMissingMetaNames(xmlText, meta) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const names = new Set(
    [...doc.querySelectorAll('block')]
      .map((el) => el.getAttribute('meta-name'))
      .filter(Boolean)
  );
  return [...names].filter((name) => !meta?.nodes?.[name]);
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
  { meta, options = {}, onSelectionChange, onSelectedBlockChange, onInsertModeConsumed, className, initialXml, onLoadError },
  forwardedRef
) {
  useStylesheet('/css/link-overlap.css');

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

    if (import.meta.env.DEV) {
      // 이 effect가 실제로 "새 캔버스 마운트"로 다시 도는지(=svgId가 매번
      // 바뀌는지), initialXml이 실제로 넘어왔는지를 바로 확인하기 위한 임시
      // 진단 로그. App.jsx의 loadPageIntoCanvas까지는 호출되는 게 확인됐는데
      // 화면에 반영이 안 될 때, 문제가 "리마운트 자체가 안 됨"인지 "리마운트는
      // 되는데 그 안에서 실패"인지를 구분하는 데 쓴다.
      console.log('[DiagramCanvas] (re)mount', {
        svgId,
        hasInitialXml: !!initialXml,
        initialXmlLength: initialXml?.length,
        initialXmlPreview: initialXml?.slice(0, 120),
      });
    }

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

    const diagramOptions = {
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
    };

    // initialXml은 "파일 열기"로 이 캔버스가 새로 만들어진 경우에만 채워져 있다.
    // App.jsx는 파일을 열 때마다 canvasKey를 함께 올려서 DiagramCanvas 전체를
    // 리마운트시키므로(새 useId → 새 svgId), 이 값은 mount 시점에 한 번 읽고 나면
    // 이 인스턴스가 살아있는 동안 절대 바뀌지 않는다 — meta와 같은 취급.
    let diagram;
    if (initialXml) {
      const missingMetaNames = findMissingMetaNames(initialXml, meta);
      if (missingMetaNames.length > 0) {
        onLoadError?.(
          `이 페이지는 meta.json에 없는 노드 타입을 사용합니다: ${missingMetaNames.join(', ')}\n` +
            `해당 타입이 meta.json에 추가되기 전까지는 이 페이지를 열 수 없어 빈 캔버스로 대신 시작합니다.`
        );
        diagram = new Diagram(`#${svgId}`, meta, diagramOptions);
      } else {
        try {
          diagram = Diagram.deserialize(`#${svgId}`, meta, initialXml, diagramOptions);
        } catch (err) {
          // findMissingMetaNames가 못 잡아내는 다른 종류의 파싱/역직렬화 오류
          // (예: 예상 밖의 XML 구조) — 조용히 죽는 대신 원인을 그대로 알려준다.
          console.error('Diagram.deserialize failed:', err);
          onLoadError?.(`페이지를 불러오는 중 오류가 발생했습니다: ${err.message}`);
          diagram = new Diagram(`#${svgId}`, meta, diagramOptions);
        }
      }
    } else {
      diagram = new Diagram(`#${svgId}`, meta, diagramOptions);
    }

    diagramInstanceRef.current = diagram;

    // 파일에서 불러온 경우 그룹 앵커들의 userData로부터 diagram.groups 런타임 캐시와
    // 테두리를 복원한다. 새 빈 캔버스에서는 앵커 블록이 하나도 없으므로 그냥 no-op.
    rehydrateGroupsAfterDeserialize(diagram);

    // 같은 두 블록 사이에 origin/dest anchor가 완전히 같은 링크가 여러 개 있으면
    // 좌표가 100% 겹쳐서 라벨이 뭉개져 보인다(실제 운영 파일에서 흔함) — 개수 배지로
    // 대체하고, 최초 로드 시 한 번 계산해둔다. 이후 갱신은 아래 mouseup 등에서.
    syncLinkOverlapBadges(diagram);

    // 멤버 블록을 라이브러리의 기본 드래그(mousedown on .draggable -> dragStart ->
    // mousemove로 이동)로 옮기는 동안, 그 블록이 그룹에 속해 있으면 경계 사각형 밖으로
    // 못 나가게 보정한다. svg 생성 시점에 이미 등록된 라이브러리 자신의 mousemove
    // 리스너보다 나중에 등록되므로, 같은 이벤트에 대해 항상 그 다음에 실행된다 — 즉
    // 이 시점엔 라이브러리가 이미 (경계를 넘었을 수도 있는) 새 위치를 반영한 뒤다.
    diagram.svg.addEventListener('mousemove', () => {
      if (diagram.dragStart) reconcileGroupBounds(diagram);
    });
    diagram.svg.addEventListener('mouseup', () => {
      reconcileGroupBounds(diagram);
      // 블록 드래그로 anchor 위치가 바뀌었거나, 드래그로 새 링크를 막 연결한
      // 직후(Anchor의 mouseup) 둘 다 여기서 잡힌다 — 겹침 배지를 다시 계산.
      syncLinkOverlapBadges(diagram);
    });

    if (import.meta.env.DEV) {
      // 개발 중 콘솔/테스트 스크립트에서 diagram.serialize()/deserialize() 등을
      // 직접 찔러볼 수 있도록 하는 디버그 전용 노출 — 프로덕션 빌드에는 안 들어감.
      window.__diagram = diagram;
      window.__DiagramClass = Diagram;
      window.__rehydrateGroupsAfterDeserialize = rehydrateGroupsAfterDeserialize;
    }

    return () => {
      // See caveat #3 above — this clears the visible canvas but does
      // not remove the instance from the library's internal registry.
      diagramInstanceRef.current = null;
    };
    // meta/initialXml are treated as immutable for the lifetime of this canvas —
    // swapping node types or loading a different file at runtime would need a
    // real re-init story (which App.jsx gets "for free" by remounting this whole
    // component via a changing `key`, forcing a fresh svgId here).
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

    // undo/redo/paste는 마우스업 없이도 링크를 추가/삭제할 수 있는 경로라(버튼
    // 클릭, 키보드), 겹침 배지도 그때그때 다시 계산해줘야 한다.
    undo: () => {
      diagramInstanceRef.current?.undo();
      if (diagramInstanceRef.current) syncLinkOverlapBadges(diagramInstanceRef.current);
    },
    redo: () => {
      diagramInstanceRef.current?.redo();
      if (diagramInstanceRef.current) syncLinkOverlapBadges(diagramInstanceRef.current);
    },
    copy: () => diagramInstanceRef.current?.copy(),
    cut: () => diagramInstanceRef.current?.cut(),
    paste: () => {
      diagramInstanceRef.current?.paste();
      if (diagramInstanceRef.current) syncLinkOverlapBadges(diagramInstanceRef.current);
    },
    remove: () => {
      const diagram = diagramInstanceRef.current;
      if (!diagram) return;
      // 선택된 것 중 그룹 앵커가 있으면 일반 삭제 대상에서 빼고 대신 정식으로
      // dissolveGroup()을 호출한다 (그래야 테두리/레지스트리까지 같이 정리됨 —
      // 앵커를 지운다는 건 "그룹 해제"지 멤버까지 지우는 게 아니다). 그 외 멤버
      // 블록들은 이제 평범한 블록이라 특별히 손댈 게 없다.
      prepareSelectionForDeletion(diagram);
      // 앵커만 선택돼 있던 경우 위에서 선택이 비워졌을 수 있다 — 그 상태로
      // diagram.delete()를 부르면 빈 COMPONENTS_REMOVED 항목이 쓸데없이
      // undo 스택에 쌓이므로, 지울 게 남아있을 때만 호출한다.
      if (diagram.selectedItems.length > 0) {
        diagram.delete();
      }
      // diagram.delete()는 선택된 아이템들을 지우면서 onNodeUnSelected를
      // 개별적으로 쏘지 않는다. 그대로 두면 우리 selectedItemsRef가
      // 삭제된(이제 쓸모없는) 블록 참조를 계속 들고 있게 되어 프로퍼티
      // 패널이 죽은 블록을 계속 보여줄 수 있음 — 직접 비워준다.
      selectedItemsRef.current.clear();
      latestOnSelectionChangeRef.current?.(0);
      latestOnSelectedBlockChangeRef.current?.(null);
      syncLinkOverlapBadges(diagram);
    },
    selectAll: () => diagramInstanceRef.current?.selectAll(),
    unselectAll: () => diagramInstanceRef.current?.unselectAll(),

    // 여러 블록을 하나의 그룹으로 묶기/풀기. createGroup/dissolveGroup 내부에서
    // block.select()/unselect()를 호출하면 그게 diagram의 onNodeSelected/
    // onNodeUnSelected를 그대로 태우기 때문에, 위쪽 useEffect의
    // notifySelectionChanged()가 자동으로 실행돼 React 쪽 selectedCount/selectedBlock도
    // 별도 코드 없이 따라간다.
    groupSelection: () => {
      const diagram = diagramInstanceRef.current;
      if (!diagram) return;
      const members = [...selectedItemsRef.current].filter((item) => item.type === 'B');
      createGroup(diagram, members);
    },
    ungroupSelection: () => {
      const diagram = diagramInstanceRef.current;
      if (!diagram) return;
      const face = [...selectedItemsRef.current].find((item) => isGroupFace(item));
      if (face) dissolveGroup(diagram, face);
    },

    align: (type) => diagramInstanceRef.current?.align(type),

    zoomIn: () => diagramInstanceRef.current?.zoomIn(),
    zoomOut: () => diagramInstanceRef.current?.zoomOut(),
    zoomReset: () => diagramInstanceRef.current?.zoomReset(),

    downloadImage: () => diagramInstanceRef.current?.downloadImage(),
    printImage: () => diagramInstanceRef.current?.printImage(),

    // "프로젝트 저장" — 지금 이 캔버스 상태를 Diagram.serialize()가 만드는 그대로의
    // XML 문자열로 돌려준다. 그룹 앵커/멤버십도 각 블록의 userData에 이미 실려
    // 있으므로(blockGrouping.js 참고) 이 한 줄만으로 그룹까지 통째로 저장된다.
    serialize: () => (diagramInstanceRef.current ? Diagram.serialize(diagramInstanceRef.current) : null),

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
