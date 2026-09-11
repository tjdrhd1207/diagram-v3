import { findMatchingClose, findCaseBoundaries, findTopLevelBreakEnd, splitTopLevel } from './mciCaseBuilder.js';

const EXPECTED_HEADER_ARGS = 5;

/**
 * MCI 케이스 스위치를 표(mciCaseBuilder.js)로 만들지 않고, 지금 스크립트
 * 원문을 그대로 훑어서 흔한 실수 세 가지만 잡아낸다:
 *   - 같은 case 값이 중복 선언됨(뒤엣것이 이기고 앞은 죽은 코드가 됨)
 *   - break;가 없어서 다음 case로 그대로 흘러 들어감(fallthrough)
 *   - user.makeMCIHeader(...) 호출 인자 개수가 5개가 아님
 *
 * 이 세 가지는 case 하나하나의 payload 구조를 몰라도 검사할 수 있어서,
 * mciCaseBuilder.js가 'raw'로 분류해 손대지 않는 케이스까지도 전부 검사
 * 대상이 된다.
 */
export function lintMciScript(scriptText) {
    const switchMatch = /switch\s*\(\s*rcveSrvcId\s*\)\s*\{/.exec(scriptText);
    if (!switchMatch) return [];

    const openBraceIndex = switchMatch.index + switchMatch[0].length - 1;
    const closeBraceIndex = findMatchingClose(scriptText, openBraceIndex);
    if (closeBraceIndex === -1) return [];

    const body = scriptText.slice(openBraceIndex + 1, closeBraceIndex);
    const boundaries = findCaseBoundaries(body);

    const issues = [];
    const seenAt = new Map(); // serviceId -> 처음 발견된 case 순번(1-based)
    let caseOrdinal = 0;

    for (let idx = 0; idx < boundaries.length; idx++) {
        const b = boundaries[idx];
        if (b.kind !== 'case') continue;
        caseOrdinal++;

        if (seenAt.has(b.value)) {
            issues.push({
                type: 'duplicate-case',
                serviceId: b.value,
                message: `case '${b.value}'이(가) ${seenAt.get(b.value)}번째와 ${caseOrdinal}번째에 중복 선언되어 있습니다 — 뒤엣것만 실행되고 앞은 죽은 코드가 됩니다.`,
            });
        } else {
            seenAt.set(b.value, caseOrdinal);
        }

        const nextIndex = idx + 1 < boundaries.length ? boundaries[idx + 1].index : body.length;
        const afterCase = body.slice(b.matchEnd, nextIndex);
        const breakEnd = findTopLevelBreakEnd(afterCase);
        if (breakEnd === -1) {
            issues.push({
                type: 'missing-break',
                serviceId: b.value,
                message: `case '${b.value}'에 break;가 없습니다 — 다음 case로 그대로 흘러 들어갈 수 있습니다.`,
            });
        }

        const caseBody = breakEnd === -1 ? afterCase : afterCase.slice(0, breakEnd);
        for (const headerIssue of lintHeaderCalls(caseBody, b.value)) {
            issues.push(headerIssue);
        }
    }

    return issues;
}

function lintHeaderCalls(caseBody, serviceId) {
    const issues = [];
    const callRe = /user\.makeMCIHeader\s*\(/g;
    let m;
    while ((m = callRe.exec(caseBody))) {
        const openIndex = m.index + m[0].length - 1;
        const closeIndex = findMatchingClose(caseBody, openIndex);
        if (closeIndex === -1) continue; // 괄호가 안 닫힘 — 문법 자체가 깨진 경우, 다른 검사에서 이미 문제로 드러남.
        const argsText = caseBody.slice(openIndex + 1, closeIndex);
        const args = argsText.trim().length === 0 ? [] : splitTopLevel(argsText);
        if (args.length !== EXPECTED_HEADER_ARGS) {
            issues.push({
                type: 'header-arg-count',
                serviceId,
                message: `case '${serviceId}'의 makeMCIHeader 호출 인자가 ${args.length}개입니다(보통 ${EXPECTED_HEADER_ARGS}개: 고유ID, rcveSrvcId, 'IVR', 시스템코드, 'N').`,
            });
        }
    }
    return issues;
}
