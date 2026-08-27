/**
 * "보이는 ARS" 스크립트 미리보기 — 스크립트가 만드는 app.WV_Param 문자열을 실제
 * 실행해서 뽑아낸 뒤, 그 안의 토큰(TIT$/TXT$/IMG$/MNT$/BTN1$/... 세미콜론으로
 * 구분된 명령들)을 화면 요소로 바꿔 대략적인 목업을 그리기 위한 순수 로직.
 *
 * 목표는 "실제 as-is 클라이언트가 그리는 화면을 픽셀 단위로 재현"이 아니라
 * "이 스크립트를 넣으면 대충 이런 화면이 나오겠구나"를 보여주는 목업이다 — 그래서
 * 화면 템플릿 선택 토큰(S$)에 따라 레이아웃을 분기하지 않는다. 사이트/템플릿마다
 * 실제 레이아웃이 다를 수 있어서(사용자 확인) 그걸 다 재현하려면 템플릿별 스펙이
 * 필요한데, 목업 수준에서는 토큰을 순서대로 쌓아서 보여주는 것만으로 충분하다는
 * 판단. S$/BOT$/BTNF$/MUTE$/BTH$처럼 화면에 안 보이는(백엔드/상태용) 토큰과, 아직
 * 본 적 없는 토큰은 화면 밑에 참고용으로만 나열한다.
 */

/** app.WV_Param을 채우는 스크립트를 로컬에서 그대로 실행해서 결과 문자열을 얻는다.
 * 사용자가 직접 작성/편집 중인 자기 스크립트를 실행하는 것뿐이라 별도 샌드박싱은
 * 하지 않는다 — 이미 Monaco IntelliSense가 같은 신뢰 경계에서 이 코드를 다루고
 * 있고, util.*를 실제로 호출하지 않는다는 점도 동일하다.
 */
export function runScriptForWvParam(scriptText) {
    const logs = [];
    const util = makeMockUtil(logs);
    const app = {};
    try {
        // eslint-disable-next-line no-new-func
        new Function('app', 'util', scriptText)(app, util);
        return { wvParam: app.WV_Param ?? '', logs, error: null };
    } catch (err) {
        return { wvParam: '', logs, error: err.message };
    }
}

// util.*를 실제로 몇 개 호출하는지, 어떤 이름인지 미리 다 알 수 없으므로(51개
// 함수 + 앞으로 늘 수 있음) Proxy로 "일단 뭘 부르든 죽지 않고 undefined를 반환"
// 하도록 한다. print/print_debug만 실제로 로그에 담아서 화면 아래 참고용으로
// 보여준다 — 나머지는 이번 미리보기 목적(화면 모양만 보기)엔 필요 없다.
function makeMockUtil(logs) {
    const known = {
        print: (m) => logs.push(String(m)),
        print_debug: (m) => logs.push(String(m)),
    };
    return new Proxy(known, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop !== 'string') return undefined;
            return (...args) => {
                logs.push(`[mock] util.${prop}(${args.map((a) => JSON.stringify(a)).join(', ')}) → undefined`);
                return undefined;
            };
        },
    });
}

function tokenizeWvParam(wvParam) {
    return (wvParam || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((cmd) => cmd.split('$'));
}

/**
 * @param {string} wvParam
 * @returns {{ elements: object[], buttons: object[], info: string[] }}
 *   elements: 화면 위에서 아래로 순서대로 쌓을 요소들.
 *   buttons: 하단 버튼 영역에 나열할 버튼들.
 *   info: 화면엔 안 보이지만 참고할 만한 토큰(템플릿 코드, 미지원 토큰 등).
 */
export function buildMockScreen(wvParam) {
    const tokens = tokenizeWvParam(wvParam);
    const elements = [];
    const buttons = [];
    const info = [];

    for (const t of tokens) {
        const type = t[0];
        switch (type) {
            case 'TIT':
                elements.push({ kind: 'title', text: t[2] ?? '' });
                break;
            case 'TXT':
                elements.push({ kind: 'text', html: t[3] ?? '' });
                break;
            case 'IMG':
                elements.push({ kind: 'image', code: t[2] ?? '' });
                break;
            case 'STEP':
                elements.push({ kind: 'step', total: Number(t[2]) || 0, current: Number(t[3]) || 0, label: t[4] ?? '' });
                break;
            case 'STR':
                elements.push({ kind: 'strong', text: t[2] ?? '' });
                break;
            case 'MNT': {
                const answers = (t[4] ?? '')
                    .split('^')
                    .map((a) => a.trim())
                    .filter(Boolean);
                elements.push({ kind: 'question', page: t[2] ?? '', text: t[3] ?? '', answers });
                break;
            }
            case 'MSG':
                elements.push({ kind: 'message', html: t[2] ?? '' });
                break;
            case 'BTN1':
            case 'BTNE2':
                buttons.push({ label: t[2] ?? '', action: t[3] ?? '' });
                break;
            case 'NEX':
                buttons.push({ label: t[2] ?? '', action: t[4] ?? 'NEXT' });
                break;
            case 'PRE':
                buttons.push({ label: t[2] ?? '', action: t[4] ?? 'PREV' });
                break;
            case 'S':
                info.push(`템플릿(S): ${t[1] ?? ''}`);
                break;
            case 'BTNF':
                info.push(`하단 버튼 상태(BTNF): ${t[2] ?? ''}`);
                break;
            case 'BOT':
                info.push(`처리 엔진(BOT): ${t[2] ?? ''}`);
                break;
            case 'MUTE':
            case 'BTH':
                info.push(`${type}: ${t.slice(1).join('$')}`);
                break;
            default:
                info.push(`[미지원 토큰] ${t.join('$')}`);
        }
    }

    return { elements, buttons, info };
}

/** ScriptEditorModal의 "미리보기" 탭이 호출하는 진입점 — 실행부터 파싱까지 한 번에. */
export function previewFromScript(scriptText) {
    const { wvParam, logs, error } = runScriptForWvParam(scriptText);
    if (error) return { error, wvParam: '', screen: null, logs };
    return { error: null, wvParam, screen: buildMockScreen(wvParam), logs };
}
