import { NodeWrapper } from './diagram-library.js';

/**
 * as-is ScenarioDesigner가 실제로 저장하는 페이지 편집 원본(.xml) 포맷을, 우리
 * Diagram.deserialize()가 이해하는 <scenario><block>...</block></scenario> XML로
 * 변환한다. 실제 샘플(123.xml, 123.dxml, designer.meta.json)을 직접 대조해서 확정한
 * 매핑 규칙을 그대로 구현한 것 — diagram-library.js는 여기서도 전혀 건드리지 않는다.
 *
 * 디자이너 XML 구조 (실제 파일로 확인):
 *   <Diagram Version="14">
 *     <Nodes>
 *       <Node Id="4" NodeType="IfNode">
 *         <Bounds>90.5, 181.9, 75, 70</Bounds>              x, y, w, h
 *         <Text>조건 분기</Text>                              desc
 *         <CustomProperties>
 *           <Sequence>00000211</Sequence>                    우리 block id
 *           <Comment></Comment>
 *           <Condition>app.ivr_audio_data != "";</Condition> 타입별 실제 값들
 *         </CustomProperties>
 *       </Node>
 *     </Nodes>
 *     <Links>
 *       <Link>
 *         <Text>true</Text>
 *         <Origin Id="4".../><OriginAnchor>3</OriginAnchor>
 *         <Destination Id="3".../><DestinationAnchor>1</DestinationAnchor>
 *       </Link>
 *     </Links>
 *   </Diagram>
 *
 * - NodeType이 그대로 meta-name (역매칭 불필요, buildTag 기반이던 .dxml보다 간단).
 * - <Bounds>가 그대로 x,y,w,h — 자동배치 필요 없음.
 * - Link의 Origin/Destination은 <Node>의 파일 내부 임시 Id(0,1,2,...)를 참조하므로,
 *   먼저 전체 Node를 스캔해 내부 Id -> Sequence(우리 block id) 맵을 만들고 치환한다.
 * - <Links>는 노드 타입과 무관하게 실제 존재하는 모든 분기(choice)를 그대로 나열한다 —
 *   SwitchNode/PromptASRNode 같은 "동적 분기" 타입도 예외가 아니다(123.dxml의
 *   <switch> 블록을 직접 확인: 다른 노드와 동일한 평범한 <choice> 형제 구조였다).
 *   그래서 모든 노드 타입을 완전히 동일한 알고리즘으로 처리할 수 있다.
 * - OriginAnchor/DestinationAnchor(0=왼쪽, 1=위, 2=오른쪽, 3=아래)는 diagram-library.js의
 *   convertAnchorPosition이 정확히 같은 숫자 체계를 쓰므로, choice의 svg-origin-anchor/
 *   svg-dest-anchor 속성에 변환 없이 그대로 옮긴다. 처음엔 이 값을 안 옮겼는데, 그러면
 *   Link.deserialize()가 항상 convertAnchorPosition.default(오른쪽)로 폴백해서 모든
 *   링크가 양쪽 다 오른쪽 anchor에만 몰려 붙는 문제가 있었다(실제로 겪고 확인한 버그).
 *
 * 프로퍼티 매핑 (designer.meta.json 전수 조사로 확정된 buildDataType 3가지 케이스):
 * - 기본(필드 없음): buildTag 엘리먼트의 속성으로 씀.
 * - 'CData': buildTag 엘리먼트 밑에 자식 엘리먼트 + 텍스트로 씀
 *   (예: ScriptNode의 Script -> <javascript><source>...</source></javascript>).
 *   진짜 CDATA 섹션일 필요는 없다 — NodeWrapper.toString()이 직렬화할 때 특수문자를
 *   엔티티 이스케이프해주므로 일반 텍스트 노드로도 왕복이 정확히 보존된다.
 * - 'XmlChild': 소스의 원본 서브트리를 그대로 복제해서 태그 이름만 buildName으로
 *   바꿔 자식으로 붙인다(예: StartNode의 Variables -> <variables>...</variables>).
 * - buildName이 빈 문자열인 프로퍼티는 건너뛴다 — 저장 대상이 아니라는 뜻
 *   (SwitchNode/PromptASRNode의 SwitchCase가 여기 해당: 실제 분기는 위 <Links>에서
 *   이미 나온다).
 * - buildScript(빌드 산출물 생성 전용 변환식)는 이 임포터(편집용 불러오기)에는
 *   적용하지 않는다 — 원본 값을 그대로 보존한다.
 *
 * 범위 밖: MemoNode 변환(블록/링크만 다룬다), GotoPageNode/CallPageNode가 다른 페이지를
 * 가리킬 때 그 페이지로 자동 이동, RawXML 프로퍼티 전용 편집 UI.
 */

/** 전체 DOM 파싱 없이 문자열 앞부분만 보고 디자이너 XML인지 빠르게 판별한다. */
export function looksLikeDesignerXml(xmlText) {
    const head = xmlText.slice(0, 500);
    return /<Diagram[\s>]/.test(head) && !/<scenario[\s>]/.test(head);
}

function directChildText(parentEl, tagName) {
    const child = Array.from(parentEl.children).find((el) => el.tagName === tagName);
    return child ? child.textContent : null;
}

function directChildElement(parentEl, tagName) {
    return Array.from(parentEl.children).find((el) => el.tagName === tagName) ?? null;
}

/**
 * @param {string} xmlText 디자이너 .xml 페이지 파일의 텍스트 내용
 * @param {object} meta designer.meta.json (또는 그 확장본)
 * @returns {{ xml: string, skippedNodeTypes: string[] }}
 */
export function convertDesignerXmlToScenarioXml(xmlText, meta) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) {
        throw new Error('디자이너 XML을 파싱하지 못했습니다 (형식이 아니거나 손상됨).');
    }

    const nodeEls = Array.from(doc.querySelectorAll('Diagram > Nodes > Node'));
    const linkEls = Array.from(doc.querySelectorAll('Diagram > Links > Link'));

    // 1단계: 모든 Node를 먼저 훑어서 "파일 내부 Id -> 실제 정보" 맵을 만든다. 링크가
    // 선언 순서와 무관하게 앞뒤 노드를 참조할 수 있어서, 블록을 만들기 전에 전체
    // 인덱스부터 완성해둬야 한다.
    const nodeById = new Map();
    for (const nodeEl of nodeEls) {
        const internalId = nodeEl.getAttribute('Id');
        const nodeType = nodeEl.getAttribute('NodeType');
        if (nodeType === 'MemoNode') continue; // 메모는 이번 범위 밖

        const customProps = directChildElement(nodeEl, 'CustomProperties');
        const sequence = customProps ? directChildText(customProps, 'Sequence') : null;
        if (!sequence) continue; // Sequence(우리 block id)가 없으면 실을 방법이 없음

        const boundsText = directChildText(nodeEl, 'Bounds') ?? '0,0,140,60';
        const [x, y, w, h] = boundsText.split(',').map((s) => s.trim());
        const text = directChildText(nodeEl, 'Text') ?? '';

        nodeById.set(internalId, { sequence, nodeType, x, y, w, h, text, customProps });
    }

    const skippedNodeTypes = new Set();
    const root = new NodeWrapper('scenario');
    const blockElBySequence = new Map();

    // 2단계: 블록 생성 + 프로퍼티 매핑.
    for (const info of nodeById.values()) {
        const { sequence, nodeType, x, y, w, h, text, customProps } = info;
        const nodeDef = meta?.nodes?.[nodeType];
        if (!nodeDef) {
            skippedNodeTypes.add(nodeType);
            continue;
        }

        const blockEl = root.appendChild('block');
        blockEl.attr('id', sequence);
        blockEl.attr('desc', text);
        blockEl.attr('meta-name', nodeType);
        blockElBySequence.set(sequence, blockEl);

        const svgEl = blockEl.appendChild('svg');
        svgEl.appendChild('bounds').value(`${x},${y},${w},${h}`);

        const buildTagEl = blockEl.appendChild(nodeDef.buildTag);
        for (const prop of nodeDef.properties ?? []) {
            if (!prop.buildName) continue; // 저장 대상 아님 (예: SwitchNode의 SwitchCase)
            const rawValue = customProps ? directChildText(customProps, prop.sourceName) : null;
            if (rawValue === null) continue;

            if (prop.buildDataType === 'CData') {
                buildTagEl.appendChild(prop.buildName).value(rawValue);
            } else if (prop.buildDataType === 'XmlChild') {
                const sourceEl = customProps ? directChildElement(customProps, prop.sourceName) : null;
                if (sourceEl) {
                    const clonedEl = buildTagEl.appendChild(prop.buildName);
                    for (const attr of Array.from(sourceEl.attributes)) {
                        clonedEl.attr(attr.name, attr.value);
                    }
                    for (const childNode of Array.from(sourceEl.childNodes)) {
                        clonedEl.appendNode(clonedEl.node.ownerDocument.importNode(childNode, true));
                    }
                }
            } else {
                buildTagEl.attr(prop.buildName, rawValue);
            }
        }
    }

    // 3단계: 링크. Origin/Destination의 파일 내부 Id를 1단계 맵으로 Sequence로 치환.
    for (const linkEl of linkEls) {
        const originId = linkEl.querySelector('Origin')?.getAttribute('Id');
        const destId = linkEl.querySelector('Destination')?.getAttribute('Id');
        const eventName = directChildText(linkEl, 'Text') ?? '';
        // 0=왼쪽, 1=위, 2=오른쪽, 3=아래 — diagram-library.js의 convertAnchorPosition이
        // 정확히 같은 숫자 체계를 쓰기 때문에 변환 없이 그대로 옮기면 된다. 이 값을
        // 안 옮기면 Link.deserialize()가 항상 convertAnchorPosition.default(오른쪽)로
        // 폴백해서 모든 링크가 오른쪽 anchor에만 몰려 붙는다(실제로 겪은 증상).
        const originAnchor = directChildText(linkEl, 'OriginAnchor');
        const destAnchor = directChildText(linkEl, 'DestinationAnchor');

        const originInfo = nodeById.get(originId);
        const destInfo = nodeById.get(destId);
        if (!originInfo || !destInfo) continue;

        const originBlockEl = blockElBySequence.get(originInfo.sequence);
        if (!originBlockEl) continue; // origin이 skippedNodeTypes에 걸린 경우

        const choiceEl = originBlockEl.appendChild('choice');
        choiceEl.attr('event', eventName);
        if (originAnchor !== null) choiceEl.attr('svg-origin-anchor', originAnchor);
        if (destAnchor !== null) choiceEl.attr('svg-dest-anchor', destAnchor);
        choiceEl.attr('target', destInfo.sequence);
    }

    return { xml: root.toString(), skippedNodeTypes: [...skippedNodeTypes] };
}
