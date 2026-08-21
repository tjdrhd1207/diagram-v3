import { Block, ActionManager, NodeWrapper } from './diagram-library.js';

/**
 * 여러 블록을 하나의 "그룹"으로 묶어서, 옅은 점선 테두리로 감싸 보여주는 기능.
 * 멤버 블록은 그룹으로 묶인 뒤에도 항상 그대로 보이고 조작 가능하다 — 그룹은 순수하게
 * "이 블록들은 하나로 묶여있다"는 시각적/의미적 표시일 뿐, 블록을 숨기거나 대체하지 않는다.
 * 테두리(또는 왼쪽 위 라벨 탭)를 드래그하면 그룹 전체가 멤버와 함께 이동하고, 개별
 * 멤버는 그룹 경계 밖으로는 드래그해도 다시 안으로 붙는다.
 *
 * diagram-library.js 는 그룹이라는 개념을 전혀 모른다 — 이 모듈이 라이브러리가 이미
 * 제공하는 공개 API(Block.createInstance, block.select/unselect, block.setPosition,
 * diagram.actionManager)만 조합해서 그룹 의미론을 전부 구현한다. 라이브러리 쪽에
 * 필요했던 유일한 변경은 (1) 이 파일이 import 할 수 있도록 export 목록을 넓힌 것과
 * (2) undo/redo가 우리가 넘기는 클로저를 그대로 호출해주는 범용 액션 타입
 * `ActionManager.GROUP_ACTION` 하나 뿐이다 — 그룹이 뭔지는 라이브러리가 여전히 모른다.
 *
 * 그룹 저장 방식: 화면에는 절대 보이지 않는("얼굴이 아니라 순수 데이터 앵커") 블록
 * 하나를 만들어 그 `userData`에 멤버 id 목록과 경계 사각형(bounds)을 적어둔다.
 * `Block.serialize`/`Block.deserialize`가 이미 임의의 userData를 그대로 왕복시켜주기
 * 때문에, 이 파일은 Diagram.serialize/deserialize를 전혀 건드리지 않고도 저장/불러오기를
 * 지원한다 (역직렬화 직후 rehydrateGroupsAfterDeserialize 한 번만 호출).
 */

export const GROUP_FACE_META_NAME = '__GROUP_FACE__';
export const GROUP_USERDATA_TAG = 'group';

const OUTLINE_PADDING = 14;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAG_WIDTH = 44;
const TAG_HEIGHT = 18;

/**
 * designer.meta.json은 건드리지 않고, 그룹 앵커 블록이 필요로 하는 최소한의 합성 메타
 * 엔트리를 원본 meta 위에 덧붙인 새 객체를 반환한다 (원본은 절대 mutate하지 않음).
 *
 * 이 엔트리가 필요한 이유:
 * - Block.deserialize가 `diagram.meta.nodes[metaName].buildTag`를 가드 없이 바로 읽는다
 *   (없으면 즉시 TypeError) — 그룹 앵커도 저장 후 다시 열 때 이 경로를 탄다.
 * - Diagram.prototype.delete()도 `nodeInfo.isStartNode`를 가드 없이 읽는다 — 그룹을
 *   해제(=앵커 삭제)할 때 이 경로를 탄다.
 */
export function withGroupFaceMeta(meta) {
    return {
        ...meta,
        nodes: {
            ...meta?.nodes,
            [GROUP_FACE_META_NAME]: {
                displayName: '그룹',
                shape: '',
                icon: 'icons/group.svg',
                group: '기타',
                buildTag: GROUP_USERDATA_TAG,
                isStartNode: false,
                isJumpable: false,
                internal: true, // groupNodesByCategory가 "삽입" 탭에서 걸러내기 위한 플래그
                description: '여러 블록을 하나로 묶은 그룹입니다.',
                properties: [],
                links: [],
            },
        },
    };
}

export function ensureGroupRegistry(diagram) {
    if (!diagram.groups) {
        diagram.groups = new Map();
    }
    return diagram.groups;
}

export function isGroupFace(block) {
    return !!block && block.type === 'B' && block.metaName === GROUP_FACE_META_NAME;
}

function getComponent(diagram, id) {
    return diagram.components.get(id) ?? null;
}

/**
 * 그룹 앵커의 레코드를 가져온다. diagram.groups 런타임 캐시에 없으면(예: 삭제 undo로
 * 앵커 Block이 방금 새로 재생성된 경우 — 라이브러리의 ActionManager.undo는 userData를
 * 그대로 들고 다시 만들어주지만 우리 캐시까지 채워주지는 않는다) 앵커 자신의 userData에서
 * 다시 읽어와 캐시를 스스로 복구한다.
 */
function getGroupRecord(diagram, faceBlock) {
    if (!isGroupFace(faceBlock)) return null;
    const groups = ensureGroupRegistry(diagram);
    let record = groups.get(faceBlock.id);
    if (!record && faceBlock.userData) {
        record = readRecordFromUserData(faceBlock.id, faceBlock.userData);
        groups.set(faceBlock.id, record);
    }
    return record ?? null;
}

/**
 * 주어진 블록 id가 이미 어떤 그룹의 멤버인지 찾는다. 캐시가 아니라 매번 앵커들을
 * 스캔해서 getGroupRecord로 조회한다 — 그래야 캐시에 아직 없는(예: 삭제 undo로 막
 * 재생성된) 앵커도 놓치지 않는다.
 */
export function findGroupRecordForMember(diagram, blockId) {
    for (const component of diagram.components.values()) {
        if (!isGroupFace(component)) continue;
        const record = getGroupRecord(diagram, component);
        if (record?.memberIds.includes(blockId)) {
            return record;
        }
    }
    return null;
}

/**
 * "그룹으로 묶기"가 가능한 선택인지 검사한다. v1은 중첩/재그룹을 지원하지 않으므로,
 * 이미 그룹 앵커이거나 이미 어떤 그룹의 멤버인 블록이 섞여 있으면 거부한다.
 */
export function canGroupSelection(diagram, blocks) {
    if (!blocks || blocks.length < 2) return false;
    return blocks.every((block) => {
        if (isGroupFace(block)) return false;
        if (findGroupRecordForMember(diagram, block.id)) return false;
        return true;
    });
}

function computeInitialBounds(memberBlocks, padding = OUTLINE_PADDING) {
    const minX = Math.min(...memberBlocks.map((b) => b.x)) - padding;
    const minY = Math.min(...memberBlocks.map((b) => b.y)) - padding;
    const maxX = Math.max(...memberBlocks.map((b) => b.x + b.w)) + padding;
    const maxY = Math.max(...memberBlocks.map((b) => b.y + b.h)) + padding;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 화면 클라이언트 좌표를 SVG 사용자 좌표로 변환한다 (확대/축소·이동 상태와 무관하게 정확). */
function toSvgPoint(diagram, clientX, clientY) {
    const pt = diagram.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = diagram.svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
}

/**
 * 테두리/라벨 탭에 공통으로 붙는 마우스 상호작용 — 클릭하면 그룹(보이지 않는 앵커
 * 블록)이 선택되고, 누른 채로 끌면 그룹 전체(경계 사각형 + 모든 멤버)가 함께 이동한다.
 *
 * 라이브러리의 기본 블록 드래그(diagram.dragStart 기반)를 재사용하지 않는 이유:
 * 그 경로는 "현재 diagram.selectedItems에 들어있는 블록들"을 옮기는데, 우리는
 * 그룹을 선택했을 때 보이지 않는 앵커 블록만 selectedItems에 넣어둔다(그래야 리본의
 * "그룹 해제" 버튼 활성화 조건이 단순해짐) — 실제로 옮겨야 할 건 멤버들이라 별도의
 * 자체 드래그 구현이 필요했다.
 */
function attachGroupInteractionHandlers(element, diagram, record) {
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        const faceBlock = getComponent(diagram, record.faceId);
        if (!faceBlock) return;

        if (faceBlock.selected) {
            if (e.shiftKey) {
                faceBlock.unselect();
                return;
            }
        } else {
            if (!e.shiftKey) diagram.clearSelection();
            faceBlock.select();
        }

        const members = record.memberIds.map((id) => getComponent(diagram, id)).filter(Boolean);
        let last = toSvgPoint(diagram, e.clientX, e.clientY);
        let totalDx = 0;
        let totalDy = 0;
        let moved = false;
        record.isGroupDragging = true;

        const handleMove = (moveEvent) => {
            const point = toSvgPoint(diagram, moveEvent.clientX, moveEvent.clientY);
            const dx = point.x - last.x;
            const dy = point.y - last.y;
            if (dx === 0 && dy === 0) return;
            moved = true;
            last = point;
            totalDx += dx;
            totalDy += dy;
            record.bounds.x += dx;
            record.bounds.y += dy;
            for (const member of members) member.setPosition(dx, dy, true);
            syncGroupOutline(diagram, record);
        };

        const finishDrag = (dx, dy) => {
            record.bounds.x += dx;
            record.bounds.y += dy;
            for (const member of members) member.setPosition(dx, dy, true);
            writeRecordToUserData(faceBlock, record);
            syncGroupOutline(diagram, record);
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            record.isGroupDragging = false;
            if (!moved) return;
            writeRecordToUserData(faceBlock, record);
            const dx = totalDx;
            const dy = totalDy;
            diagram.actionManager.append(ActionManager.GROUP_ACTION, {
                undo: () => finishDrag(-dx, -dy),
                redo: () => finishDrag(dx, dy),
            });
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    });
}

/**
 * "이 블록들이 하나의 그룹이다"라는 느낌을 주는 배경 테두리 — 그룹이 존재하는 한 항상
 * 보이며, 멤버 블록들은 그 안에서 그대로 다 보이고 조작 가능하다(안은 완전히 투명).
 *
 * `.hd-group` 클래스는 diagram-library.js 자체 스타일시트에 이미 정의돼 있지만(옅은
 * 회색 반투명 사각형) 실제로는 아무 코드도 붙이지 않던 죽은 스타일 — 원래 이런 용도로
 * 준비돼 있던 것으로 보여 그대로 재사용한다.
 *
 * 테두리 자체와 왼쪽 위의 작은 "그룹" 라벨 탭, 둘 다 클릭/드래그하면 그룹 자체(보이지
 * 않는 앵커 블록)가 선택/이동된다 — 앵커는 화면에 절대 보이지 않는 순수 데이터
 * 저장용이라 직접 클릭할 방법이 없기 때문에 이게 유일한 조작 경로다. 라벨 탭을 따로
 * 두는 이유: 모든 Block은 앵커 4개(L/R/T/B)를 갖고 있고, 그 "감지 영역(magnet)"은
 * 화면에 안 보여도 반경이 있어 여전히 클릭을 가로챈다(diagram-library.js 확인 —
 * Anchor.setVisible은 opacity만 0으로 바꿀 뿐 pointer-events는 그대로 둔다). 블록
 * 사이 여백 대부분이 이 감지 영역과 겹치기 때문에, 테두리 여백을 클릭해도 실제로는
 * 인접한 블록의 앵커가 클릭을 가로채는 경우가 많다 — 그래서 앵커가 닿지 않는 테두리
 * 바깥 모서리에 확실한 클릭/드래그 지점을 하나 더 둔다.
 *
 * z-order상 블록들보다 먼저(뒤에) 삽입되므로, 블록 위를 클릭하면 여전히 그 블록이
 * 클릭을 받는다(정상 동작). diagram-library.js의 마우스다운 디스패처는 `.draggable`
 * 클래스가 있는 엘리먼트만 컴포넌트로 인식하므로, 이 엘리먼트들에는 그 클래스를
 * 일부러 안 붙이고 여기서 직접 select/드래그를 처리한다.
 */
function ensureGroupOutline(diagram, record) {
    if (record.outlineElement && record.outlineElement.isConnected) return record.outlineElement;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'hd-group');
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
    rect.style.strokeDasharray = '6 4';
    rect.style.strokeOpacity = '0.35';
    rect.style.pointerEvents = 'all';
    rect.style.cursor = 'move';
    rect.style.display = 'none';
    attachGroupInteractionHandlers(rect, diagram, record);
    diagram.svg.insertBefore(rect, diagram.svg.firstChild);

    // 테두리 바깥 왼쪽 위 모서리에 붙는 작은 "그룹" 라벨 탭 — 어떤 블록의 앵커
    // 감지 영역과도 안 겹치는, 항상 확실히 클릭/드래그되는 지점.
    const tag = document.createElementNS(SVG_NS, 'rect');
    tag.setAttribute('class', 'hd-group');
    tag.setAttribute('rx', '3');
    tag.setAttribute('ry', '3');
    tag.setAttribute('width', String(TAG_WIDTH));
    tag.setAttribute('height', String(TAG_HEIGHT));
    tag.style.fillOpacity = '0.5';
    tag.style.strokeOpacity = '0.5';
    tag.style.pointerEvents = 'all';
    tag.style.cursor = 'move';
    tag.style.display = 'none';
    attachGroupInteractionHandlers(tag, diagram, record);
    diagram.svg.insertBefore(tag, rect.nextSibling);

    const tagText = document.createElementNS(SVG_NS, 'text');
    tagText.textContent = '그룹';
    tagText.setAttribute('font-size', '11');
    tagText.setAttribute('fill', 'rgb(90, 90, 90)');
    tagText.style.pointerEvents = 'none';
    tagText.style.userSelect = 'none';
    tagText.style.display = 'none';
    diagram.svg.insertBefore(tagText, tag.nextSibling);

    record.outlineElement = rect;
    record.tagElement = tag;
    record.tagTextElement = tagText;
    return rect;
}

/** record.bounds(고정된 경계 사각형) 기준으로 테두리 + 라벨 탭을 그려준다. */
function syncGroupOutline(diagram, record) {
    const bounds = record.bounds;
    if (!bounds) return;
    ensureGroupOutline(diagram, record);

    const rect = record.outlineElement;
    rect.setAttribute('x', bounds.x);
    rect.setAttribute('y', bounds.y);
    rect.setAttribute('width', bounds.width);
    rect.setAttribute('height', bounds.height);
    rect.style.display = '';

    // 탭은 테두리의 왼쪽 위 모서리에 절반 정도 걸치도록 배치 — 테두리 바로 바깥이라
    // 앵커 감지 영역과 겹치지 않으면서도 시각적으로 이 그룹에 속해 보인다.
    const tagX = bounds.x + 4;
    const tagY = bounds.y - TAG_HEIGHT / 2;
    record.tagElement.setAttribute('x', tagX);
    record.tagElement.setAttribute('y', tagY);
    record.tagElement.style.display = '';
    record.tagTextElement.setAttribute('x', tagX + 6);
    record.tagTextElement.setAttribute('y', tagY + TAG_HEIGHT - 5);
    record.tagTextElement.style.display = '';
}

function removeGroupOutline(record) {
    record.outlineElement?.remove();
    record.tagElement?.remove();
    record.tagTextElement?.remove();
    record.outlineElement = null;
    record.tagElement = null;
    record.tagTextElement = null;
}

function writeRecordToUserData(faceBlock, record) {
    const userData = faceBlock.userData;
    userData.attr('boundsX', String(record.bounds.x));
    userData.attr('boundsY', String(record.bounds.y));
    userData.attr('boundsW', String(record.bounds.width));
    userData.attr('boundsH', String(record.bounds.height));
    userData.removeChild('member');
    for (const id of record.memberIds) {
        userData.appendChild('member').attr('id', id);
    }
}

function readRecordFromUserData(faceId, userData) {
    return {
        faceId,
        memberIds: userData.children('member').map((n) => n.attr('id')),
        bounds: {
            x: parseFloat(userData.attr('boundsX')) || 0,
            y: parseFloat(userData.attr('boundsY')) || 0,
            width: parseFloat(userData.attr('boundsW')) || 0,
            height: parseFloat(userData.attr('boundsH')) || 0,
        },
    };
}

/**
 * 선택된 블록들을 그룹으로 묶는다. 화면에는 보이지 않는 앵커 블록 하나를 만들어
 * 멤버 id 목록 + 경계 사각형을 저장하고, 멤버들 주위에 항상 보이는 점선 테두리를
 * 그린다 — 멤버 블록 자체는 전혀 건드리지 않는다(선택 상태도 그대로 유지).
 */
export function createGroup(diagram, memberBlocks, options = {}) {
    if (!canGroupSelection(diagram, memberBlocks)) return null;

    const memberIds = memberBlocks.map((b) => b.id);
    const bounds = options.bounds ?? computeInitialBounds(memberBlocks);

    const faceId = options.faceId ?? diagram.generateId();
    const userData = new NodeWrapper(GROUP_USERDATA_TAG);
    const faceBlock = Block.createInstance(
        diagram,
        faceId,
        'Rectangle',
        'icons/group.svg',
        GROUP_FACE_META_NAME,
        options.caption ?? '그룹',
        '',
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        userData
    );
    // 앵커는 순수 데이터 저장용 — 화면에 절대 보이지 않는다.
    faceBlock.shapeElement.style.display = 'none';
    faceBlock.rootElement.style.display = 'none';

    const record = { faceId, memberIds, bounds: { ...bounds } };
    ensureGroupRegistry(diagram).set(faceId, record);
    writeRecordToUserData(faceBlock, record);
    syncGroupOutline(diagram, record);

    diagram.actionManager.append(ActionManager.GROUP_ACTION, {
        undo: () => dissolveGroup(diagram, faceBlock, { forUndo: true }),
        redo: () => {
            const members = memberIds.map((id) => getComponent(diagram, id)).filter(Boolean);
            createGroup(diagram, members, { faceId, caption: faceBlock.caption, bounds: record.bounds });
        },
    });

    return faceBlock;
}

/**
 * 그룹을 해제한다 — 멤버 블록들은 원래부터 항상 보이고 있었으므로 손댈 것이 없고,
 * 데이터 앵커 블록과 테두리만 지운다.
 */
export function dissolveGroup(diagram, faceBlock, options = {}) {
    const record = getGroupRecord(diagram, faceBlock);
    if (!record) return;

    removeGroupOutline(record);
    const snapshot = {
        faceId: record.faceId,
        memberIds: [...record.memberIds],
        caption: faceBlock.caption,
        bounds: { ...record.bounds },
    };
    faceBlock.remove();
    ensureGroupRegistry(diagram).delete(record.faceId);

    if (!options.forUndo) {
        diagram.actionManager.append(ActionManager.GROUP_ACTION, {
            undo: () => {
                const members = snapshot.memberIds.map((id) => getComponent(diagram, id)).filter(Boolean);
                createGroup(diagram, members, { faceId: snapshot.faceId, caption: snapshot.caption, bounds: snapshot.bounds });
            },
            redo: () => {
                const recreatedFace = getComponent(diagram, snapshot.faceId);
                if (recreatedFace) dissolveGroup(diagram, recreatedFace, { forUndo: true });
            },
        });
    }
}

/**
 * 삭제(삭제 버튼/Delete 키) 직전에 diagram.selectedItems를 그룹을 고려해서 보정한다.
 * 멤버 블록은 이제 특별할 게 없는 평범한 블록이라(항상 보이고 항상 선택 가능) 따로
 * 손댈 게 없다 — 유일하게 필요한 처리는, 선택된 것이 그룹 앵커 자신이라면 일반
 * Diagram.prototype.delete() 대상에서 빼고 대신 정식으로 dissolveGroup()을 호출하는
 * 것 뿐이다 (그래야 테두리/레지스트리까지 같이 정리된다 — 앵커를 일반 삭제에 맡기면
 * Block은 지워져도 테두리 엘리먼트와 diagram.groups 항목이 그대로 남는 누수가 생김).
 * 그룹 앵커를 지우는 것은 "그룹 해제"와 같은 의미이지 멤버까지 지우는 게 아니다.
 */
export function prepareSelectionForDeletion(diagram) {
    for (const item of [...diagram.selectedItems]) {
        if (item.type === 'B' && isGroupFace(item)) {
            item.unselect();
            dissolveGroup(diagram, item);
        }
    }
}

function clampMemberIntoBounds(member, bounds) {
    const maxX = Math.max(bounds.x, bounds.x + bounds.width - member.w);
    const maxY = Math.max(bounds.y, bounds.y + bounds.height - member.h);
    const clampedX = Math.min(Math.max(member.x, bounds.x), maxX);
    const clampedY = Math.min(Math.max(member.y, bounds.y), maxY);
    if (clampedX !== member.x || clampedY !== member.y) {
        member.setPosition(clampedX, clampedY, false);
    }
}

/**
 * 개별 멤버 블록을(라이브러리의 기본 드래그로) 옮길 때, 그 블록이 속한 그룹의 경계
 * 사각형 밖으로 나가지 않도록 위치를 보정한다. diagram.svg의 mousemove/mouseup에
 * 매달아서 라이브러리 자신의 드래그 처리 직후에 실행되도록 한다 (등록 순서상 항상
 * 나중에 실행됨) — 그룹 자체를 드래그하는 중(record.isGroupDragging)에는 경계 자체가
 * 같이 움직이는 중이라 건너뛴다.
 */
export function reconcileGroupBounds(diagram) {
    for (const record of ensureGroupRegistry(diagram).values()) {
        if (record.isGroupDragging || !record.bounds) continue;
        for (const memberId of record.memberIds) {
            const member = getComponent(diagram, memberId);
            if (member) clampMemberIntoBounds(member, record.bounds);
        }
    }
}

/**
 * Diagram.deserialize() 직후 한 번 호출한다. 라이브러리는 그룹을 전혀 모른 채 모든
 * block/link를 이미 정상적으로 복원해 놓은 상태이므로, 여기서는 앵커 블록들의
 * userData를 다시 읽어 diagram.groups 런타임 캐시를 재구성하고, 앵커를 다시
 * 숨기고(순수 런타임 상태라 XML에는 없음), 테두리를 다시 그려주기만 하면 된다.
 */
export function rehydrateGroupsAfterDeserialize(diagram) {
    const groups = ensureGroupRegistry(diagram);
    groups.clear();
    for (const component of diagram.components.values()) {
        if (!isGroupFace(component)) continue;
        const record = readRecordFromUserData(component.id, component.userData);
        groups.set(component.id, record);
        component.shapeElement.style.display = 'none';
        component.rootElement.style.display = 'none';
        syncGroupOutline(diagram, record);
    }
    return groups;
}
