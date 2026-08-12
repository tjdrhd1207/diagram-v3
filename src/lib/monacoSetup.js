import * as monaco from 'monaco-editor';
// The base 'monaco-editor' entry only registers basic syntax-highlighting
// definitions -- the actual JS/TS language service (IntelliSense,
// addExtraLib, diagnostics) lives in this separate contribution and has to
// be pulled in explicitly, or monaco.languages.typescript stays undefined.
import 'monaco-editor/language/typescript/monaco.contribution';
import { loader } from '@monaco-editor/react';
// monaco-editor's package.json "exports" map already prefixes every
// subpath with esm/vs/ -- `monaco-editor/esm/vs/...` would double that up
// and fail to resolve. The correct request is the path *after* esm/vs/.
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

/**
 * By default @monaco-editor/react fetches Monaco (and its workers) from a
 * CDN at runtime. That's an unnecessary external dependency for an
 * internal tool that may run on a restricted network, and it makes first
 * open slow/flaky. Point the loader at the `monaco-editor` package already
 * bundled by Vite instead — this must run before the first <Editor> mounts,
 * so it's imported for its side effect at the top of ScriptEditorModal.jsx.
 */
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco });
