import { useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { previewFromScript } from '../lib/wvParamPreview.js';

/**
 * ScriptEditorModal의 "미리보기" 탭 — 지금 편집 중인 스크립트를 그대로 실행해
 * app.WV_Param을 만들고, 그 안의 토큰을 쌓아서 대략적인 "보이는 ARS" 화면
 * 목업을 보여준다. 실제 화면 템플릿(S$)별 정확한 레이아웃 재현이 목적이
 * 아니라("사이트별로 템플릿이 다를 수 있다" — 사용자 확인), 스크립트 하나 넣었을
 * 때 대충 어떤 화면이 나오는지 감을 잡기 위한 것이다.
 *
 * 타이핑 중간중간(문법이 깨진 상태)에 자동으로 재실행되면 에러만 계속 보이게
 * 되므로, 자동 실행은 안 하고 버튼을 눌렀을 때만 실행한다(탭을 처음 열 때 한 번
 * 자동 실행은 해준다 — 아무 반응 없어 보이는 것보다 낫다).
 */
export default function WvParamPreview({ script }) {
  useStylesheet('/css/wv-param-preview.css');
  const [result, setResult] = useState(() => previewFromScript(script));

  const run = () => setResult(previewFromScript(script));

  return (
    <div className="wv-preview-pane">
      <div className="wv-preview-toolbar">
        <button type="button" className="wv-preview-run" onClick={run}>
          ↻ 다시 실행
        </button>
        <span className="wv-preview-hint">
          지금 편집창의 스크립트를 그대로 실행해 만들어지는 app.WV_Param을 화면으로 대략 쌓아봅니다 —
          실제 템플릿 레이아웃과는 다를 수 있습니다.
        </span>
      </div>

      <div className="wv-preview-body">
        {result.error && (
          <div className="wv-preview-error">스크립트 실행 중 오류가 발생했습니다: {result.error}</div>
        )}

        {!result.error && !result.wvParam && (
          <div className="wv-preview-empty">app.WV_Param이 비어있습니다 (스크립트가 그 값을 안 채우는 것 같습니다).</div>
        )}

        {!result.error && result.wvParam && (
          <div className="wv-phone">
            <div className="wv-phone-screen">
              {result.screen.elements.map((el, i) => (
                <ScreenElement key={i} el={el} />
              ))}
              {result.screen.elements.length === 0 && (
                <div className="wv-preview-empty">인식할 수 있는 화면 요소가 없습니다.</div>
              )}
            </div>
            {result.screen.buttons.length > 0 && (
              <div className="wv-phone-footer">
                {result.screen.buttons.map((b, i) => (
                  <button key={i} type="button" className="wv-phone-btn" disabled>
                    {b.label || '(라벨 없음)'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {result.screen?.info?.length > 0 && (
          <div className="wv-preview-info">
            <div className="wv-preview-info-title">화면에 안 보이는 토큰 / 아직 지원 안 하는 토큰</div>
            {result.screen.info.map((line, i) => (
              <div key={i} className="wv-preview-info-line">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenElement({ el }) {
  switch (el.kind) {
    case 'title':
      return <div className="wv-el-title">{el.text}</div>;
    case 'text':
      // eslint-disable-next-line react/no-danger -- 스크립트 원문 자체가 <font> 같은 HTML을 그대로 담아 보내는 실제 프로토콜이라, 여기서도 그대로 렌더링해야 실제 화면과 비슷하게 보인다.
      return <div className="wv-el-text" dangerouslySetInnerHTML={{ __html: el.html }} />;
    case 'image':
      return <div className="wv-el-image">[이미지 {el.code}]</div>;
    case 'step': {
      const dots = [];
      for (let i = 1; i <= el.total; i++) dots.push(i <= el.current);
      return (
        <div className="wv-el-step">
          <div className="wv-el-step-dots">
            {dots.map((active, i) => (
              <span key={i} className={`wv-el-step-dot ${active ? 'is-active' : ''}`} />
            ))}
          </div>
          <div className="wv-el-step-label">{el.label}</div>
        </div>
      );
    }
    case 'strong':
      return <div className="wv-el-strong">{el.text}</div>;
    case 'question':
      return (
        <div className="wv-el-question">
          <div className="wv-el-question-page">문항 {el.page}</div>
          <div className="wv-el-question-text">{el.text}</div>
          {el.answers.map((a, i) => (
            <div key={i} className="wv-el-option">
              <span className="wv-el-option-num">{i + 1}</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      );
    case 'message':
      return (
        // eslint-disable-next-line react/no-danger
        <div className="wv-el-message" dangerouslySetInnerHTML={{ __html: el.html }} />
      );
    default:
      return null;
  }
}
