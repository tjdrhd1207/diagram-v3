/**
 * 삽입 탭 그룹(시나리오/음성/컨트롤/서비스)별 색상. 리본 메뉴와 캔버스에 새로
 * 놓이는 블록 양쪽에서 이 한 곳만 보고 같은 색을 쓴다.
 */
export const GROUP_COLORS = {
  시나리오: '#3b82f6', // blue
  음성: '#0d9488', // teal
  컨트롤: '#f97316', // orange
  서비스: '#a855f7', // purple
};

// meta.json에 group이 없거나 목록에 없는 새 그룹이 추가된 경우의 대체 색.
export const DEFAULT_GROUP_COLOR = '#9e9e9e';

export function colorForGroup(groupName) {
  return GROUP_COLORS[groupName] ?? DEFAULT_GROUP_COLOR;
}

function lightenHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const mix = (shift) => {
    const channel = (num >> shift) & 0xff;
    return Math.round(channel + (255 - channel) * amount);
  };
  return `#${[mix(16), mix(8), mix(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// CSS 커스텀 프로퍼티로 리본 그룹 컨테이너에 꽂아주기 위한 헬퍼.
// --group-color: 아이콘 배지처럼 진하게 쓸 색, --group-color-bg: 옅게 깐 배경색.
export function groupColorStyle(groupName) {
  const hex = colorForGroup(groupName);
  return {
    '--group-color': hex,
    '--group-color-bg': lightenHex(hex, 0.82),
  };
}

// diagram-library.js의 Block#setColor(bgColorKey, iconColorKey)는 이름으로
// diagram.options.colorPallete를 조회하는 방식이라, 커스텀 색을 쓰려면 먼저
// 이름을 붙여 그 팔레트에 등록해둬야 한다 (buildGroupColorPallete가 등록용,
// paletteKeyForGroup이 그 등록된 이름을 찾기 위한 조회용 — 항상 짝으로 쓴다).
export function paletteKeyForGroup(groupName, variant) {
  return `group-${groupName || 'default'}-${variant}`;
}

export function buildGroupColorPallete() {
  const pallete = {};
  const allGroups = { ...GROUP_COLORS, default: DEFAULT_GROUP_COLOR };
  for (const [group, hex] of Object.entries(allGroups)) {
    pallete[paletteKeyForGroup(group, 'bg')] = lightenHex(hex, 0.82);
    pallete[paletteKeyForGroup(group, 'icon')] = hex;
  }
  return pallete;
}
