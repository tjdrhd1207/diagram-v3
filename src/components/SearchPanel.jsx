import { useEffect, useRef, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';

/**
 * Ctrl+F로 열리는 "프로젝트 전체 검색" 결과 패널 — 화면 하단에서 슬라이드업.
 * 지금 열려있는 페이지 하나가 아니라 프로젝트에 딸린 모든 .xml 페이지를
 * 훑어서(App.jsx의 projectSearch.js) 캡션/설명/모든 프로퍼티 값까지 검색한다.
 */
export default function SearchPanel({ query, onQueryChange, onSubmit, isSearching, results, onResultClick, onClose }) {
  useStylesheet('/css/search-panel.css');
  const inputRef = useRef(null);
  const [pinnedQuery, setPinnedQuery] = useState(null); // 마지막으로 "실제 검색"한 문자열(입력 중인 것과 구분)

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPinnedQuery(query);
    onSubmit();
  };

  return (
    <div className="search-panel">
      <form className="search-panel-header" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="search-panel-input"
          placeholder="프로젝트 전체에서 검색 (캡션, 설명, 속성 값 전부)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="submit" className="search-panel-submit" disabled={!query.trim() || isSearching}>
          {isSearching ? '검색 중...' : '검색'}
        </button>
        <span className="search-panel-count">
          {pinnedQuery && !isSearching ? `${results.length}건` : ''}
        </span>
        <button type="button" className="search-panel-close" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </form>

      <div className="search-panel-list">
        {isSearching && <div className="search-panel-empty">프로젝트 전체를 확인 중...</div>}
        {!isSearching && pinnedQuery && results.length === 0 && (
          <div className="search-panel-empty">"{pinnedQuery}"에 대한 결과가 없습니다.</div>
        )}
        {!isSearching &&
          results.map((r, i) => (
            <button
              type="button"
              key={`${r.pageInclude}-${r.blockId}-${i}`}
              className="search-panel-item"
              onClick={() => onResultClick(r)}
            >
              <span className="search-panel-item-page">{r.pageLabel}</span>
              <span className="search-panel-item-caption">{r.caption || r.metaName}</span>
              <span className="search-panel-item-matches">
                {r.matches.map((m, j) => (
                  <span className="search-panel-match-tag" key={j}>
                    <b>{m.field}</b>: {String(m.value)}
                  </span>
                ))}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
