/**
 * 리본 "삽입" 탭의 즐겨찾기 — 사용 빈도를 자동으로 재는 게 아니라, 사용자가
 * "+"로 직접 등록하고 "×"로 직접 빼는 수동 핀 고정 목록이다(사용자 확인).
 * 스크립트 모달 크기 기억과 같은 이유로 localStorage에 저장 — 시나리오 파일과는
 * 무관한 개인 UI 습관이라 .xml에는 안 들어간다.
 */

const STORAGE_KEY = 'ribbon.insertFavorites';
export const MAX_FAVORITES = 8;

export function getFavorites() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
        return [];
    }
}

function saveFavorites(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // 저장 실패해도(용량 초과, 프라이빗 모드 등) 이번 세션 동안은 그대로 동작.
    }
}

/**
 * @returns {{ ok: true, list: string[] } | { ok: false, reason: 'full' | 'duplicate' }}
 */
export function addFavorite(nodeName) {
    const list = getFavorites();
    if (list.includes(nodeName)) return { ok: false, reason: 'duplicate' };
    if (list.length >= MAX_FAVORITES) return { ok: false, reason: 'full' };
    const next = [...list, nodeName];
    saveFavorites(next);
    return { ok: true, list: next };
}

export function removeFavorite(nodeName) {
    const next = getFavorites().filter((n) => n !== nodeName);
    saveFavorites(next);
    return next;
}
