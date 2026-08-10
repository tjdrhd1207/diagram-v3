import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { useStylesheet } from './lib/useStylesheet.js';

function Root() {
  useStylesheet('/css/index.css'); // 전역 스타일 — public/css/index.css
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
