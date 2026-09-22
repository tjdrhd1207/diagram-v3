import { Diagram } from './diagram-library.js';
import { looksLikeDesignerXml, convertDesignerXmlToScenarioXml } from './designerXml.js';
import { isPromptLikeNode, findAudioDataProp } from './promptExport.js';
import { hasScriptEditorProp, findTargetPageProp, findTargetBlockProp, readPropertyValue } from './nodeProperties.js';

// GotoPageNode류가 "지금 페이지 안에서"를 뜻할 때 쓰는 리터럴 — App.jsx의
// handleGotoBlockDoubleClick과 동일한 값(designerXml.js의 GotoPageNode buildScript
// 기준으로 확정).
const CURRENT_PAGE_LITERAL = '<현재페이지>';

// 연속 자동 진행이 이 횟수를 넘으면 루프로 보고 중단한다 — 실수로 순환 참조된
// 시나리오에서 브라우저가 멈추는 것을 막기 위한 안전장치일 뿐, 정상적인 시나리오가
// 이만큼 길게 자동 진행될 일은 없다.
const MAX_AUTO_STEPS = 200;

// project 없이 단일 파일만 열어둔 경우(또는 프로젝트는 있지만 시작 페이지가 지금
// 열려있는 페이지인 경우)를 가리키는 내부 전용 페이지 키 — project.pages에는
// 존재하지 않는 값이라 실제 include와 절대 충돌하지 않는다.
export const LIVE_PAGE_INCLUDE = '__live__';

function readFileText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function findStartBlock(diagram, meta) {
    for (const component of diagram.components.values()) {
        if (component.type === 'B' && meta?.nodes?.[component.metaName]?.isStartNode) {
            return component;
        }
    }
    return null;
}

// CustomBlock의 각 이벤트 행(eventElementArray)에 실제로 연결된 링크만 골라
// {event, targetBlockId} 목록으로 돌려준다. 링크가 없는 행(=출구가 안 뚫린 행)은
// 목록에서 빠진다 — diagram-library.js 확인 결과, CustomBlock의 링크는
// blockOrigin이 Block이 아니라 그 행(CustomEventBlock) 자신이라 block.links를
// 돌면서 link.blockOrigin === row로 주인 행을 찾아야 한다.
function getWiredExits(block) {
    const rows = block.eventElementArray ?? [];
    const exits = [];
    for (const row of rows) {
        for (const link of block.links.values()) {
            if (link.blockOrigin === row && link.blockDest) {
                exits.push({ event: row.event, targetBlockId: link.blockDest.id });
                break;
            }
        }
    }
    return exits;
}

function readAudioLabel(nodeDef, block) {
    const audioProp = findAudioDataProp(nodeDef);
    if (!audioProp) return null;
    return readPropertyValue(block.userData, audioProp) || null;
}

/**
 * 시나리오를 채팅형으로 한 블록씩 따라가는 워크스루 세션을 만든다. 완전한 실행
 * 엔진이 아니라, "링크가 제대로 연결됐는지 / 분기가 말이 되는지"를 사람이 직접
 * 매 블록마다 출구를 눌러가며 눈으로 확인하기 위한 도구 — 대신 실행해주지 않고
 * 실제 출구(링크)가 1개뿐이어도 항상 멈춰서 버튼으로 고르게 한다(사용자 피드백).
 * 다만 GotoPageNode/DiagnoseNode처럼 자기 출구가 아예 없는 "무조건 점프" 타입은
 * 고를 것 자체가 없으므로 조용히 지나간다.
 *
 * @param {object} project .prj로 연 프로젝트(없으면 null — 단일 파일만 연 경우)
 * @param {object} meta effectiveMeta (designer.meta.json + 그룹 얼굴 합성 엔트리)
 * @param {() => object|null} getLiveDiagram 지금 캔버스에 떠 있는 Diagram 인스턴스
 * @param {() => string} getLivePageInclude 지금 캔버스가 보여주는 페이지의 include
 *   (project 없이 단일 파일만 연 경우 LIVE_PAGE_INCLUDE)
 * @param {string} startPageInclude 시작 페이지의 include
 */
export function createSimulatorEngine({ project, meta, getLiveDiagram, getLivePageInclude, startPageInclude }) {
    // 세션 동안 재사용하는 오프스크린 svg — 지금 열려있지 않은 페이지를 지연
    // 로딩할 때만 실제로 쓰인다. projectScan.js와 같은 이유로 안전하게 재사용
    // 가능(Diagram 생성자가 매번 기존 자식을 스스로 지움).
    let scratchSvg = null;
    const pageDiagramCache = new Map(); // pageInclude -> diagram (지연 로딩된 비-라이브 페이지만)

    function ensureScratchSvg() {
        if (!scratchSvg) {
            scratchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            scratchSvg.id = `scenario-simulator-scratch-${Date.now()}`;
            scratchSvg.style.cssText = 'position:absolute; left:-99999px; top:-99999px; width:10px; height:10px;';
            document.body.appendChild(scratchSvg);
        }
        return scratchSvg;
    }

    async function loadPageDiagram(pageInclude) {
        if (pageInclude === getLivePageInclude?.()) {
            return getLiveDiagram?.() ?? null;
        }
        if (pageDiagramCache.has(pageInclude)) {
            return pageDiagramCache.get(pageInclude);
        }
        if (!project) return null;
        const file = project.files.get(pageInclude);
        if (!file) return null;

        let text;
        try {
            text = await readFileText(file);
        } catch {
            return null;
        }

        let xml = text;
        if (looksLikeDesignerXml(text)) {
            try {
                xml = convertDesignerXmlToScenarioXml(text, meta).xml;
            } catch {
                return null;
            }
        }

        const parseCheck = new DOMParser().parseFromString(xml, 'text/xml');
        if (parseCheck.querySelector('parsererror')) return null;

        let diagram;
        try {
            diagram = Diagram.deserialize(`#${ensureScratchSvg().id}`, meta, xml, {});
        } catch {
            return null;
        }
        pageDiagramCache.set(pageInclude, diagram);
        return diagram;
    }

    function pageLabel(pageInclude) {
        if (pageInclude === LIVE_PAGE_INCLUDE) return '현재 페이지';
        const page = project?.pages?.find((p) => p.include === pageInclude);
        return page?.tag || page?.include || pageInclude || '(알 수 없는 페이지)';
    }

    const session = {
        messages: [],
        status: 'running', // 'running' | 'awaiting-input' | 'ended' | 'error'
        pending: null, // { exits } — awaiting-input일 때만
        current: null, // { pageInclude, blockId }
    };

    function pushMessage(role, text, extra = {}) {
        session.messages.push({ role, text, ...extra });
    }

    function snapshot() {
        return {
            messages: [...session.messages],
            status: session.status,
            options: session.pending ? session.pending.exits.map((e) => e.event) : null,
            // 지금 엔진이 서있는 위치 — App.jsx가 이걸로 캔버스를 자동으로
            // 그 페이지/블록까지 따라가게 한다(페이지가 바뀐 경우에만).
            current: session.current ? { ...session.current } : null,
        };
    }

    // GotoPageNode/DiagnoseNode처럼 TargetPage+TargetBlock을 가진 노드는 대부분
    // "무조건 점프, 자기 자신의 흐름은 없음"이지만, CatchNode(ok 출구 하나)나
    // CallPageNode(ok/error/timeout/default 출구)처럼 meta.json에 나름의 links가
    // 정의된 타입은 TargetPage/TargetBlock이 있어도 실제 실행 흐름과 무관하다
    // (CatchNode의 TargetPage는 "이 이벤트가 실제로 발생하면 보낼 곳"이지 지금 당장
    // 갈 곳이 아니고, CallPageNode는 호출 후 결과에 따라 여기 이어지는 흐름을 그대로
    // 타야 한다 — 실제 123.prj 샘플에서 CatchNode 체인을 GotoPageNode처럼 취급했더니
    // 콜 시작 직후 엉뚱하게 hangup 처리 페이지로 빠지는 문제를 이 방식으로 확인/수정함).
    // 그래서 "meta.json이 이 노드 타입의 출구를 하나도 정의하지 않은 경우"에만 순수
    // 점프로 본다 — App.jsx의 handleGotoBlockDoubleClick(더블클릭으로 "구경만" 가는
    // 기능)과 달리, 여기는 실제 자동 실행 흐름이라 더 엄격하게 판별해야 한다.
    function resolveGoto(block, nodeDef) {
        const targetPageProp = findTargetPageProp(nodeDef);
        const targetBlockProp = findTargetBlockProp(nodeDef);
        if (!targetPageProp || !targetBlockProp) return null;
        if ((nodeDef?.links?.length ?? 0) > 0) return null;

        const targetBlockId = readPropertyValue(block.userData, targetBlockProp);
        if (!targetBlockId) return null;

        const targetPageValue = readPropertyValue(block.userData, targetPageProp);
        const isSamePage = !targetPageValue || targetPageValue === CURRENT_PAGE_LITERAL;
        return {
            pageInclude: isSamePage ? session.current.pageInclude : targetPageValue,
            blockId: targetBlockId,
        };
    }

    // 다음 "멈춰야 할 지점"까지 조용히 그래프를 따라간다.
    async function advance() {
        for (let steps = 0; ; steps++) {
            if (steps > MAX_AUTO_STEPS) {
                session.status = 'error';
                session.pending = null;
                pushMessage('system', '자동 진행이 너무 오래 이어져 중단했습니다(루프로 보임). "다시 시작"으로 처음부터 확인해보세요.');
                return;
            }

            const diagram = await loadPageDiagram(session.current.pageInclude);
            if (!diagram) {
                session.status = 'error';
                session.pending = null;
                pushMessage('system', `"${pageLabel(session.current.pageInclude)}" 페이지를 불러오지 못해 여기서 멈췄습니다.`);
                return;
            }

            const block = diagram.components.get(session.current.blockId);
            if (!block || block.type !== 'B') {
                session.status = 'error';
                session.pending = null;
                pushMessage('system', '대상 블록을 찾지 못해 여기서 멈췄습니다.');
                return;
            }

            const nodeDef = meta?.nodes?.[block.metaName];

            const gotoTarget = resolveGoto(block, nodeDef);
            if (gotoTarget) {
                if (gotoTarget.pageInclude !== session.current.pageInclude) {
                    pushMessage('system', `📄 "${pageLabel(gotoTarget.pageInclude)}" 페이지로 이동합니다.`);
                }
                session.current = gotoTarget;
                continue;
            }

            const exits = getWiredExits(block);
            const blockLabel = block.caption || nodeDef?.displayName || block.metaName;

            if (exits.length === 0) {
                session.status = 'ended';
                session.pending = null;
                pushMessage('system', `"${blockLabel}"에서 더 진행할 연결이 없습니다. (종료)`, {
                    pageInclude: session.current.pageInclude,
                    blockId: block.id,
                });
                return;
            }

            // 출구가 몇 개든(1개여도) 항상 여기서 멈추고 버튼으로 고르게 한다 — 사용자가
            // 링크를 하나하나 직접 밟아나가며 확인하고 싶다는 요청에 따라, 이 엔진은
            // "대신 실행"하지 않고 매 블록마다 사람이 다음 출구를 선택하게 한다.
            const isPrompt = isPromptLikeNode(nodeDef);
            const isScript = hasScriptEditorProp(nodeDef);
            let text = blockLabel;
            if (isPrompt) {
                text = block.comment || readAudioLabel(nodeDef, block) || blockLabel;
            } else if (isScript) {
                text = `🔧 ${blockLabel} (스크립트 — 실제로 실행되지 않습니다)`;
            }

            session.status = 'awaiting-input';
            session.pending = { exits };
            pushMessage('bot', text, { pageInclude: session.current.pageInclude, blockId: block.id });
            return;
        }
    }

    async function start() {
        session.messages = [];
        session.pending = null;
        session.status = 'running';

        if (!startPageInclude) {
            session.status = 'error';
            pushMessage('system', '시작할 페이지를 찾을 수 없습니다.');
            return snapshot();
        }

        const diagram = await loadPageDiagram(startPageInclude);
        if (!diagram) {
            session.status = 'error';
            pushMessage('system', `"${pageLabel(startPageInclude)}" 페이지를 불러오지 못했습니다.`);
            return snapshot();
        }

        const startBlock = findStartBlock(diagram, meta);
        if (!startBlock) {
            session.status = 'error';
            pushMessage('system', '시작 블록을 찾을 수 없습니다.');
            return snapshot();
        }

        session.current = { pageInclude: startPageInclude, blockId: startBlock.id };
        await advance();
        return snapshot();
    }

    async function reply(inputText) {
        if (session.status !== 'awaiting-input' || !session.pending) {
            pushMessage(
                'system',
                session.status === 'ended' ? '시뮬레이션이 종료되었습니다. "다시 시작"을 눌러주세요.' : '지금은 입력을 받을 수 없습니다. "다시 시작"을 눌러주세요.'
            );
            return snapshot();
        }

        const trimmed = (inputText ?? '').trim();
        pushMessage('user', inputText ?? '');

        const pending = session.pending;

        // trim + 대소문자 무시하고 출구 이름과 정확히 매치되는 것을 찾는다 — 버튼을
        // 누르면 그 버튼의 이벤트 이름이 그대로 여기로 들어오지만, 직접 타이핑해도
        // 같은 방식으로 처리된다.
        const matched = pending.exits.find((e) => e.event.trim().toLowerCase() === trimmed.toLowerCase());
        if (!matched) {
            pushMessage('system', `가능한 값: ${pending.exits.map((e) => e.event).join(', ')}`);
            return snapshot();
        }
        session.current = { pageInclude: session.current.pageInclude, blockId: matched.targetBlockId };
        session.pending = null;
        session.status = 'running';
        await advance();
        return snapshot();
    }

    function dispose() {
        scratchSvg?.remove();
        scratchSvg = null;
        pageDiagramCache.clear();
    }

    return { start, reply, reset: start, dispose };
}
