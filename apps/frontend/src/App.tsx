import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegionAnalysisPage from './pages/RegionAnalysisPage';
import IndustryAnalysisPage from './pages/IndustryAnalysisPage';
import AnalysisResultPage from './pages/AnalysisResultPage';

const Dashboard = lazy(() => import('./pages/DashboardPage'));

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/region" element={<RegionAnalysisPage />} />
        <Route path="/industry" element={<IndustryAnalysisPage />} />
        <Route path="/result" element={<AnalysisResultPage />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-400">불러오는 중…</div>}>
              <Dashboard />
            </Suspense>
          }
        />
      </Routes>
    </HashRouter>
  );
}
