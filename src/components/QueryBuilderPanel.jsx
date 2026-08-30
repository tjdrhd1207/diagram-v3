import { useMemo, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { createEmptyConfig, createEmptyRow, generateQueryScript, parseQueryScript } from '../lib/queryBuilder.js';

/**
 * ScriptEditorModal의 "쿼리 빌더" 탭 — `callQuery += "'" + app.xxx + "',"` 식으로
 * 손으로 짜던 stored procedure 호출 문자열 조립을 테이블로 대신 작성한다.
 * "적용"을 누르면 지금 편집 중인 스크립트 전체를 생성된 텍스트로 교체한다 —
 * 엔진은 최종 텍스트만 실행하므로 결과 문자열만 같으면 되고, 소스 줄 구성까지
 * 원본과 맞출 필요는 없다(자세한 내용은 queryBuilder.js 참고).
 */
export default function QueryBuilderPanel({ script, onApply, onInsert }) {
  useStylesheet('/css/query-builder-panel.css');

  const [config, setConfig] = useState(() => createEmptyConfig());
  const [importMessage, setImportMessage] = useState('');
  const isInsert = config.queryType === 'insert';

  const generated = useMemo(() => generateQueryScript(config), [config]);

  const updateRow = (id, patch) => {
    setConfig((c) => ({ ...c, rows: c.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };
  const removeRow = (id) => {
    setConfig((c) => ({ ...c, rows: c.rows.length > 1 ? c.rows.filter((r) => r.id !== id) : c.rows }));
  };
  const addRow = () => {
    setConfig((c) => ({ ...c, rows: [...c.rows, createEmptyRow()] }));
  };
  const moveRow = (id, dir) => {
    setConfig((c) => {
      const i = c.rows.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= c.rows.length) return c;
      const rows = [...c.rows];
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...c, rows };
    });
  };

  const handleImport = () => {
    const parsed = parseQueryScript(script);
    if (!parsed) {
      setImportMessage('이 스크립트는 표 형태로 자동 변환할 수 없어요 (한 줄에 파라미터가 여러 개 뭉쳐 있는 등, 이 도구가 만드는 것과 다른 모양). 표를 새로 작성해주세요.');
      return;
    }
    setConfig(parsed);
    setImportMessage('기존 스크립트에서 불러왔어요.');
  };

  return (
    <div className="query-builder-pane">
      <div className="query-builder-toolbar">
        <button type="button" className="query-builder-import" onClick={handleImport}>
          ↙ 기존 스크립트에서 가져오기
        </button>
        {importMessage && <span className="query-builder-import-message">{importMessage}</span>}
      </div>

      <div className="query-builder-header-fields">
        <label>
          쿼리 종류
          <select
            value={config.queryType}
            onChange={(e) => setConfig((c) => ({ ...c, queryType: e.target.value }))}
          >
            <option value="procedure">저장 프로시저 호출 (exec PROC_XXX ...)</option>
            <option value="insert">테이블에 직접 INSERT</option>
          </select>
        </label>
        {isInsert ? (
          <label>
            테이블명
            <input
              type="text"
              value={config.tableName}
              placeholder="SBATCALL_BACK"
              onChange={(e) => setConfig((c) => ({ ...c, tableName: e.target.value }))}
            />
          </label>
        ) : (
          <label>
            프로시저명
            <input
              type="text"
              value={config.procName}
              placeholder="PROC_ScenarioDesigner_XXX_ADV"
              onChange={(e) => setConfig((c) => ({ ...c, procName: e.target.value }))}
            />
          </label>
        )}
        <label>
          쿼리 변수명
          <input
            type="text"
            value={config.localVar}
            placeholder="dbQuery 또는 app.DB_Query"
            onChange={(e) => setConfig((c) => ({ ...c, localVar: e.target.value }))}
          />
        </label>
        <div className="query-builder-field-hint">
          "app."으로 시작하면 그 app 변수를 <code>var</code> 선언 없이 그대로 누산기로 씁니다 (예: <code>app.DB_Query</code>). 그 외엔 새 지역 변수를 선언합니다.
        </div>
        <label>
          결과 저장할 app 변수명
          <input
            type="text"
            value={config.outputVar}
            placeholder="app._oamp_sQuery (위 변수명이 이미 app.xxx면 보통 비워둠)"
            onChange={(e) => setConfig((c) => ({ ...c, outputVar: e.target.value }))}
          />
        </label>
      </div>

      <div className={`query-builder-table ${isInsert ? 'is-insert' : ''}`}>
        <div className="query-builder-row query-builder-row-head">
          {isInsert && <span className="qb-col-column">컬럼명</span>}
          <span className="qb-col-desc">설명</span>
          <span className="qb-col-expr">표현식</span>
          <span className="qb-col-type">타입</span>
          <span className="qb-col-actions" />
        </div>
        {config.rows.map((row, i) => (
          <div className="query-builder-row" key={row.id}>
            {isInsert && (
              <input
                className="qb-col-column"
                type="text"
                value={row.column}
                placeholder="예: CALLBACK_NO"
                onChange={(e) => updateRow(row.id, { column: e.target.value })}
              />
            )}
            <input
              className="qb-col-desc"
              type="text"
              value={row.description}
              placeholder="예: Unique Call ID"
              onChange={(e) => updateRow(row.id, { description: e.target.value })}
            />
            <input
              className="qb-col-expr"
              type="text"
              value={row.expr}
              placeholder="예: app._uniqueCallID"
              onChange={(e) => updateRow(row.id, { expr: e.target.value })}
            />
            <select
              className="qb-col-type"
              value={row.type}
              onChange={(e) => updateRow(row.id, { type: e.target.value })}
            >
              <option value="string">문자열</option>
              <option value="number">숫자</option>
            </select>
            <span className="qb-col-actions">
              <button type="button" title="위로" disabled={i === 0} onClick={() => moveRow(row.id, -1)}>↑</button>
              <button type="button" title="아래로" disabled={i === config.rows.length - 1} onClick={() => moveRow(row.id, 1)}>↓</button>
              <button type="button" title="삭제" onClick={() => removeRow(row.id)}>✕</button>
            </span>
          </div>
        ))}
        <button type="button" className="query-builder-add-row" onClick={addRow}>
          + 행 추가
        </button>
      </div>

      <div className="query-builder-preview">
        <div className="query-builder-preview-label">생성될 스크립트 미리보기</div>
        <pre>{generated}</pre>
      </div>

      <div className="query-builder-actions">
        <button type="button" className="query-builder-insert" onClick={() => onInsert(generated)}>
          커서 위치에 삽입
        </button>
        <button type="button" className="query-builder-apply" onClick={() => onApply(generated)}>
          스크립트에 적용 (전체 교체)
        </button>
      </div>
      <div className="query-builder-actions-hint">
        "커서 위치에 삽입"은 에디터에서 커서(또는 선택 영역)가 있던 자리에만 이 텍스트를 끼워 넣고, 그 앞뒤 코드는 그대로 둡니다.
        "전체 교체"는 스크립트 전체를 이 텍스트로 바꿉니다.
      </div>
    </div>
  );
}
