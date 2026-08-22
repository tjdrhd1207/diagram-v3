/**
 * 같은 두 블록 사이에 origin/dest anchor 쪽이 완전히 같은 <choice>가 여러 개 있으면
 * (실제 123.xml 대조로 확인 — as-is 데스크톱 도구 자체도 이런 경우 링크를 겹친 채로
 * 저장해두는 경우가 대부분이었다), Link.getCurveRoute()가 두 anchor 좌표만으로 경로를
 * 계산하기 때문에 여러 링크의 경로/라벨 위치가 완전히 똑같아져서 텍스트가 서로 겹쳐
 * 뭉개져 보인다.
 *
 * 원본 곡선을 복원하거나 자동으로 벌려서 안 겹치게 만드는 대신(실제 데이터로 검토해본
 * 결과 효과가 제한적 — 여러 개가 겹쳐도 결국 또 부분적으로 겹침), 겹친 묶음을 작은
 * "개수 배지"로 표시하고 호버하면 그 안의 링크들을 나열한 팝오버에서 골라 선택하는
 * 방식을 쓴다 — 몇 개가 겹치든 UI 비용이 동일해서 안정적으로 스케일한다.
 *
 * blockGrouping.js와 같은 스타일: 순수 vanilla DOM만 사용(React 개입 없음), 런타임
 * 전용 레지스트리(diagram.linkOverlapBadges)를 diagram 인스턴스에 얹어서 관리한다.
 * diagram-library.js는 전혀 건드리지 않는다 — Link가 이미 공개하고 있는 필드
 * (blockOrigin, blockDest, anchorFrom.position, anchorTo.position, textElement,
 * shapePointElement, caption, select())만으로 구현한다.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const BADGE_RADIUS = 9;
const HOVER_CLOSE_DELAY = 150;

export function ensureOverlapRegistry(diagram) {
    if (!diagram.linkOverlapBadges) {
        diagram.linkOverlapBadges = new Map();
    }
    return diagram.linkOverlapBadges;
}

function getComponent(diagram, id) {
    return diagram.components.get(id) ?? null;
}

/**
 * diagram.components 안의 모든 Link를 (origin block, origin anchor, dest block,
 * dest anchor) 키로 묶는다 — 이 4개 값이 같으면 Link.getCurveRoute()가 계산하는
 * 좌표도 100% 동일하다(같은 입력, 같은 계산이므로 부동소수점 오차조차 없음).
 */
function computeOverlapGroups(diagram) {
    const groups = new Map();
    for (const component of diagram.components.values()) {
        if (component.type !== 'L') continue;
        const key = `${component.blockOrigin.id}|${component.anchorFrom.position}|${component.blockDest.id}|${component.anchorTo.position}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(component);
    }
    return groups;
}

// 팝오버는 한 번에 하나만 뜬다 — 어느 배지 것인지(openPopoverBadge)를 같이
// 기억해뒀다가, 다른 배지에 마우스가 들어오면 지연 없이 바로 교체한다(딜레이는
// "배지 밖으로 완전히 나갔을 때만" 적용 — 배지끼리 바로 옮겨다닐 때 어색하게
// 잠깐 남아있지 않도록).
let closeTimer = null;
let openPopoverEl = null;
let openPopoverBadge = null;

function cancelPendingClose() {
    if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
    }
}

function closePopover() {
    cancelPendingClose();
    if (openPopoverEl) {
        openPopoverEl.remove();
        openPopoverEl = null;
        openPopoverBadge = null;
    }
}

function scheduleClose() {
    cancelPendingClose();
    closeTimer = setTimeout(closePopover, HOVER_CLOSE_DELAY);
}

/** 배지 위에서 호버로 뜨는, 겹친 링크들을 나열한 작은 목록 팝오버. */
function openPopover(diagram, badgeEl, linkIds) {
    cancelPendingClose();
    if (openPopoverBadge === badgeEl) return; // 이미 이 배지용으로 열려 있음
    closePopover(); // 다른 배지 것이 열려 있었다면 즉시 교체

    openPopoverBadge = badgeEl;
    const rect = badgeEl.getBoundingClientRect();
    const popover = document.createElement('div');
    popover.className = 'link-overlap-popover';
    popover.style.left = `${rect.left + rect.width / 2}px`;
    popover.style.top = `${rect.bottom + 4}px`;

    for (const linkId of linkIds) {
        const link = getComponent(diagram, linkId);
        if (!link) continue;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'link-overlap-popover-item';
        item.textContent = link.caption || '(이름 없음)';
        item.addEventListener('click', () => {
            link.select();
            closePopover();
        });
        popover.appendChild(item);
    }

    popover.addEventListener('mouseenter', cancelPendingClose);
    popover.addEventListener('mouseleave', scheduleClose);

    document.body.appendChild(popover);
    openPopoverEl = popover;
}

function createBadge(diagram) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'hd-link-overlap-badge');
    group.style.cursor = 'pointer';

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', String(BADGE_RADIUS));

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');

    group.appendChild(circle);
    group.appendChild(text);
    diagram.svg.appendChild(group);

    const record = { linkIds: [], groupElement: group, circleElement: circle, textElement: text };

    group.addEventListener('mouseenter', () => {
        cancelPendingClose();
        openPopover(diagram, group, record.linkIds);
    });
    group.addEventListener('mouseleave', scheduleClose);

    return record;
}

function positionBadge(record, cx, cy) {
    record.circleElement.setAttribute('cx', cx);
    record.circleElement.setAttribute('cy', cy);
    record.textElement.setAttribute('x', cx);
    record.textElement.setAttribute('y', cy);
}

function removeBadgeAndRestoreLabels(diagram, record) {
    if (openPopoverBadge === record.groupElement) closePopover();
    record.groupElement.remove();
    for (const linkId of record.linkIds) {
        const link = getComponent(diagram, linkId);
        if (link) link.textElement.style.display = '';
    }
}

/**
 * 현재 diagram의 링크 겹침 상태를 다시 계산해서 배지를 만들고/갱신하고/지운다.
 * DiagramCanvas.jsx가 블록 그룹의 reconcileGroupBounds()와 같은 자리(초기 로드 직후,
 * svg의 mouseup, undo/redo/remove/paste 이후)에서 호출한다.
 */
export function syncLinkOverlapBadges(diagram) {
    const registry = ensureOverlapRegistry(diagram);
    const groups = computeOverlapGroups(diagram);
    const seenKeys = new Set();

    for (const [key, links] of groups) {
        if (links.length < 2) continue;
        seenKeys.add(key);

        let record = registry.get(key);
        if (!record) {
            record = createBadge(diagram);
            registry.set(key, record);
        }

        record.linkIds = links.map((link) => link.id);
        record.textElement.textContent = String(links.length);

        for (const link of links) {
            link.textElement.style.display = 'none';
        }

        const cx = links[0].shapePointElement.getAttribute('cx');
        const cy = links[0].shapePointElement.getAttribute('cy');
        positionBadge(record, cx, cy);
    }

    for (const [key, record] of registry) {
        if (seenKeys.has(key)) continue;
        removeBadgeAndRestoreLabels(diagram, record);
        registry.delete(key);
    }
}
