/**
 * "MCI 케이스 빌더" — ScriptNode 안에서 흔히 짜는
 *   switch (rcveSrvcId) {
 *     case 'X' :
 *       header = user.makeMCIHeader('HLIIVR00003', rcveSrvcId, 'IVR', 'ICS', 'N');
 *       payload = {"custId":app.H_Input_01, ...};
 *       break;
 *     ...
 *     default:
 *       util.print("...");
 *   }
 * 패턴을, case 하나하나를 표(리스트)로 보여주고 편집할 수 있게 해준다.
 *
 * payload는 실제로 세 가지 복잡도가 섞여 있다(실제 스크립트로 확인):
 *   - 'flat'  : 평평한 객체 { "k1": expr1, "k2": expr2, ... }
 *   - 'array' : 키 하나가 배열 하나(원소 1개, 그 원소도 평평한 객체)를 감싼 형태
 *               { "listKey": [ { "k1": expr1, ... } ] }
 *   - 'raw'   : 그 외 전부(조건분기로 payload가 갈리거나, JSON.parse/split 같은
 *               전처리가 섞인 경우) — 원문을 그대로 보존하고 표로는 편집하지
 *               않는다. 억지로 파싱하다 실제 로직을 깨뜨리는 것보다 안전하다.
 */

function createEmptyField() {
    return { name: '', expr: '' };
}

export function createEmptyCase() {
    return {
        kind: 'flat',
        serviceId: '',
        comment: '',
        headerId: '',
        systemCode: '',
        listKey: '',
        fields: [createEmptyField()],
        rawText: '',
    };
}

// 문자열/주석을 건너뛰면서 괄호류 깊이를 세는 공용 스캐너. case/default 경계나
// 매칭되는 닫는 괄호를 찾을 때 전부 이걸 통해서, 문자열 안의 '{' 같은 것 때문에
// 깊이 계산이 틀어지지 않게 한다.
function skipStringOrComment(text, i) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
        let j = i + 2;
        while (j < text.length && text[j] !== '\n') j++;
        return j;
    }
    if (ch === '/' && text[i + 1] === '*') {
        let j = i + 2;
        while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j++;
        return Math.min(j + 2, text.length);
    }
    if (ch === "'" || ch === '"') {
        const quote = ch;
        let j = i + 1;
        while (j < text.length && text[j] !== quote) {
            if (text[j] === '\\') j++;
            j++;
        }
        return j + 1;
    }
    return -1;
}

const OPEN = { '{': '}', '[': ']', '(': ')' };
const CLOSE = new Set(['}', ']', ')']);

/** openIndex가 가리키는 여는 괄호에 대응하는 닫는 괄호의 인덱스를 찾는다. */
export function findMatchingClose(text, openIndex) {
    const stack = [OPEN[text[openIndex]]];
    let i = openIndex + 1;
    while (i < text.length && stack.length > 0) {
        const skip = skipStringOrComment(text, i);
        if (skip !== -1) {
            i = skip;
            continue;
        }
        const ch = text[i];
        if (OPEN[ch]) {
            stack.push(OPEN[ch]);
        } else if (CLOSE.has(ch)) {
            if (ch !== stack[stack.length - 1]) return -1; // 짝이 안 맞음 — 형식이 예상과 다름.
            stack.pop();
        }
        i++;
    }
    return stack.length === 0 ? i - 1 : -1;
}

/** depth 0(최상위)에 있는 'case ...:' / 'default:' 위치들을 찾는다. */
export function findCaseBoundaries(body) {
    const boundaries = [];
    let depth = 0;
    let i = 0;
    while (i < body.length) {
        const skip = skipStringOrComment(body, i);
        if (skip !== -1) {
            i = skip;
            continue;
        }
        const ch = body[i];
        if (OPEN[ch]) {
            depth++;
            i++;
            continue;
        }
        if (CLOSE.has(ch)) {
            depth--;
            i++;
            continue;
        }
        if (depth === 0) {
            const caseMatch = /^case\s+'((?:[^'\\]|\\.)*)'\s*:/.exec(body.slice(i));
            if (caseMatch) {
                boundaries.push({ index: i, kind: 'case', value: caseMatch[1], matchEnd: i + caseMatch[0].length });
                i += caseMatch[0].length;
                continue;
            }
            const defaultMatch = /^default\s*:/.exec(body.slice(i));
            if (defaultMatch) {
                boundaries.push({ index: i, kind: 'default', matchEnd: i + defaultMatch[0].length });
                i += defaultMatch[0].length;
                continue;
            }
        }
        i++;
    }
    return boundaries;
}

/** depth 0 기준으로 첫 'break ;'의 끝 위치(세미콜론 다음)를 찾는다. 없으면 -1. */
export function findTopLevelBreakEnd(text) {
    let depth = 0;
    let i = 0;
    while (i < text.length) {
        const skip = skipStringOrComment(text, i);
        if (skip !== -1) {
            i = skip;
            continue;
        }
        const ch = text[i];
        if (OPEN[ch]) {
            depth++;
            i++;
            continue;
        }
        if (CLOSE.has(ch)) {
            depth--;
            i++;
            continue;
        }
        if (depth === 0) {
            const m = /^break\s*;/.exec(text.slice(i));
            if (m) return i + m[0].length;
        }
        i++;
    }
    return -1;
}

/** boundaryIndex 앞의 연속된 '// ...' 주석 줄들을 모아 하나의 설명 문자열로 합친다. */
function extractPrecedingComment(fullText, boundaryIndex) {
    let end = boundaryIndex;
    while (end > 0 && /\s/.test(fullText[end - 1])) end--;
    const lines = [];
    while (true) {
        let lineStart = fullText.lastIndexOf('\n', end - 1) + 1;
        const line = fullText.slice(lineStart, end).trim();
        if (!/^\/\//.test(line)) break;
        lines.unshift(line.replace(/^\/\/\s?/, ''));
        end = lineStart;
        while (end > 0 && /\s/.test(fullText[end - 1])) end--;
    }
    return lines.join(' ');
}

/** 최상위 콤마 기준으로 나눈다(문자열/괄호 안의 콤마는 무시). */
export function splitTopLevel(text) {
    const parts = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    while (i < text.length) {
        const skip = skipStringOrComment(text, i);
        if (skip !== -1) {
            i = skip;
            continue;
        }
        const ch = text[i];
        if (OPEN[ch]) depth++;
        else if (CLOSE.has(ch)) depth--;
        else if (ch === ',' && depth === 0) {
            parts.push(text.slice(start, i));
            i++;
            start = i;
            continue;
        }
        i++;
    }
    parts.push(text.slice(start));
    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** "key": expr 형태의 필드 목록으로 파싱. 하나라도 형태가 안 맞으면 null. */
function parseFlatFields(objInner) {
    const segments = splitTopLevel(objInner);
    const fields = [];
    for (const seg of segments) {
        const m = /^"([^"]+)"\s*:\s*([\s\S]+)$/.exec(seg);
        if (!m) return null;
        fields.push({ name: m[1], expr: m[2].trim() });
    }
    return fields;
}

/** payload 객체 안쪽 텍스트(중괄호 제외)를 flat/array로 분류해 파싱을 시도한다. */
function parsePayloadBody(objInner) {
    const flatFields = parseFlatFields(objInner);
    if (flatFields && flatFields.every((f) => !/^[[{]/.test(f.expr))) {
        return { kind: 'flat', fields: flatFields };
    }
    // 배열-하나-감싼 형태: 필드가 정확히 1개고, 그 값이 "[ { ... } ]" 전체.
    if (flatFields && flatFields.length === 1) {
        const expr = flatFields[0].expr;
        const arrMatch = /^\[\s*(\{[\s\S]*\})\s*\]$/.exec(expr);
        if (arrMatch) {
            const innerObjMatch = /^\{([\s\S]*)\}$/.exec(arrMatch[1]);
            if (innerObjMatch) {
                const innerFields = parseFlatFields(innerObjMatch[1]);
                if (innerFields && innerFields.every((f) => !/^[[{]/.test(f.expr))) {
                    return { kind: 'array', listKey: flatFields[0].name, fields: innerFields };
                }
            }
        }
    }
    return null;
}

/**
 * 스크립트 텍스트에서 `switch (rcveSrvcId) { ... }` 블록을 찾아 case 목록으로
 * 파싱한다. 못 찾거나 형식이 전혀 다르면 null.
 */
export function parseMciSwitch(scriptText) {
    const headerMatch = /switch\s*\(\s*rcveSrvcId\s*\)\s*\{/.exec(scriptText);
    if (!headerMatch) return null;
    const openBraceIndex = headerMatch.index + headerMatch[0].length - 1;
    const closeBraceIndex = findMatchingClose(scriptText, openBraceIndex);
    if (closeBraceIndex === -1) return null;

    const body = scriptText.slice(openBraceIndex + 1, closeBraceIndex);
    const boundaries = findCaseBoundaries(body);
    if (boundaries.length === 0) return null;

    const cases = [];
    let defaultText = 'default:\n        util.print("해당하는 인터페이스ID가 없습니다");';

    for (let idx = 0; idx < boundaries.length; idx++) {
        const b = boundaries[idx];
        const nextIndex = idx + 1 < boundaries.length ? boundaries[idx + 1].index : body.length;

        if (b.kind === 'default') {
            defaultText = body.slice(b.index, nextIndex).trim();
            continue;
        }

        const comment = extractPrecedingComment(body, b.index);
        const afterCase = body.slice(b.matchEnd, nextIndex);
        const breakEnd = findTopLevelBreakEnd(afterCase);
        // 주석은 c.comment로 따로 들고 있다가 생성 시(buildCaseText) 일관되게
        // 붙인다 — rawText 자체엔 case 본문만 담아서 이중으로 붙는 걸 막는다.
        const rawCaseText = `case '${b.value}' :${afterCase.slice(
            0,
            breakEnd === -1 ? afterCase.length : breakEnd
        )}`;

        if (breakEnd === -1) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }

        const caseBody = afterCase.slice(0, breakEnd).trim();
        const headerRe =
            /^header\s*=\s*user\.makeMCIHeader\(\s*'([^']*)'\s*,\s*rcveSrvcId\s*,\s*'IVR'\s*,\s*'([^']*)'\s*,\s*'N'\s*\)\s*;/;
        const headerMatch2 = headerRe.exec(caseBody);
        if (!headerMatch2) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }

        const rest = caseBody.slice(headerMatch2[0].length).trim();
        const payloadAssignRe = /^payload\s*=\s*(\{)/;
        const payloadStartMatch = payloadAssignRe.exec(rest);
        if (!payloadStartMatch) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }
        const objOpenIndex = payloadStartMatch.index + payloadStartMatch[0].length - 1;
        const objCloseIndex = findMatchingClose(rest, objOpenIndex);
        if (objCloseIndex === -1) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }
        const tail = rest.slice(objCloseIndex + 1).trim();
        if (!/^;\s*break\s*;?$/.test(tail)) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }

        const objInner = rest.slice(objOpenIndex + 1, objCloseIndex);
        const parsed = parsePayloadBody(objInner);
        if (!parsed) {
            cases.push({ kind: 'raw', serviceId: b.value, comment, rawText: rawCaseText.trim() });
            continue;
        }

        cases.push({
            kind: parsed.kind,
            serviceId: b.value,
            comment,
            headerId: headerMatch2[1],
            systemCode: headerMatch2[2],
            listKey: parsed.listKey ?? '',
            fields: parsed.fields.length > 0 ? parsed.fields : [createEmptyField()],
            rawText: '',
        });
    }

    return { cases, defaultText };
}

function buildFieldsObjectText(fields) {
    return `{${fields.map((f) => `"${f.name}":${f.expr}`).join(', ')}}`;
}

function buildCaseText(c) {
    const commentLine = c.comment ? `\t// ${c.comment}\n` : '';
    if (c.kind === 'raw') {
        return `${commentLine}${c.rawText}`;
    }
    const payloadText =
        c.kind === 'array'
            ? `{"${c.listKey}":[${buildFieldsObjectText(c.fields)}]}`
            : buildFieldsObjectText(c.fields);
    return (
        `${commentLine}\tcase '${c.serviceId}' :\n` +
        `\t\theader = user.makeMCIHeader('${c.headerId}', rcveSrvcId, 'IVR', '${c.systemCode}', 'N');\n` +
        `\t\tpayload = ${payloadText};\n` +
        `\t\tbreak;`
    );
}

/** case 목록 → 실행 가능한 switch(rcveSrvcId){...} 텍스트 전체. */
export function buildMciSwitchText(cases, defaultText) {
    const body = cases.map(buildCaseText).join('\n');
    const fallback = defaultText || 'default:\n\t\tutil.print("해당하는 인터페이스ID가 없습니다");';
    return `switch(rcveSrvcId) {\n${body}\n\t${fallback}\n}`;
}

function csvEscape(value) {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function fieldsSummary(c) {
    if (c.kind === 'raw') return '';
    const inner = c.fields.map((f) => `${f.name}=${f.expr}`).join('; ');
    return c.kind === 'array' ? `${c.listKey}[${inner}]` : inner;
}

/**
 * 지금 빌더 목록(파싱/편집된 case들)을 CSV로 뽑는다 — 프로젝트 전체를 다시
 * 훑지 않고, 지금 이 스크립트 하나의 목록만 그대로 내보낸다. Excel(Windows)
 * 한글 깨짐 방지용 UTF-8 BOM 포함.
 */
export function buildMciCasesCsv(cases) {
    const header = ['서비스ID', '설명', 'payload 종류', '고유ID', '시스템코드', '필드'];
    const lines = [header.map(csvEscape).join(',')];
    for (const c of cases) {
        lines.push(
            [c.serviceId, c.comment, KIND_LABEL_KO[c.kind] ?? c.kind, c.headerId ?? '', c.systemCode ?? '', fieldsSummary(c)]
                .map(csvEscape)
                .join(',')
        );
    }
    const BOM = String.fromCharCode(0xfeff);
    return BOM + lines.join('\r\n');
}

const KIND_LABEL_KO = { flat: '평평한 객체', array: '배열(원소 1개)', raw: '원문 보존' };
