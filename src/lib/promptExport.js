import { readPropertyValue } from './nodeProperties.js';
import { scanProjectPages } from './projectScan.js';

/**
 * "음성재생블록"을 노드 타입 이름으로 하드코딩하지 않고, meta.json에서 AudioData
 * 라는 프로퍼티를 가진 노드 타입인지로 판별한다 — PromptNode 등 6종이 지금
 * 여기 해당하고(직접 확인), 나중에 비슷한 타입이 meta.json에 추가돼도 코드
 * 수정 없이 자동으로 잡힌다.
 */
export function isPromptLikeNode(nodeDef) {
    return nodeDef?.properties?.some((p) => p.name === 'AudioData') ?? false;
}

function findAudioDataProp(nodeDef) {
    return nodeDef?.properties?.find((p) => p.name === 'AudioData') ?? null;
}

function extractPromptRowsFromDiagram(diagram, meta, pageLabel) {
    const rows = [];
    for (const c of diagram.components.values()) {
        if (typeof c.metaName !== 'string') continue; // Link/Memo 등은 metaName이 없음 — Block만 대상.
        const nodeDef = meta?.nodes?.[c.metaName];
        const audioProp = findAudioDataProp(nodeDef);
        if (!audioProp) continue;
        rows.push({
            page: pageLabel,
            blockId: c.id,
            caption: c.caption ?? '',
            metaName: c.metaName,
            audioData: readPropertyValue(c.userData, audioProp) ?? '',
            comment: c.comment ?? '',
        });
    }
    return rows;
}

/**
 * project.pages 전체를 순서대로 훑어서 AudioData 프로퍼티를 가진 블록을 다 뽑는다.
 * @returns {{ rows: object[], skippedByPage: {page:string, types:string[]}[], failedPages: {page:string, message:string}[] }}
 */
export async function extractPromptRowsFromProject(project, meta) {
    const allRows = [];
    const { skippedByPage, failedPages } = await scanProjectPages(project, meta, (diagram, page) => {
        allRows.push(...extractPromptRowsFromDiagram(diagram, meta, page.tag || page.include));
    });
    return { rows: allRows, skippedByPage, failedPages };
}

function csvEscape(value) {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/** Excel(Windows)에서 한글이 안 깨지려면 파일 맨 앞에 UTF-8 BOM이 필요하다. */
export function buildPromptCsv(rows) {
    const header = ['페이지', '블록ID', '캡션', 'AudioData(멘트명)', '설명(멘트내용)'];
    const lines = [header.map(csvEscape).join(',')];
    for (const row of rows) {
        lines.push([row.page, row.blockId, row.caption, row.audioData, row.comment].map(csvEscape).join(','));
    }
    const BOM = String.fromCharCode(0xfeff);
    return BOM + lines.join('\r\n');
}
