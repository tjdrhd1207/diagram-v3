import { useEffect, useRef, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';

/**
 * 시나리오 시뮬레이터 — SearchPanel과 같은 톤의 플로팅 채팅창. 실제 상태(엔진
 * 세션)는 App.jsx가 들고 있고, 이 컴포넌트는 그걸 그대로 그려주는 프레젠테이션
 * 전용 컴포넌트다(scenarioSimulator.js의 createSimulatorEngine 참고).
 */
export default function ScenarioSimulatorPanel({ messages, status, options, onSend, onRestart, onClose, onFocusBlock }) {
  useStylesheet('/css/scenario-simulator.css');
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const awaitingInput = status === 'awaiting-input';

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (awaitingInput) inputRef.current?.focus();
  }, [awaitingInput, messages]);

  const send = (text) => {
    setInput('');
    onSend(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!awaitingInput) return;
    send(input);
  };

  return (
    <div className="scenario-simulator-panel">
      <div className="scenario-simulator-header">
        <span className="scenario-simulator-title">시나리오 시뮬레이터</span>
        <button type="button" className="scenario-simulator-restart" title="다시 시작" onClick={onRestart}>
          ↻
        </button>
        <button type="button" className="scenario-simulator-close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="scenario-simulator-list" ref={listRef}>
        {messages.map((m, i) => (
          <SimulatorMessage key={i} message={m} onFocusBlock={onFocusBlock} />
        ))}

        {status === 'ended' && (
          <div className="scenario-simulator-status">시뮬레이션이 종료됐습니다. 위 "↻ 다시 시작"으로 처음부터 다시 확인할 수 있어요.</div>
        )}
        {status === 'error' && (
          <div className="scenario-simulator-status is-error">문제가 생겨 멈췄습니다. 위 "↻ 다시 시작"을 눌러주세요.</div>
        )}

        {options && options.length > 0 && (
          <div className="scenario-simulator-options">
            {options.map((opt) => (
              <button type="button" key={opt} className="scenario-simulator-option" onClick={() => send(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="scenario-simulator-input-row" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder={awaitingInput ? '위 버튼을 클릭하거나 이벤트 이름을 직접 입력하세요...' : '시뮬레이션이 종료되었습니다.'}
          value={input}
          disabled={!awaitingInput}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!awaitingInput}>
          전송
        </button>
      </form>
    </div>
  );
}

function SimulatorMessage({ message, onFocusBlock }) {
  const { role, text, pageInclude, blockId } = message;
  return (
    <div className={`scenario-simulator-message scenario-simulator-message-${role}`}>
      <div className="scenario-simulator-bubble">
        <span className="scenario-simulator-bubble-text">{text}</span>
        {blockId != null && (
          <button type="button" className="scenario-simulator-focus-button" onClick={() => onFocusBlock(pageInclude, blockId)}>
            📍 캔버스에서 보기
          </button>
        )}
      </div>
    </div>
  );
}
