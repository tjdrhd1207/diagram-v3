import { useEffect, useMemo, useRef, useState } from 'react';
import DiagramCanvas from './components/DiagramCanvas.jsx';
import RibbonMenu from './components/RibbonMenu.jsx';
import ProjectPagesPanel from './components/ProjectPagesPanel.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import designerMeta from './meta/designer.meta.json';
import PropertyPanel from './components/PropertyPanel.jsx';
import { withGroupFaceMeta } from './lib/blockGrouping.js';
import { parsePrjXml, findPrjFile, buildFileIndex } from './lib/prjFile.js';
import { looksLikeDesignerXml, convertDesignerXmlToScenarioXml } from './lib/designerXml.js';
import { extractPromptRowsFromProject, buildPromptCsv } from './lib/promptExport.js';
import { searchProject } from './lib/projectSearch.js';
import { readPropertyValue, findTargetPageProp, findTargetBlockProp } from './lib/nodeProperties.js';

export default function App() {
  const diagramRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeInsertNode, setActiveInsertNode] = useState(null);

  // .prj로 연 프로젝트의 상태 — 단일 파일 열기(위 initialXml)와는 별개다. 폴더
  // 하나를 통째로 읽어서 { name, pages, files: Map<파일명, File> }로 들고 있다가,
  // ProjectPagesPanel에서 페이지를 고르면 그 페이지의 File을 읽어 캔버스에 띄운다.
  const [project, setProject] = useState(null);
  const [activePageInclude, setActivePageInclude] = useState(null);

  // DiagramCanvas는 마운트 시점에 딱 한 번만 Diagram 인스턴스를 만드는 "언컨트롤드"
  // 래퍼라(=제일 위 파일 주석 참고), "새 프로젝트"나 "프로젝트 열기"처럼 캔버스
  // 자체를 통째로 새로 시작해야 하는 액션은 canvasKey를 올려서 컴포넌트를 완전히
  // 리마운트시키는 방식으로 구현한다 — 새 useId → 새 svgId → 새 Diagram 인스턴스.
  // initialXml이 채워진 채로 리마운트되면 DiagramCanvas는 new Diagram() 대신
  // Diagram.deserialize()로 그 XML을 불러온 상태로 시작한다.
  const [canvasKey, setCanvasKey] = useState(0);
  const [initialXml, setInitialXml] = useState(null);

  // designer.meta.json 자체는 건드리지 않고, 그룹 얼굴 블록이 저장/삭제 시 필요로 하는
  // 합성 메타 엔트리(__GROUP_FACE__)를 얹은 버전을 한 번만 만들어서 하위 컴포넌트
  // 전체에 원래 designerMeta 대신 이걸 내려준다.
  const effectiveMeta = useMemo(() => withGroupFaceMeta(designerMeta), []);

  // 정확히 블록 1개가 선택됐을 때만 값이 채워지는 상태 - 프로퍼티 패널이
  // 이 상태를 보고 어떤 블록을 보여줄지 결정한다.
  const [selectedBlock, setSelectedBlock] = useState(null);
  // 블록을 더블클릭했을 때 "이 블록의 스크립트 편집창을 열어달라"는 요청 —
  // PropertyPanel이 이 값을 보고 자기 안의 ScriptEditorModal을 자동으로 연다.
  // 소비(연 뒤)하면 다시 null로 돌려놔서, 나중에 같은 블록을 (더블클릭이 아니라)
  // 그냥 선택만 해도 매번 자동으로 열리는 일이 없게 한다.
  const [autoOpenScriptEditorBlockId, setAutoOpenScriptEditorBlockId] = useState(null);

  // 지금 캔버스(=지금 열려있는 페이지 하나)에 "이 페이지를 열고 나서 뭔가
  // 바뀐 적이 있는지"만 기억하는 단순 플래그. 원본 파일 텍스트나 serialize()
  // 결과를 서로 비교하는 방식은 안 쓴다 — 레거시 디자이너 XML은 로드 시점에
  // 이 앱 자체 포맷으로 변환돼버려서 편집이 전혀 없어도 항상 "다르다"로 나오는
  // 문제가 있었다(검토 단계에서 123.xml로 직접 확인: 원본 1,518,937자 vs
  // 변환 후 serialize() 124,753자). 대신 "편집으로 볼만한 이벤트가 한 번이라도
  // 일어났는가"만 추적한다 — 로드 자체(및 로드 직후 자동 보정: 색상 backfill,
  // 겹침 완화 등)는 이 플래그를 건드리지 않는다(onDiagramModified는 diagram.ready
  // 가 true가 되기 전까지 발생하지 않고, 자동 보정 함수들은 그 이벤트를 발생시키는
  // 경로를 아예 안 탄다 — diagram-library.js 확인 완료).
  const [isCurrentPageDirty, setIsCurrentPageDirty] = useState(false);
  const markCurrentPageDirty = () => setIsCurrentPageDirty(true);

  // Ctrl+F로 열리는 "프로젝트 전체 검색" 패널 상태.
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // 검색 결과에서 다른 페이지의 블록을 클릭했을 때, 그 페이지로 전환하는
  // 동안(비동기 파일 읽기 + 캔버스 리마운트) 잠깐 들고 있는 "그 블록으로
  // 이동해야 한다"는 요청 — 새 캔버스가 준비되면(canvasKey 변경) 소비한다.
  const [pendingFocusBlockId, setPendingFocusBlockId] = useState(null);

  useEffect(( ) => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setActiveInsertNode(null);
      }
      // 브라우저 기본 페이지 찾기 대신 프로젝트 전체 검색 패널을 연다.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchPanel(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // 리마운트로 캔버스를 갈아끼우기 전에, 이전 캔버스를 가리키던 선택 상태를 먼저
  // 비워둔다 — 안 그러면 새 캔버스가 마운트되는 동안 PropertyPanel이 잠깐이라도
  // 이제는 사라진 이전 블록을 계속 보여주는 상태로 남을 수 있다.
  const resetSelectionState = () => {
    setSelectedCount(0);
    setSelectedBlock(null);
    setActiveInsertNode(null);
    setIsCurrentPageDirty(false);
  };

  // 파일 내용이 as-is 디자이너의 편집 원본 포맷(<Diagram><Nodes>...)이면 우리
  // Diagram.deserialize()가 이해하는 <scenario> XML로 미리 변환한다. 이미 우리
  // 형식으로 저장된(.xml) 파일은 그대로 통과시킨다 — 직접 저장한 파일도 계속 열려야
  // 하므로. designer.meta.json에 없는 노드 타입이 있었다면 알림으로 알려준다.
  const resolveScenarioXml = (text) => {
    if (!looksLikeDesignerXml(text)) return text;
    const { xml, skippedNodeTypes } = convertDesignerXmlToScenarioXml(text, effectiveMeta);
    if (skippedNodeTypes.length > 0) {
      window.alert(
        `meta.json에 정의되지 않은 노드 타입이 있어 건너뛰었습니다: ${skippedNodeTypes.join(', ')}`
      );
    }
    return xml;
  };

  const handleNewProject = () => {
    if (!window.confirm('현재 작업 중인 내용은 저장되지 않습니다. 새 프로젝트를 시작할까요?')) return;
    resetSelectionState();
    setProject(null);
    setActivePageInclude(null);
    setInitialXml(null);
    setCanvasKey((key) => key + 1);
  };

  const handleOpenProjectClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 열 수 있도록 매번 비워준다 (안 그러면 두 번째부터는
    // input의 change 이벤트가 아예 안 뜬다 — 같은 파일이라 값이 안 바뀌므로).
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(`"${file.name}" 파일을 불러올까요? 현재 작업 중인 내용은 저장되지 않습니다.`)) return;

    const reader = new FileReader();
    reader.onload = () => {
      resetSelectionState();
      setProject(null);
      setActivePageInclude(null);
      setInitialXml(resolveScenarioXml(String(reader.result)));
      setCanvasKey((key) => key + 1);
    };
    // onerror 없이는 읽기 실패가 완전히 조용하다 — onload가 그냥 안 불리고
    // 끝나서, 화면엔 "클릭했는데 아무 일도 안 일어남"으로만 보인다.
    reader.onerror = () => {
      window.alert(`"${file.name}" 파일을 읽는 중 오류가 발생했습니다: ${reader.error?.message ?? reader.error}`);
    };
    reader.readAsText(file);
  };

  const handleOpenProjectFolderClick = () => folderInputRef.current?.click();

  // 페이지 하나를 읽어서 캔버스에 띄운다 — 폴더를 처음 열 때(시작 페이지)와
  // 목록에서 다른 페이지를 고를 때 둘 다 이 함수를 거친다.
  const loadPageIntoCanvas = (fileMap, include) => {
    const file = fileMap.get(include);
    if (!file) {
      window.alert(
        `"${include}" 파일을 이 폴더에서 찾지 못했습니다.\n.prj와 같은 폴더에 그 파일이 있는지 확인해주세요.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resetSelectionState();
      setActivePageInclude(include);
      setInitialXml(resolveScenarioXml(String(reader.result)));
      setCanvasKey((key) => key + 1);
    };
    // onerror 없이는 읽기 실패가 완전히 조용하다 — onload가 그냥 안 불리고
    // 끝나서, 화면엔 "클릭했는데 아무 일도 안 일어남"으로만 보인다. webkitdirectory로
    // 받은 File 핸들은 OS/브라우저에 따라 시간이 지나거나 원본 파일이 옮겨지면
    // 무효화될 수 있는데, 그런 경우 여기로 떨어진다.
    reader.onerror = () => {
      window.alert(`"${include}" 파일을 읽는 중 오류가 발생했습니다: ${reader.error?.message ?? reader.error}`);
    };
    reader.readAsText(file);
  };

  const handleFolderSelected = (e) => {
    // e.target.files는 input에 물려있는 "라이브" FileList라, 아래 e.target.value = ''
    // 로 입력값을 리셋하는 순간 이 참조가 가리키는 내용까지 같이 비어버린다(같은
    // 객체를 나중에 다시 읽어도 length가 0) — 그래서 배열로 즉시 복사해 떼어내야
    // 한다. 위쪽 handleFileSelected는 File 객체 하나만 인덱싱해서 뽑아두기 때문에
    // 같은 문제가 없다(File 자체는 라이브가 아님, FileList 컨테이너만 라이브).
    const fileList = [...e.target.files];
    e.target.value = '';
    if (fileList.length === 0) return;

    const prjFile = findPrjFile(fileList);
    if (!prjFile) {
      window.alert('선택한 폴더에서 .prj 파일을 찾지 못했습니다.');
      return;
    }
    if (!window.confirm(`"${prjFile.name}" 프로젝트를 불러올까요? 현재 작업 중인 내용은 저장되지 않습니다.`)) return;

    const fileIndex = buildFileIndex(fileList);
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = parsePrjXml(String(reader.result));
      } catch (err) {
        window.alert(err.message);
        return;
      }
      const missingCount = parsed.pages.filter((p) => !fileIndex.has(p.include)).length;
      setProject({ ...parsed, files: fileIndex, missingCount });

      // 시작 페이지(IsStart) 우선, 없으면 마지막에 열려 있던 페이지, 그것도 없으면
      // 목록의 첫 페이지 — 어느 쪽이든 실제로 폴더에서 찾은 파일이어야 한다.
      const candidates = [
        ...parsed.pages.filter((p) => p.isStart),
        ...parsed.pages.filter((p) => p.lastOpened),
        ...parsed.pages,
      ];
      const firstAvailable = candidates.find((p) => fileIndex.has(p.include));
      if (firstAvailable) {
        loadPageIntoCanvas(fileIndex, firstAvailable.include);
      } else {
        resetSelectionState();
        setActivePageInclude(null);
        setInitialXml(null);
        setCanvasKey((key) => key + 1);
      }
    };
    reader.onerror = () => {
      window.alert(`"${prjFile.name}" 파일을 읽는 중 오류가 발생했습니다: ${reader.error?.message ?? reader.error}`);
    };
    reader.readAsText(prjFile);
  };

  const handleSelectPage = (page) => {
    if (!project) return;
    if (page.include === activePageInclude) return; // 이미 보고 있는 페이지 — 다시 읽을 필요 없음.
    if (isCurrentPageDirty) {
      if (!window.confirm('현재 페이지에 저장하지 않은 변경사항이 있습니다. 저장하지 않고 다른 페이지로 이동할까요?')) {
        return;
      }
    }
    loadPageIntoCanvas(project.files, page.include);
  };

  // 지금 열려있는 페이지는 (저장 여부와 무관하게) 화면에 떠 있는 라이브
  // diagram으로 검색해서 저장 안 한 편집도 잡히게 하고, 나머지 페이지는
  // 디스크 파일을 읽어서 검색한다 — projectSearch.js 참고.
  const handleSearchSubmit = async () => {
    if (!project) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { results } = await searchProject(
        searchQuery,
        project,
        effectiveMeta,
        diagramRef.current?.getInstance?.() ?? null,
        activePageInclude
      );
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 결과 클릭과 goto류 블록(GotoPageNode 등) 더블클릭이 공유하는 이동
  // 로직 — "다른 페이지의 특정 블록으로 이동"이라는 목적이 완전히 같다.
  const navigateToBlockInPage = (pageInclude, blockId) => {
    if (pageInclude === activePageInclude) {
      diagramRef.current?.focusBlock(blockId);
      return;
    }
    if (!project) {
      window.alert('다른 페이지로 이동하려면 먼저 "프로젝트 열기"로 폴더를 열어야 합니다.');
      return;
    }
    if (isCurrentPageDirty) {
      if (!window.confirm('현재 페이지에 저장하지 않은 변경사항이 있습니다. 저장하지 않고 다른 페이지로 이동할까요?')) {
        return;
      }
    }
    setPendingFocusBlockId(blockId);
    loadPageIntoCanvas(project.files, pageInclude);
  };

  const handleSearchResultClick = (result) => {
    navigateToBlockInPage(result.pageInclude, result.blockId);
  };

  // GotoPageNode/CallPageNode/CatchNode/DiagnoseNode처럼 다른 블록(및 페이지)을
  // 가리키는 블록을 더블클릭하면 그 대상으로 바로 이동한다. TargetPage가
  // 비어있거나 "<현재페이지>"(as-is 디자이너가 쓰는 리터럴 — GotoPageNode의
  // buildScript에서 확인)면 지금 페이지 안에서, 그 외엔 다른 페이지 파일명으로
  // 본다.
  const handleGotoBlockDoubleClick = (block) => {
    const nodeDef = effectiveMeta?.nodes?.[block.metaName];
    const targetPageProp = findTargetPageProp(nodeDef);
    const targetBlockProp = findTargetBlockProp(nodeDef);
    if (!targetPageProp || !targetBlockProp) return false;

    const targetBlockId = readPropertyValue(block.userData, targetBlockProp);
    if (!targetBlockId) return false; // 아직 대상이 안 채워진 블록 — 기존 캡션 수정으로 폴백.

    const targetPageValue = readPropertyValue(block.userData, targetPageProp);
    const isSamePage = !targetPageValue || targetPageValue === '<현재페이지>';
    navigateToBlockInPage(isSamePage ? activePageInclude : targetPageValue, targetBlockId);
    return true;
  };

  // 검색 결과 클릭으로 다른 페이지를 새로 불러온 경우, 그 캔버스가 준비된
  // 시점(canvasKey 변경 = DiagramCanvas 리마운트 완료)에 대기 중이던 focus 요청을
  // 소비한다. 리액트는 자식(DiagramCanvas)의 마운트 effect를 부모(이 effect)보다
  // 먼저 실행하므로, 이 시점엔 이미 diagramRef.current에 블록들이 채워져 있다.
  useEffect(() => {
    if (pendingFocusBlockId) {
      diagramRef.current?.focusBlock(pendingFocusBlockId);
      setPendingFocusBlockId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasKey]);

  const handleSaveProject = () => {
    const xml = diagramRef.current?.serialize?.();
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 여기서 저장하는 건 지금 캔버스 하나(=페이지 하나)의 <scenario> XML이다.
    // .prj는 이 내용을 담는 파일이 아니라 여러 .xml 페이지를 가리키는 별도의
    // 프로젝트 인덱스 포맷이라(123.prj 샘플로 확인), 확장자를 .prj로 붙이면
    // 오히려 헷갈린다 — 실제 페이지 파일들과 같은 .xml로 저장한다.
    a.download = 'scenario.xml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setIsCurrentPageDirty(false);
  };

  // 지금 열려있는 페이지 하나가 아니라, 프로젝트에 딸린 .xml 페이지 전부를
  // 훑어서 AudioData(음성재생) 계열 블록의 멘트명/설명을 CSV 하나로 모은다.
  // 캔버스에 실제로 열려있을 필요가 없으므로 project.files의 File들을 직접
  // 읽어서 처리한다 — 자세한 내용은 promptExport.js 참고.
  const handleExportPromptList = async () => {
    if (!project) return;
    const { rows, skippedByPage, failedPages } = await extractPromptRowsFromProject(project, effectiveMeta);

    if (rows.length === 0) {
      window.alert('AudioData 프로퍼티를 가진 블록(음성 재생 계열)을 프로젝트 전체에서 찾지 못했습니다.');
      return;
    }

    const csv = buildPromptCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || '프로젝트'}_멘트목록.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (skippedByPage.length > 0 || failedPages.length > 0) {
      const lines = [`${rows.length}개 항목을 내보냈습니다.`];
      if (skippedByPage.length > 0) {
        lines.push(
          '',
          '일부 페이지에서 meta.json에 없는 노드 타입을 건너뛰었습니다:',
          ...skippedByPage.map((s) => `- ${s.page}: ${s.types.join(', ')}`)
        );
      }
      if (failedPages.length > 0) {
        lines.push(
          '',
          '다음 페이지는 읽지 못해 건너뛰었습니다:',
          ...failedPages.map((f) => `- ${f.page}: ${f.message}`)
        );
      }
      window.alert(lines.join('\n'));
    }
  };

  return (
    <div className="app-shell">
      {/* 화면에는 절대 안 보이고, "열기" 리본 버튼이 클릭을 여기로 위임한다.
          이건 시나리오 페이지 하나짜리 .xml만 대상으로 한다 — .prj는 실제로는
          다이어그램이 아니라 프로젝트 인덱스라 이 경로로 열면 빈 캔버스만 나온다
          (123.prj 샘플로 직접 확인). .prj는 아래 "프로젝트 열기"(폴더 선택) 전용. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* .prj가 가리키는 개별 .xml 페이지 파일들은 .prj와 같은 폴더에 있으므로,
          폴더째로 선택해서 한 번에 다 읽어들인다. */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderSelected}
      />

      <RibbonMenu
        diagramRef={diagramRef}
        meta={effectiveMeta}
        selectedCount={selectedCount}
        selectedBlock={selectedBlock}
        activeInsertNode={activeInsertNode}
        onInsertClick={setActiveInsertNode}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProjectClick}
        onOpenProjectFolder={handleOpenProjectFolderClick}
        onSaveProject={handleSaveProject}
        onExportPromptList={handleExportPromptList}
        hasProject={!!project}
      />

      <div className="workspace">
        {project && (
          <ProjectPagesPanel
            project={project}
            activeInclude={activePageInclude}
            activeIsDirty={isCurrentPageDirty}
            onSelectPage={handleSelectPage}
            onClose={() => setProject(null)}
          />
        )}

        <div className="canvas-area">
          <DiagramCanvas
            key={canvasKey}
            ref={diagramRef}
            meta={effectiveMeta}
            initialXml={initialXml}
            onSelectionChange={setSelectedCount}
            onSelectedBlockChange={setSelectedBlock}
            onInsertModeConsumed={() => setActiveInsertNode(null)}
            onLoadError={(message) => window.alert(message)}
            options={{
              onZoomed: (scale) => setZoom(scale),
              onDiagramModified: markCurrentPageDirty,
              onNodeDoubleClicked: (block) => {
                if (handleGotoBlockDoubleClick(block)) return true;

                const hasScriptEditor = effectiveMeta?.nodes?.[block.metaName]?.properties?.some(
                  (p) => p.customEditorTypeName === 'ScriptEditor'
                );
                if (!hasScriptEditor) return false;
                setAutoOpenScriptEditorBlockId(block.id);
                return true;
              },
            }}
          />
        </div>

        <PropertyPanel
          block={selectedBlock}
          meta={effectiveMeta}
          autoOpenScriptEditorBlockId={autoOpenScriptEditorBlockId}
          onAutoOpenScriptEditorConsumed={() => setAutoOpenScriptEditorBlockId(null)}
          onDirty={markCurrentPageDirty}
        />
      </div>

      <div className="app-statusbar">
        <span>선택된 노드: {selectedCount}개</span>
        <span>확대/축소: {Math.round((1 / zoom) * 100) || 100}%</span>
      </div>

      {showSearchPanel && (
        <SearchPanel
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onSubmit={handleSearchSubmit}
          isSearching={isSearching}
          results={searchResults}
          onResultClick={handleSearchResultClick}
          onClose={() => setShowSearchPanel(false)}
        />
      )}
    </div>
  );
}
