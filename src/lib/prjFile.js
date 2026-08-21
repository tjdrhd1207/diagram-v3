/**
 * .prj 파일 파서 — as-is ScenarioDesigner의 "프로젝트" 파일. Diagram.serialize()가
 * 만드는 <scenario> XML과는 완전히 다른 포맷이다: .prj 자신은 다이어그램(블록/링크)을
 * 전혀 담지 않고, 그 대신
 *   - 프로젝트 전역 변수 목록 (VariableManager)
 *   - 프로젝트 공용 스크립트 (ScriptManager — util.* 별개로, 이 프로젝트에서만 쓰는
 *     user.* 함수들이 여기 정의돼 있음)
 *   - 빌드/다이어그램 설정 (ProjectProperty)
 *   - 그리고 실제 시나리오가 들어있는 개별 .xml "페이지" 파일들의 목록(<ItemGroup>의
 *     <Page Include="파일명.xml" Tag="메뉴이름" .../> 나열)
 * 만 갖고 있다. 각 페이지 .xml은 .prj와 같은 폴더에 있고, 내용 자체는 이미 우리
 * Diagram.deserialize()가 읽는 <scenario><block>...</block></scenario> 포맷 그대로다
 * (실제 123.prj 샘플로 직접 확인함).
 */

function textOf(el) {
    return el?.textContent ?? '';
}

function boolAttr(el, name) {
    return el?.getAttribute(name) === 'True';
}

/**
 * @param {string} xmlText .prj 파일의 텍스트 내용
 * @returns {{
 *   name: string,
 *   designerVersion: string,
 *   properties: Record<string, string>,
 *   variables: Array<{type: string, name: string, initial: string, description: string}>,
 *   embedScript: string,
 *   pages: Array<{include: string, tag: string, isStart: boolean, isEmbedded: boolean, lastOpened: boolean}>,
 * }}
 */
export function parsePrjXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) {
        throw new Error('.prj 파일을 파싱하지 못했습니다 (XML 형식이 아니거나 손상됨).');
    }

    const root = doc.documentElement;

    const properties = {};
    for (const el of root.querySelectorAll('ProjectProperty > PropertyItem')) {
        properties[el.getAttribute('Key')] = el.getAttribute('Value');
    }

    const variables = [...root.querySelectorAll('VariableManager Collection > VariableItem')].map((el) => ({
        type: el.getAttribute('Type') ?? '',
        name: el.getAttribute('Name') ?? '',
        initial: el.getAttribute('Initial') ?? '',
        description: el.getAttribute('Description') ?? '',
    }));

    const embedScript = textOf(root.querySelector('ScriptManager > EmbedScript'));

    const pages = [...root.querySelectorAll('ItemGroup > Page')].map((el) => ({
        include: el.getAttribute('Include') ?? '',
        tag: el.getAttribute('Tag') ?? '',
        isStart: boolAttr(el, 'IsStart'),
        isEmbedded: boolAttr(el, 'IsEmbedded'),
        lastOpened: boolAttr(el, 'LastOpened'),
    }));

    return {
        name: root.getAttribute('Name') ?? '',
        designerVersion: root.getAttribute('DesignerVersion') ?? '',
        properties,
        variables,
        embedScript,
        pages,
    };
}

/**
 * webkitdirectory로 통째로 선택한 폴더의 FileList에서 .prj 파일 하나를 찾는다.
 * 폴더 안에 .prj가 여러 개 있으면(드문 경우) 첫 번째 것을 쓴다.
 */
export function findPrjFile(fileList) {
    return [...fileList].find((f) => f.name.toLowerCase().endsWith('.prj')) ?? null;
}

/**
 * 같은 폴더 선택에서 딸려온 나머지 파일들을, .prj의 <Page Include="파일명">이 참조하는
 * "파일명"(경로 없이) 기준으로 바로 찾을 수 있도록 Map으로 만든다. webkitdirectory는
 * File.webkitRelativePath로 하위 폴더 구조까지 주지만, .prj의 Include 값은 항상
 * 순수 파일명이라 basename만 키로 쓴다 — 하위 폴더에 있어도 이름만 같으면 찾아진다.
 */
export function buildFileIndex(fileList) {
    const index = new Map();
    for (const file of fileList) {
        index.set(file.name, file);
    }
    return index;
}
