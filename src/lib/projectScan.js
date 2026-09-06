import { Diagram } from './diagram-library.js';
import { looksLikeDesignerXml, convertDesignerXmlToScenarioXml } from './designerXml.js';

function readFileText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * project.pages를 순서대로 훑으면서, 페이지마다 숨겨진 임시 svg에 deserialize해서
 * onPage(diagram, page)를 호출한다. 화면에 실제로 보여줄 필요 없는 "읽기 전용
 * 스캔" 전용 로직 — 멘트 목록 추출(promptExport.js), 프로젝트 전체 검색
 * (projectSearch.js) 등 "지금 열려있지 않은 페이지들까지 다 훑어야 하는" 기능
 * 여럿이 공유한다.
 *
 * 임시 svg 하나를 재사용해도 안전한 이유: Diagram 생성자가 매번 그 svg의 기존
 * 자식 엘리먼트를 스스로 다 지워주기 때문(diagram-library.js 확인 완료).
 *
 * @param {object} project
 * @param {object} meta
 * @param {(diagram: object, page: object) => void} onPage 정상 파싱된 페이지마다 호출
 * @param {{ skip?: (page: object) => boolean }} [opts] skip이 true를 반환하는 페이지는
 *   아예 건너뛴다 — 예: 지금 화면에 열려있는 페이지는 디스크 파일이 아니라 라이브
 *   캔버스로 이미 따로 처리했을 때, 여기서 또 (구버전) 파일 내용으로 중복 처리하지
 *   않도록.
 * @returns {{ skippedByPage: {page:string, types:string[]}[], failedPages: {page:string, message:string}[] }}
 */
export async function scanProjectPages(project, meta, onPage, opts = {}) {
    const scratchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    scratchSvg.id = `project-scan-scratch-${Date.now()}`;
    scratchSvg.style.cssText = 'position:absolute; left:-99999px; top:-99999px; width:10px; height:10px;';
    document.body.appendChild(scratchSvg);

    const skippedByPage = [];
    const failedPages = [];

    try {
        for (const page of project.pages) {
            if (opts.skip?.(page)) continue;

            const file = project.files.get(page.include);
            if (!file) continue; // 폴더에서 못 찾은 페이지 — 목록에 이미 "파일 없음"으로 표시됨.

            const pageLabel = page.tag || page.include;
            let text;
            try {
                text = await readFileText(file);
            } catch (err) {
                failedPages.push({ page: pageLabel, message: err?.message ?? String(err) });
                continue;
            }

            let xml = text;
            if (looksLikeDesignerXml(text)) {
                try {
                    const converted = convertDesignerXmlToScenarioXml(text, meta);
                    xml = converted.xml;
                    if (converted.skippedNodeTypes.length > 0) {
                        skippedByPage.push({ page: pageLabel, types: converted.skippedNodeTypes });
                    }
                } catch (err) {
                    failedPages.push({ page: pageLabel, message: err?.message ?? String(err) });
                    continue;
                }
            }

            // 브라우저 DOMParser는 형식이 깨진 XML을 만나도 예외를 던지지 않고
            // <parsererror> 노드를 담은 문서를 그냥 반환한다 — 그대로 두면 블록이
            // 0개인 채로 조용히 넘어가 버린다(에러도 없고 결과도 없어서 원인을
            // 알 수 없음). 여기서 미리 확인해서 실패로 명확히 기록한다.
            const parseCheck = new DOMParser().parseFromString(xml, 'text/xml');
            if (parseCheck.querySelector('parsererror')) {
                failedPages.push({ page: pageLabel, message: 'XML 형식이 올바르지 않습니다.' });
                continue;
            }

            try {
                const diagram = Diagram.deserialize(`#${scratchSvg.id}`, meta, xml, {});
                onPage(diagram, page);
            } catch (err) {
                failedPages.push({ page: pageLabel, message: err?.message ?? String(err) });
            }
        }
    } finally {
        scratchSvg.remove();
    }

    return { skippedByPage, failedPages };
}
