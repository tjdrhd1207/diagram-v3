import dagre from '@dagrejs/dagre';
import { ActionManager } from './diagram-library.js';
import { isGroupFace, findGroupRecordForMember } from './blockGrouping.js';

// 레이어(랭크) 사이 간격/같은 레이어 안 블록 사이 간격. 링크 화살표가 지나갈
// 여유를 감안해 랭크 간격을 조금 더 넉넉하게 잡는다.
const NODE_SEP = 40;
const RANK_SEP = 70;

// 방향별로 "흐름상 자연스러운" anchor 쌍 — LR이면 origin의 오른쪽에서 나가
// dest의 왼쪽으로 들어가야지, 지금처럼 원래(재배치 전) anchor를 그대로 두면
// 블록은 옆으로 나란히 놓였는데 링크는 위/아래 anchor에 붙어있어 엉뚱하게
// 돌아나가는 모양이 된다. diagram-library.js의 L_POSITION 등은 export가 안
// 되어 있어(모듈 내부 top-level const) 여기서는 그 리터럴 값('L'/'T'/'R'/'B')을
// 그대로 쓴다 — linkOverlap.js도 이미 같은 방식으로 anchor.position 문자열을
// 직접 비교한다.
const ANCHOR_BY_DIRECTION = {
  TB: { from: 'B', to: 'T' },
  BT: { from: 'T', to: 'B' },
  LR: { from: 'R', to: 'L' },
  RL: { from: 'L', to: 'R' },
};

// 그룹 멤버는 이번 패스에서 아예 건드리지 않는다 — reconcileGroupBounds가
// 멤버를 고정된 그룹 경계 박스 안으로 다시 밀어넣기만 하고 박스 자체는 안
// 넓혀줘서(blockGrouping.js), 그래프 레이아웃으로 멤버를 다른 곳으로 옮기면
// 그 즉시 도로 당겨져 싸우게 된다. 그룹 전체를 하나의 노드로 취급해 통째로
// 옮기는 처리는 다음 단계 과제로 남겨둔다(blockSpacing.js의 겹침 해소 때와
// 같은 제한).
function collectLayoutableBlocks(diagram) {
  const blocks = [];
  for (const component of diagram.components.values()) {
    if (component.type !== 'B') continue;
    if (isGroupFace(component)) continue;
    if (findGroupRecordForMember(diagram, component.id)) continue;
    blocks.push(component);
  }
  return blocks;
}

/**
 * 그래프 구조(블록+방향성 있는 링크)를 이해해서 통째로 다시 배치한다 —
 * blockSpacing.js의 "겹친 것만 살살" 보다 훨씬 적극적인 버전. dagre의
 * 계층형(Sugiyama) 레이아웃을 그대로 써서, 시작점에서부터의 흐름 방향으로
 * 레이어를 나누고 그 안에서 간격을 고르게 배치한다.
 *
 * @param {Diagram} diagram
 * @param {'TB'|'LR'} direction 'TB'=위에서 아래로, 'LR'=왼쪽에서 오른쪽으로
 * @returns {{ movedCount: number, totalBlocks: number, skippedGroupCount: number }}
 */
export function runAutoLayout(diagram, direction) {
  if (!diagram) return { movedCount: 0, totalBlocks: 0, skippedGroupCount: 0 };

  const blocks = collectLayoutableBlocks(diagram);
  const blockIds = new Set(blocks.map((b) => b.id));

  let skippedGroupCount = 0;
  for (const component of diagram.components.values()) {
    if (component.type === 'B' && !isGroupFace(component) && !blockIds.has(component.id)) {
      skippedGroupCount++;
    }
  }

  if (blocks.length === 0) {
    return { movedCount: 0, totalBlocks: 0, skippedGroupCount };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: NODE_SEP, ranksep: RANK_SEP });
  g.setDefaultEdgeLabel(() => ({}));

  for (const block of blocks) {
    g.setNode(block.id, { width: block.w, height: block.h });
  }

  for (const component of diagram.components.values()) {
    if (component.type !== 'L') continue;
    const originId = component.blockOrigin?.id;
    const destId = component.blockDest?.id;
    if (originId === destId) continue; // 자기 자신으로 돌아오는 링크는 dagre에 안 넘김
    if (!blockIds.has(originId) || !blockIds.has(destId)) continue;
    g.setEdge(originId, destId);
  }

  dagre.layout(g);

  // 정렬(halign/valign) 탭이 이미 쓰고 있는 것과 같은 undo 메커니즘을 그대로
  // 재사용한다 — ActionManager.append()가 화이트리스트 방식이라 새 상수를
  // 쓰려면 diagram-library.js에 분기를 추가해야 하는데, COMPONENTS_ALIGNED는
  // "블록별로 다른 상대 이동량(rx, ry) 목록"이라는 모양이 똑같아서 그대로
  // 재사용 가능하다(diagram-library.js는 이번에도 안 건드림).
  const undoData = { type: 'AUTO_LAYOUT', actions: [] };
  for (const block of blocks) {
    const node = g.node(block.id);
    if (!node) continue;
    // dagre가 돌려주는 x/y는 노드의 "중심" 좌표 — 우리 블록의 x/y는 좌상단
    // 기준이라 폭/높이의 절반을 빼서 변환한다.
    const targetX = node.x - block.w / 2;
    const targetY = node.y - block.h / 2;
    const rx = targetX - block.x;
    const ry = targetY - block.y;
    if (rx === 0 && ry === 0) continue;
    block.setPosition(rx, ry, true);
    undoData.actions.push({ block, rx, ry });
  }

  if (undoData.actions.length > 0) {
    diagram.actionManager.append(ActionManager.COMPONENTS_ALIGNED, undoData);
  }

  // 블록 위치를 다 옮긴 뒤에 링크의 anchor를 방향에 맞게 다시 붙인다 —
  // Link에는 anchor를 바꿔 끼우는 공개 메서드가 없다(diagram-library.js
  // 확인 — 사용자가 직접 링크 끝을 드래그해서 재연결할 때조차 링크를 통째로
  // remove() 하고 새로 만드는 방식). 새로 만들지 않고 anchorFrom/anchorTo/
  // posOrigin/posDest 필드를 직접 갈아끼우는 이유는, Anchor 객체 자체가
  // "어떤 링크가 자길 쓰는지" 별도로 추적하지 않아서(Anchor 클래스 확인)
  // 필드 재할당만으로 충분하고, 링크 id를 그대로 유지해 CUSTOM_EVENT_BLOCK
  // 같은 다른 곳의 id 참조도 안 깨지기 때문. moveX/moveY(기존 곡선 휨 정도)는
  // 예전 anchor 기준으로 튜닝된 값이라 새 anchor에는 안 맞을 수 있어 0으로
  // 리셋한다.
  //
  // 알려진 제한: 이 재연결은 undo 대상이 아니다 — ActionManager.append()가
  // 화이트리스트라 새 액션 타입을 쓰려면 diagram-library.js 수정이 필요하고,
  // 기존 LINK_CONNECT_CHANGED는 링크 하나당 별도 undo 스텝이 되어(수십~수백
  // 개면 실행 취소를 그만큼 여러 번 눌러야 함 + 스택 한도를 넘기면 정작 블록
  // 위치 되돌리기 항목이 먼저 밀려날 위험) "한 번 클릭 = 한 번 실행 취소"를
  // 깨뜨린다. 그래서 블록 위치만 확실히 되돌아가는 쪽을 택함 — 실행 취소 후
  // 링크가 재배치 전 anchor로는 안 돌아가지만(위치는 정확히 복원되므로) 잘못
  // 이어지거나 깨지지는 않는다.
  const anchorPair = ANCHOR_BY_DIRECTION[direction];
  if (anchorPair) {
    for (const component of diagram.components.values()) {
      if (component.type !== 'L') continue;
      const originId = component.blockOrigin?.id;
      const destId = component.blockDest?.id;
      if (originId === destId) continue;
      if (!blockIds.has(originId) || !blockIds.has(destId)) continue;

      // CustomBlock(CUSTOM_DIAGRAM_TYPE)의 이벤트 행(CustomEventBlock)에서
      // 나가는 링크는 blockOrigin이 그 블록이 아니라 행 자체이고, 행의
      // anchors는 L/T/R/B가 아니라 그 행의 이벤트 이름 하나로만 등록돼 있다
      // (diagram-library.js 확인). 그런 링크에 L/R/T/B를 강제로 끼우면
      // anchors.get()이 undefined를 반환해서 anchorFrom/anchorTo가 깨지고,
      // 이후 드래그/오버랩 배지 계산에서 크래시로 이어진다 — 애초에 그
      // 행의 anchor는 이미 "이 링크 전용" 고정 위치라 방향에 맞춰 재배치할
      // 필요도 없으므로, L/R/T/B 앵커를 둘 다 실제로 갖고 있는 링크만
      // 재연결하고 나머지는 원래 anchor를 그대로 둔다.
      const newFrom = component.blockOrigin.anchors?.get(anchorPair.from);
      const newTo = component.blockDest.anchors?.get(anchorPair.to);
      if (!newFrom || !newTo) continue;

      component.posOrigin = anchorPair.from;
      component.posDest = anchorPair.to;
      component.anchorFrom = newFrom;
      component.anchorTo = newTo;
      component.moveX = 0;
      component.moveY = 0;
      component.adjustPoints(0, 0);
    }
  }

  // block.setPosition()은 내부적으로 diagram.drawHelperLine()을 매번 다시
  // 그리므로(마지막으로 옮긴 블록 기준 스냅 가이드선), 루프가 끝난 뒤에도
  // 그 마지막 가이드선이 화면에 남아있다 — align()이 이미 하는 것과 똑같이
  // 정리해준다.
  diagram.removeHelperLine();

  return { movedCount: undoData.actions.length, totalBlocks: blocks.length, skippedGroupCount };
}
