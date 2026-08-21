import { useMemo, useState } from 'react';
import { useStylesheet } from '../lib/useStylesheet.js';

/**
 * .prj가 나열하는 페이지(=개별 시나리오 .xml 파일) 목록을 평평한 목록 + 검색으로
 * 보여주는 사이드 패널. 파일명 접두사로 계층(123_2, 123_2_1 ...)이 느껴지긴 하지만
 * .prj 안에 명시적 부모-자식 필드가 없어서(실제 123.prj로 확인) 트리로 재구성하지
 * 않고 Tag(메뉴 이름) 기준 평평한 목록 + 검색으로만 제공한다.
 *
 * 폴더 선택(webkitdirectory)으로 같이 딸려온 파일들 중 실제로 못 찾은 페이지는
 * "파일 없음"으로 표시한다. 예전엔 이 항목을 disabled 버튼으로 막아서 클릭해도
 * 아무 반응이 없게 했었는데, 그러면 "왜 클릭해도 안 열리지?"가 그냥 조용한
 * 무반응으로만 보여서 원인을 알기 어려웠다(disabled 버튼은 onClick 자체가 안
 * 뜬다) — 지금은 못 찾은 것도 그대로 클릭되게 두고, onSelectPage(App.jsx)가
 * "이 폴더에서 못 찾았다"는 걸 alert로 명확히 알려주도록 바꿨다.
 */
export default function ProjectPagesPanel({ project, activeInclude, onSelectPage, onClose }) {
  useStylesheet('/css/project-pages-panel.css');
  const [query, setQuery] = useState('');

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return project.pages;
    return project.pages.filter(
      (p) => p.tag.toLowerCase().includes(q) || p.include.toLowerCase().includes(q)
    );
  }, [project.pages, query]);

  return (
    <div className="project-pages-panel">
      <div className="project-pages-header">
        <div className="project-pages-title-row">
          <div className="project-pages-title">{project.name || '프로젝트'}</div>
          <button type="button" className="project-pages-close" onClick={onClose} title="프로젝트 패널 닫기">
            ✕
          </button>
        </div>
        <div className="project-pages-subtitle">
          페이지 {project.pages.length}개
          {project.missingCount > 0 && ` · 파일 없음 ${project.missingCount}개`}
        </div>
        <input
          className="project-pages-search"
          type="text"
          placeholder="페이지 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="project-pages-list">
        {filteredPages.length === 0 && <div className="project-pages-empty">검색 결과가 없습니다.</div>}
        {filteredPages.map((page) => {
          const found = project.files.has(page.include);
          const isActive = page.include === activeInclude;
          return (
            <button
              type="button"
              key={page.include}
              className={`project-page-item ${isActive ? 'is-active' : ''} ${found ? '' : 'is-missing'}`}
              onClick={() => onSelectPage(page)}
              title={found ? undefined : '이 폴더에서 해당 파일을 찾지 못했습니다. 클릭하면 안내가 뜹니다.'}
            >
              <div className="project-page-label">
                {page.tag || page.include}
                {page.isStart && <span className="project-page-badge project-page-badge-start">시작</span>}
                {page.isEmbedded && <span className="project-page-badge">임베디드</span>}
                {!found && <span className="project-page-badge project-page-badge-missing">파일 없음</span>}
              </div>
              <div className="project-page-filename">{page.include}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
