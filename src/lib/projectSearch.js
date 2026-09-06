import { readPropertyValue } from './nodeProperties.js';
import { scanProjectPages } from './projectScan.js';

function matchesQuery(value, queryLower) {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(queryLower);
}

/** 블록 하나에서 캡션/설명(comment)/meta에 정의된 모든 프로퍼티 값까지 다 뒤진다. */
function collectBlockMatches(block, nodeDef, queryLower) {
    const matches = [];
    if (matchesQuery(block.caption, queryLower)) {
        matches.push({ field: '텍스트', value: block.caption });
    }
    if (matchesQuery(block.comment, queryLower)) {
        matches.push({ field: '설명', value: block.comment });
    }
    for (const prop of nodeDef?.properties ?? []) {
        const value = readPropertyValue(block.userData, prop);
        if (matchesQuery(value, queryLower)) {
            matches.push({ field: prop.displayName || prop.name, value });
        }
    }
    return matches;
}

function scanDiagramForQuery(diagram, meta, queryLower, page) {
    const results = [];
    for (const c of diagram.components.values()) {
        if (typeof c.metaName !== 'string') continue; // Block만 대상.
        const nodeDef = meta?.nodes?.[c.metaName];
        const matches = collectBlockMatches(c, nodeDef, queryLower);
        if (matches.length === 0) continue;
        results.push({
            pageInclude: page.include,
            pageLabel: page.tag || page.include,
            blockId: c.id,
            caption: c.caption ?? '',
            metaName: c.metaName,
            matches,
        });
    }
    return results;
}

/**
 * 프로젝트 전체(모든 페이지)에서 query를 검색한다. 지금 화면에 열려있는
 * 페이지는 디스크 파일이 아니라 그 라이브 diagram으로 검색해서, 저장하지
 * 않은 변경사항도 검색에 잡히게 한다 — 나머지 페이지는 디스크 파일을 읽어서
 * 검색한다.
 *
 * @param {string} query
 * @param {object} project
 * @param {object} meta
 * @param {object|null} liveDiagram 지금 열려있는 캔버스의 Diagram 인스턴스(없으면 null)
 * @param {string|null} livePageInclude 그 캔버스가 어느 page.include에 해당하는지
 * @returns {Promise<{ results: object[], skippedByPage: object[], failedPages: object[] }>}
 */
export async function searchProject(query, project, meta, liveDiagram, livePageInclude) {
    const queryLower = query.trim().toLowerCase();
    if (!queryLower || !project) return { results: [], skippedByPage: [], failedPages: [] };

    const results = [];

    if (liveDiagram && livePageInclude) {
        const livePage = project.pages.find((p) => p.include === livePageInclude);
        if (livePage) {
            results.push(...scanDiagramForQuery(liveDiagram, meta, queryLower, livePage));
        }
    }

    const { skippedByPage, failedPages } = await scanProjectPages(
        project,
        meta,
        (diagram, page) => {
            results.push(...scanDiagramForQuery(diagram, meta, queryLower, page));
        },
        { skip: (page) => page.include === livePageInclude }
    );

    return { results, skippedByPage, failedPages };
}
