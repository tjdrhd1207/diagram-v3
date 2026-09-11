import { useMemo, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';
import { createEmptyCase, parseMciSwitch, buildMciSwitchText, buildMciCasesCsv } from '../lib/mciCaseBuilder.js';
import { lintMciScript } from '../lib/mciLinter.js';

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `mci-${uidCounter}`;
}

function withIds(c) {
  return { ...c, id: uid(), fields: (c.fields ?? []).map((f) => ({ ...f, id: uid() })) };
}

const KIND_LABEL = { flat: '평평한 객체', array: '배열(원소 1개)', raw: '원문 보존' };

/**
 * ScriptEditorModal의 "MCI 케이스" 탭 — switch(rcveSrvcId){ case 'X': header=...;
 * payload={...}; break; ... } 패턴을 케이스별 리스트로 보여주고 편집한다.
 * payload가 평평한 객체/배열-하나-감싼 객체가 아닌 경우(조건분기, JSON.parse
 * 전처리 등)는 표로 억지로 담지 않고 원문을 그대로 보존한다 — 자세한 내용은
 * mciCaseBuilder.js 참고. 검증(린터)은 별개로, 표로 옮기지 않고 지금 스크립트
 * 원문을 직접 검사한다.
 */
export default function MciCaseBuilderPanel({ script, onApply, onInsert }) {
  useStylesheet('/css/mci-case-builder-panel.css');

  const [cases, setCases] = useState([]);
  const [defaultText, setDefaultText] = useState(
    'default:\n\t\tutil.print("해당하는 인터페이스ID가 없습니다");'
  );
  const [importMessage, setImportMessage] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [lintIssues, setLintIssues] = useState(null);

  const generated = useMemo(() => buildMciSwitchText(cases, defaultText), [cases, defaultText]);

  const handleImport = () => {
    const parsed = parseMciSwitch(script);
    if (!parsed) {
      setImportMessage('이 스크립트에서 switch(rcveSrvcId){...} 구조를 찾지 못했어요. 아래에서 새로 작성해주세요.');
      return;
    }
    setCases(parsed.cases.map(withIds));
    setDefaultText(parsed.defaultText);
    const rawCount = parsed.cases.filter((c) => c.kind === 'raw').length;
    setImportMessage(
      `${parsed.cases.length}개 케이스를 불러왔어요.` +
        (rawCount > 0 ? ` 이 중 ${rawCount}개는 조건분기/전처리가 섞여 있어 원문 그대로 보존했습니다.` : '')
    );
  };

  // 프로젝트 전체를 다시 훑지 않고, 지금 이 목록(파싱/편집된 케이스들)만 CSV로
  // 뽑는다 — 지난번 "멘트 목록" 내보내기와 같은 BOM 포함 CSV 형식.
  const handleExportCsv = () => {
    if (cases.length === 0) return;
    const csv = buildMciCasesCsv(cases);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mci_전문목록.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const updateCase = (id, patch) => {
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeCase = (id) => {
    setCases((cs) => cs.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  };
  const addCase = () => {
    const next = withIds(createEmptyCase());
    setCases((cs) => [...cs, next]);
    setExpandedId(next.id);
  };

  const updateField = (caseId, fieldId, patch) => {
    setCases((cs) =>
      cs.map((c) =>
        c.id === caseId ? { ...c, fields: c.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) } : c
      )
    );
  };
  const addField = (caseId) => {
    setCases((cs) =>
      cs.map((c) => (c.id === caseId ? { ...c, fields: [...c.fields, { id: uid(), name: '', expr: '' }] } : c))
    );
  };
  const removeField = (caseId, fieldId) => {
    setCases((cs) =>
      cs.map((c) =>
        c.id === caseId && c.fields.length > 1 ? { ...c, fields: c.fields.filter((f) => f.id !== fieldId) } : c
      )
    );
  };

  const handleLint = () => {
    setLintIssues(lintMciScript(script));
  };

  return (
    <div className="mci-pane">
      <div className="mci-lint-section">
        <div className="mci-lint-header">
          <button type="button" className="mci-lint-run" onClick={handleLint}>
            🔍 스크립트 검사
          </button>
          <span className="mci-lint-hint">지금 편집 중인 스크립트 원문에서 중복 case, break 누락, makeMCIHeader 인자 개수를 확인합니다.</span>
        </div>
        {lintIssues !== null && (
          <div className="mci-lint-results">
            {lintIssues.length === 0 ? (
              <div className="mci-lint-ok">문제를 찾지 못했습니다.</div>
            ) : (
              lintIssues.map((issue, i) => (
                <div className={`mci-lint-issue mci-lint-issue-${issue.type}`} key={i}>
                  {issue.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mci-toolbar">
        <button type="button" className="mci-import" onClick={handleImport}>
          ↙ 기존 스크립트에서 가져오기
        </button>
        <button type="button" className="mci-export" disabled={cases.length === 0} onClick={handleExportCsv}>
          ⭳ 목록 추출 (CSV)
        </button>
        {importMessage && <span className="mci-import-message">{importMessage}</span>}
      </div>

      <div className="mci-case-list">
        {cases.length === 0 && <div className="mci-case-empty">아직 케이스가 없습니다. 가져오거나 새로 추가하세요.</div>}
        {cases.map((c) => (
          <div className="mci-case-item" key={c.id}>
            <button type="button" className="mci-case-summary" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
              <span className={`mci-case-kind mci-case-kind-${c.kind}`}>{KIND_LABEL[c.kind]}</span>
              <span className="mci-case-serviceid">{c.serviceId || '(서비스ID 없음)'}</span>
              <span className="mci-case-comment">{c.comment}</span>
              <span className="mci-case-toggle">{expandedId === c.id ? '▲' : '▼'}</span>
            </button>

            {expandedId === c.id && (
              <div className="mci-case-body">
                <div className="mci-case-fields-top">
                  <label>
                    서비스ID
                    <input
                      type="text"
                      value={c.serviceId}
                      onChange={(e) => updateCase(c.id, { serviceId: e.target.value })}
                    />
                  </label>
                  <label>
                    설명
                    <input type="text" value={c.comment} onChange={(e) => updateCase(c.id, { comment: e.target.value })} />
                  </label>

                  {c.kind === 'raw' ? (
                    <label className="mci-raw-label">
                      원문 (조건분기/전처리 포함 — 직접 수정)
                      <textarea
                        rows={8}
                        value={c.rawText}
                        onChange={(e) => updateCase(c.id, { rawText: e.target.value })}
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        고유ID
                        <input
                          type="text"
                          value={c.headerId}
                          placeholder="HLIIVR00000"
                          onChange={(e) => updateCase(c.id, { headerId: e.target.value })}
                        />
                      </label>
                      <label>
                        시스템코드
                        <input
                          type="text"
                          value={c.systemCode}
                          placeholder="ICS"
                          onChange={(e) => updateCase(c.id, { systemCode: e.target.value })}
                        />
                      </label>
                      <label>
                        payload 형태
                        <select value={c.kind} onChange={(e) => updateCase(c.id, { kind: e.target.value })}>
                          <option value="flat">평평한 객체</option>
                          <option value="array">배열(원소 1개)로 감싸기</option>
                        </select>
                      </label>
                      {c.kind === 'array' && (
                        <label>
                          리스트 이름
                          <input
                            type="text"
                            value={c.listKey}
                            placeholder="prodInrdAgrmAplcChngList"
                            onChange={(e) => updateCase(c.id, { listKey: e.target.value })}
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>

                {c.kind !== 'raw' && (
                  <div className="mci-field-table">
                    <div className="mci-field-row mci-field-row-head">
                      <span className="mci-col-name">필드명</span>
                      <span className="mci-col-expr">표현식</span>
                      <span className="mci-col-actions" />
                    </div>
                    {c.fields.map((f, i) => (
                      <div className="mci-field-row" key={f.id}>
                        <input
                          className="mci-col-name"
                          type="text"
                          value={f.name}
                          placeholder="custId"
                          onChange={(e) => updateField(c.id, f.id, { name: e.target.value })}
                        />
                        <input
                          className="mci-col-expr"
                          type="text"
                          value={f.expr}
                          placeholder="app.H_Input_01"
                          onChange={(e) => updateField(c.id, f.id, { expr: e.target.value })}
                        />
                        <span className="mci-col-actions">
                          <button type="button" title="삭제" onClick={() => removeField(c.id, f.id)}>✕</button>
                        </span>
                      </div>
                    ))}
                    <button type="button" className="mci-add-field" onClick={() => addField(c.id)}>
                      + 필드 추가
                    </button>
                  </div>
                )}

                <button type="button" className="mci-remove-case" onClick={() => removeCase(c.id)}>
                  이 케이스 삭제
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="mci-add-case" onClick={addCase}>
          + 케이스 추가
        </button>
      </div>

      <div className="mci-preview">
        <div className="mci-preview-label">생성될 switch문 미리보기</div>
        <pre>{generated}</pre>
      </div>

      <div className="mci-actions">
        <button type="button" className="mci-insert" onClick={() => onInsert(generated)}>
          커서 위치에 삽입
        </button>
        <button type="button" className="mci-apply" onClick={() => onApply(generated)}>
          스크립트에 적용 (전체 교체)
        </button>
      </div>
    </div>
  );
}
