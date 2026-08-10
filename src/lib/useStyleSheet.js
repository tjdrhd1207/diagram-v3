import { useEffect } from 'react';

const injected = new Set();

/**
 * useStylesheet('/css/ribbon-menu.css')
 *
 * public/ 폴더 안의 파일은 Vite 모듈 그래프에서 빠져있어서
 * `import './public/css/x.css'` 같은 import 문으로는 가져올 수 없다
 * (public은 "URL로 직접 참조"용이지 "import 대상"이 아님).
 *
 * 그 대신 이 훅을 컴포넌트 최상단에서 한 줄 호출하는 것으로
 * "이 컴포넌트는 이 CSS가 필요하다"를 import처럼 선언할 수 있다.
 * 실제로는 마운트 시 <link rel="stylesheet"> 태그를 document.head에
 * 한 번만 주입한다 (같은 href는 중복 삽입하지 않음).
 *
 * index.html은 더 이상 CSS 목록을 손으로 관리할 필요가 없다.
 */
export function useStylesheet(href) {
  useEffect(() => {
    if (injected.has(href)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.injectedBy = 'useStylesheet';
    document.head.appendChild(link);
    injected.add(href);
  }, [href]);
}