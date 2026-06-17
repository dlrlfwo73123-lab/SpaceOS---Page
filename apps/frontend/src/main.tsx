import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

const crashFallback = (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
    <span className="text-3xl">⚠️</span>
    <p className="text-sm font-semibold text-slate-700">화면을 표시하는 중 오류가 발생했습니다</p>
    <p className="max-w-sm text-xs text-slate-500">새로고침해도 같은 문제가 반복되면 콘솔 로그를 확인해 주세요.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={crashFallback}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
