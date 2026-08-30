/**
 * ScriptNode 안에서 흔히 손으로 짜는 "쿼리 문자열 조립" 패턴을 테이블 UI로
 * 대신 작성할 수 있게 해주는 생성/역파싱 로직. 두 가지 실제 사용 형태를
 * 지원한다:
 *
 * 1) 저장 프로시저 호출 (queryType: 'procedure')
 *   var dbQuery = "";
 *   dbQuery += "exec PROC_XXX";
 *   dbQuery += " '" + app.foo + "',";   // 설명 (뒤콤마)
 *   dbQuery += " " + app.bar + ",";     // 숫자는 따옴표 없이
 *   dbQuery += " '" + app.baz + "'";    // 마지막 행은 콤마 없음
 *   dbQuery += ";";
 *   app.outputVar = dbQuery;
 *
 * 2) 테이블에 직접 INSERT (queryType: 'insert')
 *   app.DB_Query = "";
 *   app.DB_Query += "INSERT INTO TABLE (COL1, COL2, ...) VALUES (";
 *   app.DB_Query += " '" + app.foo + "' ";     // 첫 값은 콤마 없음
 *   app.DB_Query += " ,'" + app.bar + "' ";    // 이후 값은 앞콤마
 *   app.DB_Query += ");";
 *
 *   (INSERT 모드에선 변수 자체가 이미 app.으로 시작하는 app 변수를 그대로
 *   누산기로 쓰는 경우가 흔해서, 그럴 땐 `var` 선언 없이 바로 대입한다.)
 *
 * 엔진은 이 스크립트를 텍스트 그대로 실행하는 것 외에 별도 해석을 하지 않으므로,
 * "엔진 해석이 동일하다"는 요구는 결국 "실행 결과로 만들어지는 최종 문자열 값이
 * 같다"로 좁혀진다 — 소스 코드의 줄 구성까지 원본과 똑같이 맞출 필요는 없다.
 * 그래서 generateQueryScript는 항상 "파라미터 1개 = 1행"으로 깔끔하게 풀어쓴다.
 *
 * parseQueryScript는 이 두 가지 깔끔한 모양만 인식하는 best-effort 역파서다 —
 * 한 줄에 여러 파라미터가 뭉쳐있거나, 빈 값이라고 값 자리에 문자열 상수를 그냥
 * 박아넣는 등(따로 `+ expr +` 결합이 없는 줄) 더 복잡한 기존 스크립트는 억지로
 * 변환하지 않고 null을 반환한다(호출 측에서 "자동 변환 불가" 안내 후 텍스트
 * 모드 유지).
 */

export const DEFAULT_LOCAL_VAR = 'dbQuery';

let rowIdCounter = 0;
export function createEmptyRow() {
  rowIdCounter += 1;
  return { id: `row-${rowIdCounter}`, column: '', description: '', expr: '', type: 'string' };
}

export function createEmptyConfig() {
  return {
    queryType: 'procedure',
    procName: '',
    tableName: '',
    localVar: DEFAULT_LOCAL_VAR,
    outputVar: '',
    rows: [createEmptyRow()],
  };
}

// app.xxx / app.foo.bar 처럼 "."이 들어간 변수명은 이미 app 스코프 변수를 직접
// 누산기로 쓰는 것으로 보고 `var` 선언 없이 그대로 대입한다.
function isPropertyPath(name) {
  return /\./.test(name);
}

function declLine(varExpr) {
  return isPropertyPath(varExpr) ? `${varExpr} = "";` : `var ${varExpr} = "";`;
}

function buildProcRowLine(varExpr, row, isLast) {
  const comma = isLast ? '' : ',';
  const expr = row.expr.trim() || "''";
  const line =
    row.type === 'number'
      ? `${varExpr} += " " + ${expr}${comma ? ` + "${comma}"` : ''};`
      : `${varExpr} += " '" + ${expr} + "'${comma}";`;
  const comment = row.description.trim() ? `  // ${row.description.trim()}` : '';
  return `${line}${comment}`;
}

function buildInsertRowLine(varExpr, row, isFirst) {
  const commaPrefix = isFirst ? '' : ',';
  const expr = row.expr.trim() || "''";
  const line =
    row.type === 'number'
      ? `${varExpr} += " ${commaPrefix}" + ${expr} + " ";`
      : `${varExpr} += " ${commaPrefix}'" + ${expr} + "' ";`;
  const comment = row.description.trim() ? `  // ${row.description.trim()}` : '';
  return `${line}${comment}`;
}

/** config → 실행 가능한 스크립트 텍스트. */
export function generateQueryScript(config) {
  const { queryType = 'procedure', outputVar, rows } = config;
  const varExpr = (config.localVar || DEFAULT_LOCAL_VAR).trim() || DEFAULT_LOCAL_VAR;
  const lines = [declLine(varExpr)];

  if (queryType === 'insert') {
    const table = (config.tableName || '').trim();
    const columns = rows.map((r) => (r.column || '').trim() || '?');
    lines.push(`${varExpr} += "INSERT INTO ${table} (${columns.join(', ')}) VALUES (";`);
    rows.forEach((row, i) => lines.push(buildInsertRowLine(varExpr, row, i === 0)));
    lines.push(`${varExpr} += ");";`);
  } else {
    lines.push(`${varExpr} += "exec ${(config.procName || '').trim()}";`);
    rows.forEach((row, i) => lines.push(buildProcRowLine(varExpr, row, i === rows.length - 1)));
    lines.push(`${varExpr} += ";";`);
  }

  const trimmedOutput = (outputVar || '').trim();
  if (trimmedOutput && trimmedOutput !== varExpr) {
    lines.push(`${trimmedOutput} = ${varExpr};`);
  }
  return lines.join('\n');
}

const VAR_RE = '[\\w.[\\]$]+';
const PROC_HEADER_RE = new RegExp(`^\\s*(${VAR_RE})\\s*\\+?=\\s*"exec\\s+([^\\s"]+)\\s*"\\s*;?\\s*$`);
const INSERT_HEADER_RE = new RegExp(
  `^\\s*(${VAR_RE})\\s*\\+?=\\s*"INSERT INTO\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*VALUES\\s*\\(\\s*"\\s*;?\\s*$`,
  'i'
);

function makeProcRowRes(varRe) {
  return {
    string: new RegExp(`^\\s*(${varRe})\\s*\\+=\\s*" '"\\s*\\+\\s*(.+?)\\s*\\+\\s*"'(,)?"\\s*;\\s*(?:\\/\\/\\s*(.*))?$`),
    number: new RegExp(
      `^\\s*(${varRe})\\s*\\+=\\s*" "\\s*\\+\\s*(.+?)(?:\\s*\\+\\s*"(,)"\\s*)?\\s*;\\s*(?:\\/\\/\\s*(.*))?$`
    ),
    terminator: new RegExp(`^\\s*(${varRe})\\s*\\+=\\s*";"\\s*;\\s*$`),
  };
}

function makeInsertRowRes(varRe) {
  return {
    string: new RegExp(`^\\s*(${varRe})\\s*\\+=\\s*" (,)?'"\\s*\\+\\s*(.+?)\\s*\\+\\s*"'\\s*"\\s*;\\s*(?:\\/\\/\\s*(.*))?$`),
    number: new RegExp(`^\\s*(${varRe})\\s*\\+=\\s*" (,)?"\\s*\\+\\s*(.+?)\\s*\\+\\s*"\\s*"\\s*;\\s*(?:\\/\\/\\s*(.*))?$`),
    terminator: new RegExp(`^\\s*(${varRe})\\s*\\+=\\s*"\\);"\\s*;\\s*$`),
  };
}

const OUTPUT_RE = new RegExp(`^\\s*(${VAR_RE})\\s*=\\s*(${VAR_RE})\\s*;?\\s*$`);

function tryParseProcedure(lines, headerIdx) {
  const headerMatch = lines[headerIdx].match(PROC_HEADER_RE);
  const localVar = headerMatch[1];
  const procName = headerMatch[2];
  const res = makeProcRowRes(VAR_RE);

  const rows = [];
  let outputVar = '';
  let sawTerminator = false;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    const term = line.match(res.terminator);
    if (term) {
      if (term[1] !== localVar) return null;
      sawTerminator = true;
      continue;
    }

    if (sawTerminator) {
      const out = line.match(OUTPUT_RE);
      if (out && out[2] === localVar) {
        outputVar = out[1];
        continue;
      }
      return null;
    }

    const strRow = line.match(res.string);
    if (strRow && strRow[1] === localVar) {
      rows.push({ ...createEmptyRow(), description: (strRow[4] || '').trim(), expr: strRow[2].trim(), type: 'string' });
      continue;
    }

    const numRow = line.match(res.number);
    if (numRow && numRow[1] === localVar) {
      rows.push({ ...createEmptyRow(), description: (numRow[4] || '').trim(), expr: numRow[2].trim(), type: 'number' });
      continue;
    }

    return null;
  }

  if (rows.length === 0 || !sawTerminator) return null;
  return { queryType: 'procedure', procName, tableName: '', localVar, outputVar, rows };
}

function tryParseInsert(lines, headerIdx) {
  const headerMatch = lines[headerIdx].match(INSERT_HEADER_RE);
  const localVar = headerMatch[1];
  const tableName = headerMatch[2];
  const columns = headerMatch[3]
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  const res = makeInsertRowRes(VAR_RE);

  const rows = [];
  let outputVar = '';
  let sawTerminator = false;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    const term = line.match(res.terminator);
    if (term) {
      if (term[1] !== localVar) return null;
      sawTerminator = true;
      continue;
    }

    if (sawTerminator) {
      const out = line.match(OUTPUT_RE);
      if (out && out[2] === localVar) {
        outputVar = out[1];
        continue;
      }
      return null;
    }

    const isFirst = rows.length === 0;
    const strRow = line.match(res.string);
    if (strRow && strRow[1] === localVar && !!strRow[2] === !isFirst) {
      rows.push({ ...createEmptyRow(), description: (strRow[4] || '').trim(), expr: strRow[3].trim(), type: 'string' });
      continue;
    }

    const numRow = line.match(res.number);
    if (numRow && numRow[1] === localVar && !!numRow[2] === !isFirst) {
      rows.push({ ...createEmptyRow(), description: (numRow[4] || '').trim(), expr: numRow[3].trim(), type: 'number' });
      continue;
    }

    return null;
  }

  if (rows.length === 0 || !sawTerminator || rows.length !== columns.length) return null;
  rows.forEach((row, i) => {
    row.column = columns[i];
  });
  return { queryType: 'insert', procName: '', tableName, localVar, outputVar, rows };
}

/**
 * 스크립트 텍스트 → config. 이 파일이 만든 것과 같은 두 가지 모양(프로시저
 * 호출 / 테이블 INSERT, 둘 다 "1행=1파라미터")만 인식한다. 조금이라도 벗어나면
 * null을 반환한다 — 절대 억지로 끼워맞추지 않는다.
 */
export function parseQueryScript(scriptText) {
  if (!scriptText || !scriptText.trim()) return null;

  const lines = scriptText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const procIdx = lines.findIndex((l) => PROC_HEADER_RE.test(l));
  if (procIdx !== -1) {
    const result = tryParseProcedure(lines, procIdx);
    if (result) return result;
  }

  const insIdx = lines.findIndex((l) => INSERT_HEADER_RE.test(l));
  if (insIdx !== -1) {
    const result = tryParseInsert(lines, insIdx);
    if (result) return result;
  }

  return null;
}
