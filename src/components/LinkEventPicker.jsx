import { useEffect, useRef, useState } from "react";
import { useStylesheet } from '../lib/useStylesheet.js';

/**
 * Popup shown right after the user drags one anchor onto another.
 * Instead of a bare window.prompt(), this reads the origin node's
 * `links` definition from meta (designer_meta.json) and lets the
 * person pick a real event name — the same set the ScenarioDesigner
 * itself would offer for that node type.
 *
 * Falls back to free-text entry when the node type has no `links`
 * defined in meta, or when the person wants something not in the list
 * (e.g. a GetDigitPromptNode's DTMF digit choices, which aren't fixed
 * "links" entries but per-scenario digit values).
 */

export default function LinkEventPicker({ x, y, nodeLabel, options, usedNames, onPick, onCancel }) {
  useStylesheet('/css/link-event-picker.css');

  const [customValue, setCustomValue] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  // 화면 밖으로 튀어나가지 않도록 대략적인 위치 보정.
  const style = {
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 320),
  };

  return (
    <div className="link-picker-backdrop" onMouseDown={onCancel}>
      <div
        className="link-picker-box"
        style={style}
        ref={boxRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="link-picker-header">
          {nodeLabel ? `${nodeLabel}의 이벤트 선택` : '이벤트 선택'}
        </div>

        <div className="link-picker-list">
          {options.length === 0 && (
            <div className="link-picker-empty">
              이 노드 타입은 meta에 정의된 이벤트가 없어요. 아래에 직접 입력하세요.
            </div>
          )}
          {options.map((opt) => {
            const isUsed = usedNames.has(opt.name);
            return (
              <button
                key={opt.name}
                className="link-picker-item"
                disabled={isUsed}
                title={opt.description || undefined}
                onClick={() => onPick(opt.name)}
              >
                <span className="link-picker-item-name">{opt.name}</span>
                {opt.required && <span className="link-picker-badge">필수</span>}
                {isUsed && <span className="link-picker-badge link-picker-badge-used">사용됨</span>}
              </button>
            );
          })}
        </div>

        <form
          className="link-picker-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (customValue.trim()) onPick(customValue.trim());
          }}
        >
          <input
            type="text"
            placeholder="직접 입력 (예: 1, 2, *, #)"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            autoFocus={options.length === 0}
          />
          <button type="submit" disabled={!customValue.trim()}>추가</button>
        </form>

        <button className="link-picker-cancel" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}