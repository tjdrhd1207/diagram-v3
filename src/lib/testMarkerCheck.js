/**
 * 스크립트 편집기(ScriptEditorModal)로 여는 JS 프로퍼티(ScriptNode의 Script,
 * CallPageNode/GotoPageNode/GotoScenarioNode의 PreScript)에 테스트용으로 남겨둔
 * 코드가 있으면, 나중에 만들 "빌드" 기능에서 경고로 띄우기 위한 마커 규격과
 * 스캔 함수. 지금은 실제 빌드 파이프라인이 없어서 "저장"에 임시로 걸어두지만,
 * 빌드 기능이 생기면 그쪽 체크로 옮기면 된다.
 *
 * 마커 규격: 스크립트 어디든 한 줄 주석으로 `@test`를 남기면 그 프로퍼티 전체가
 * "테스트 코드 포함"으로 표시된다 (예: `// @test`, `//@test 배포 전 제거`,
 * `// @ test`처럼 @ 뒤에 띄어쓰기가 들어가도 매치되도록 관대하게 잡는다 —
 * 사람이 직접 치는 주석이라 "@"랑 "test" 사이에 공백이 들어가는 건 자연스러운
 * 실수라서, 여기서 막히면 마커 자체가 무용지물이 된다).
 * 구간을 정확히 표시할 필요는 없다 — 경고는 "이 블록의 스크립트 에디터를 열어서
 * 확인하라"는 용도라, 있는지 없는지만 알면 충분하다.
 */

import { readPropertyValue } from './nodeProperties.js';

export const TEST_MARKER_REGEX = /\/\/\s*@\s*test\b/i;

/**
 * @param {Diagram} diagram
 * @param {object} meta
 * @returns {{ blockId: string, label: string, propertyLabel: string }[]}
 */
export function findTestMarkedBlocks(diagram, meta) {
    if (!diagram) return [];
    const results = [];
    for (const component of diagram.components.values()) {
        if (component.type !== 'B') continue;
        const nodeDef = meta?.nodes?.[component.metaName];
        const scriptProps = nodeDef?.properties?.filter((p) => p.customEditorTypeName === 'ScriptEditor') ?? [];
        for (const prop of scriptProps) {
            const value = readPropertyValue(component.userData, prop);
            if (value && TEST_MARKER_REGEX.test(value)) {
                results.push({
                    blockId: component.id,
                    label: component.caption || nodeDef?.displayName || component.metaName,
                    propertyLabel: prop.displayName || prop.sourceName,
                });
            }
        }
    }
    return results;
}
