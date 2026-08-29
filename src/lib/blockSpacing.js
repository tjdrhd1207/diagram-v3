import { isGroupFace, findGroupRecordForMember } from './blockGrouping.js';

/**
 * 파일을 불러왔을 때 지금 배치는 그대로 두고, 실제로 겹치거나 너무 붙어있는
 * 블록/메모끼리만 살살 벌려주는 가벼운 보정 — 그래프 구조를 이해하고 통째로
 * 다시 배치하는 "자동 정렬"과는 다른, 훨씬 보수적인 접근이다(검토 문서 참고).
 *
 * 겹친 두 박스를 겹침이 더 작은 축으로 절반씩 밀어서 떼어놓는 걸 여러 번
 * 반복하는 단순한 방식(타일/태그 클라우드 겹침 해소에 흔히 쓰는 기법)이라
 * 그래프 레이아웃 라이브러리가 따로 필요 없다.
 */

// 딱 붙어있는 정도도 좁다고 보고 살짝 벌려주기 위한 여유 간격(px).
const MIN_GAP = 12;
// 한 번에 다 안 풀리면 여러 번 반복 — 값이 크다고 오래 걸리진 않는다(블록
// 수가 수백 개 수준이라도 pass 하나가 매우 빠름), 그냥 수렴할 시간을 넉넉히 줌.
const MAX_PASSES = 40;

function isMovableItem(component) {
  return (component.type === 'B' || component.type === 'M') && typeof component.setPosition === 'function';
}

// 그룹 멤버는 이번 패스에서 건드리지 않는다 — reconcileGroupBounds가 멤버를
// 그룹의 "고정된" 경계 박스 안으로 다시 밀어넣기만 하고 박스 자체를 넓혀주진
// 않아서(blockGrouping.js), 여기서 옮기면 곧바로 도로 당겨져 싸우게 된다.
function collectMovableItems(diagram) {
  const items = [];
  for (const component of diagram.components.values()) {
    if (!isMovableItem(component)) continue;
    if (isGroupFace(component)) continue;
    if (findGroupRecordForMember(diagram, component.id)) continue;
    items.push(component);
  }
  return items;
}

// 두 박스가 MIN_GAP만큼의 여유까지 포함해서 실제로 겹치는지, 겹친다면 각 축으로
// 얼마나 겹쳤는지 반환한다. 안 겹치면 null.
function overlapOf(a, b) {
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + MIN_GAP;
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + MIN_GAP;
  if (overlapX <= 0 || overlapY <= 0) return null;
  return { overlapX, overlapY };
}

export function relaxOverlappingBlocks(diagram) {
  if (!diagram) return;
  const items = collectMovableItems(diagram);
  if (items.length < 2) return;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let movedAny = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const overlap = overlapOf(a, b);
        if (!overlap) continue;
        movedAny = true;
        // 겹침이 더 작은 축으로 밀어야 총 이동량이 최소가 된다 — 두 박스를
        // 떼어놓는 가장 자연스러운 방향.
        if (overlap.overlapX < overlap.overlapY) {
          const push = overlap.overlapX / 2;
          const dir = a.x + a.w / 2 <= b.x + b.w / 2 ? -1 : 1;
          a.setPosition(dir * push, 0, true);
          b.setPosition(-dir * push, 0, true);
        } else {
          const push = overlap.overlapY / 2;
          const dir = a.y + a.h / 2 <= b.y + b.h / 2 ? -1 : 1;
          a.setPosition(0, dir * push, true);
          b.setPosition(0, -dir * push, true);
        }
      }
    }
    if (!movedAny) break;
  }
}
