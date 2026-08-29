/**
 * 캔버스 블록의 아이콘 배지(사각 색 배지) on/off — 리본 "보기" 탭의 개인 UI
 * 취향이라, 즐겨찾기/스크립트 모달 크기와 같은 이유로 시나리오 .xml이 아니라
 * localStorage에 저장한다.
 */

const STORAGE_KEY = 'diagram.showIconBadges';

export function getIconBadgesVisible() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return true; // 기본값: 지금까지처럼 배지 표시
        return raw === '1';
    } catch {
        return true;
    }
}

export function setIconBadgesVisible(visible) {
    try {
        localStorage.setItem(STORAGE_KEY, visible ? '1' : '0');
    } catch {
        // 저장 실패해도(용량 초과, 프라이빗 모드 등) 이번 세션 동안은 그대로 동작.
    }
}
