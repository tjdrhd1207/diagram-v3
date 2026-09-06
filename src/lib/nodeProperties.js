/**
 * 대부분의 프로퍼티는 userData.attr(buildName)로 그냥 속성이지만, designer.meta.json을
 * 전수 조사해보니 buildDataType이 두 가지 더 있다(실제 디자이너 파일 대조로 확정 —
 * designerXml.js의 파일 상단 주석 참고):
 * - 'CData': 값이 속성이 아니라 buildName 이름의 자식 엘리먼트 텍스트로 들어간다
 *   (예: ScriptNode의 Script → <javascript><source>...</source></javascript>).
 * - 'XmlChild': 원래 구조화된 서브트리라 텍스트 입력 하나로 안전하게 다시 쓸 방법이
 *   없다 — v1은 읽기만 지원(문자열로 보여주기), 쓰기는 no-op.
 * 이걸 안 챙기면 Script류 프로퍼티는 항상 attr()이 null만 반환해서(값이 아예 속성이
 * 아니므로) 에디터가 늘 빈 채로 보이고, 저장도 조용히 무시된다.
 *
 * PropertyPanel(편집)과 promptExport(멘트 목록 추출) 양쪽에서 같은 방식으로
 * 값을 읽어야 하므로 공용 lib로 뺐다.
 */
export function readPropertyValue(userData, prop) {
    if (!userData) return null;
    if (prop.buildDataType === 'CData' || prop.buildDataType === 'XmlChild') {
        const child = userData.child(prop.buildName);
        return child ? child.value() : null;
    }
    return userData.attr(prop.buildName);
}

/**
 * GotoPageNode/CallPageNode/CatchNode/DiagnoseNode 등 "다른 블록(과 페이지)을
 * 가리키는" 노드 타입은 meta.json에서 isTargetPage/isTargetBlock 플래그가 붙은
 * 프로퍼티 쌍으로 식별할 수 있다 — 노드 타입 이름을 하드코딩하지 않고 이 두
 * 플래그를 다 가진 노드인지로 판별한다(둘 다 있는 이름 비슷한 GotoScenarioNode는
 * 두 플래그가 모두 false라 여기 안 걸린다 — 다른 프로젝트로 넘어가는 것이라
 * "지금 프로젝트 안에서 이동"할 대상이 아니기 때문).
 */
export function findTargetPageProp(nodeDef) {
    return nodeDef?.properties?.find((p) => p.isTargetPage) ?? null;
}

export function findTargetBlockProp(nodeDef) {
    return nodeDef?.properties?.find((p) => p.isTargetBlock) ?? null;
}

export function writePropertyValue(userData, prop, value) {
    if (prop.buildDataType === 'CData') {
        const child = userData.child(prop.buildName) ?? userData.appendChild(prop.buildName);
        child.value(value);
        return;
    }
    if (prop.buildDataType === 'XmlChild') {
        // v1 범위 밖 — 구조화된 서브트리를 텍스트 하나로 되돌려 쓰지 않는다.
        return;
    }
    userData.attr(prop.buildName, value);
}
