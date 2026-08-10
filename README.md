# diagram-app

`diagram-library.js`(사내 C# 다이어그램 에디터를 JS로 이식한 라이브러리)를 React 컴포넌트가
"껍데기"로 감싸서, 파워포인트 리본 메뉴 같은 상단 툴바 + 캔버스 구조로 동작하게 만든 최소 스캐폴드입니다.

## 실행

```bash
npm install
npm run dev
```

## 왜 Next.js가 아니라 Vite인가

`diagram-library.js`는 `document`/`window`를 오직 메서드 내부에서만 참조하고 모듈 로드 시점에는
건드리지 않기 때문에 SSR 자체가 깨지지는 않습니다. 다만 이 라이브러리는 애초에 브라우저 DOM을
직접 조작하는 순수 클라이언트 도구라 서버에서 미리 렌더링할 이유가 없고, Next.js를 쓰면
`dynamic(() => import(...), { ssr: false })`로 캔버스 부분을 감싸는 절차가 하나 더 필요해집니다.
지금 단계에서는 그 복잡도를 더할 이유가 없어서 Vite + React(순수 CSR)로 시작했습니다.
**나중에 Next.js의 라우팅/서버 기능(예: 여러 시나리오 파일 목록 페이지, 서버에서 .prj 파싱 등)이
필요해지면 그때 이 구조를 Next.js 프로젝트의 `"use client"` 컴포넌트로 옮기는 정도의 작업**이라,
지금 Vite로 시작하는 게 되돌리기 어려운 선택은 아닙니다.

## 구조

```
src/
  lib/diagram-library.js     # 원본 라이브러리, 수정 없이 그대로 복사
  meta/sample-meta.json      # designer_meta.json에서 13개 노드를 "그대로" 발췌한 실제 축소판 (아래 참고)
  components/
    DiagramCanvas.jsx        # Diagram 인스턴스를 감싸는 얇은 React 래퍼 (핵심 파일)
    RibbonMenu.jsx            # 파워포인트 스타일 상단 리본 메뉴 — 전부 diagramRef 메서드 호출만 함
  App.jsx                     # 리본 + 캔버스 + 하단 상태바 조립
```

## DiagramCanvas가 흡수하고 있는 라이브러리 쪽 제약

지난 리뷰에서 짚었던 마찰 지점들을 컴포넌트 안에서 아래처럼 처리했습니다 (원본
`diagram-library.js`는 한 줄도 수정하지 않았습니다):

1. **selector 문제**: 생성자가 CSS selector 문자열을 받으므로 `useId()`로 고유 id를 만들어
   `#${id}` 형태로 넘깁니다.
2. **콜백 stale closure 문제**: `Diagram`은 `options.onXxx` 콜백을 생성 시점에 한 번만
   등록하고 이후 갱신 수단이 없습니다. `DiagramCanvas`는 안정적인 래퍼 함수 하나만 등록해두고,
   실제 최신 콜백은 매 렌더마다 `useRef`에 갱신해서 그 안에서 참조합니다.
3. **`destroy()` 부재 (미해결로 남겨둠)**: 라이브러리 모듈 스코프의 `diagrams` Map은 export되지
   않기 때문에 컴포넌트 쪽에서 인스턴스를 지울 방법이 없습니다. `<svg>`가 DOM에서 사라지면
   브라우저가 리스너는 정리해주지만, `diagrams` Map은 그 인스턴스 참조를 계속 들고 있습니다.
   캔버스를 마운트/언마운트를 반복하는 화면(예: 탭 전환)을 만들 계획이라면, **라이브러리 쪽에
   `Diagram.prototype.destroy()`를 추가하는 작업을 먼저 하는 걸 권장**합니다. 지금 스캐폴드
   범위에서는 원본 파일을 건드리지 않기 위해 일부러 패치하지 않았습니다.
4. **React 18 StrictMode 이중 마운트**: 개발 모드에서 effect가 setup→cleanup→setup으로
   두 번 실행되지만, 같은 `<svg>` DOM 노드를 재사용하는 한 `Diagram` 생성자 자체에 "같은 svg
   재사용 시 기존 children/리스너 정리" 로직이 이미 있어서 실제로는 문제없이 동작합니다
   (`diagram-library.js` 460~473줄 참고).

## sample-meta.json에 대해

이전 버전의 `sample-meta.json`은 값을 지어낸 것이었는데(리뷰 과정에서 확인됨), 지금 버전은
업로드해주신 `designer_meta.json`(전체 66개 노드)에서 **13개 노드 정의를 그대로 잘라온 것**입니다.
`displayName`/`shape`/`buildTag`/`icon`/`group`/`properties` 어느 것도 재구성하지 않았습니다.

포함된 노드: `StartNode`, `PromptNode`, `GetDigitPromptNode`, `IfNode`, `ScriptNode`,
`GotoPageNode`, `CallPageNode`, `ReturnPageNode`, `TransferNode`, `ServiceCheckNode`,
`WorkTimeNode`, `EmptyNode`, `HangupNode`. 각 노드의 `properties`에서 참조하는
`itemsSourceKey`(`AudioFileType`, `SmartIVRType`)에 해당하는 `itemSources` 항목도 함께 넣어서,
이 축소판만으로도 해당 노드들의 속성 정의가 끊기지 않고 완결되도록 했습니다.

**"삽입" 리본 탭이 실제 데이터 구조 덕분에 좋아진 점**: `designer_meta.json`의 각 노드에 있는
`group` 필드(`시나리오`/`음성`/`컨트롤`/`서비스`)를 그대로 읽어서, "삽입" 탭 안에 파워포인트
리본처럼 하위 그룹을 자동으로 나눠 보여줍니다. 이건 지어낸 필드가 아니라 실제 스키마에 있던
걸 활용한 거라, 66개 노드 전체로 교체해도 그대로 동작합니다.

**아이콘에 대해**: 실제 `icon` 값은 이모지가 아니라 `icons/prompt.svg` 같은 파일 경로입니다.
지금 이 프로젝트에는 그 SVG 파일들이 없어서, `RibbonButton`은 경로 형식(`/` 포함)의 아이콘을
만나면 깨진 이미지 대신 노드 이름 첫 글자를 뱃지로 보여주는 fallback을 씁니다
(`RibbonMenu.jsx`의 `isAssetPath` 분기). 실제 아이콘 세트를 `public/icons/`에 넣어주시면
`<img src={`/${icon}`} />`로 바로 교체 가능하도록 주석을 남겨뒀습니다.

## 다음으로 해볼 만한 것

- `sample-meta.json`을 66개 노드 전체로 확장 (지금 방식 그대로, 발췌 목록만 늘리면 됨)
- 실제 아이콘 SVG 세트를 `public/icons/`에 배치하고 `RibbonButton`의 fallback을 실제 `<img>`로 교체
- `Diagram.serialize`/`deserialize`를 이용한 파일 열기/저장 버튼을 "파일" 리본 탭에 추가
- `onDiagramModified` 콜백을 받아서 "저장 안 된 변경사항 있음" 표시를 상태바에 추가
- `destroy()` 부재 이슈를 라이브러리 쪽에서 해결 (지난 리뷰 참고)
