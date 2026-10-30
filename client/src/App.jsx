import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { TopBar } from './components/TopBar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingDrop } from './components/LoadingDrop';
import { Sparkles, Server } from 'lucide-react';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const SandboxPage = lazy(() => import('./pages/SandboxPage').then((m) => ({ default: m.SandboxPage })));
const LevelsPage = lazy(() => import('./pages/LevelsPage').then((m) => ({ default: m.LevelsPage })));
const PlayPage = lazy(() => import('./pages/PlayPage').then((m) => ({ default: m.PlayPage })));
const PracticePage = lazy(() => import('./pages/PracticePage').then((m) => ({ default: m.PracticePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const DevLevelPage = lazy(() => import('./pages/DevLevelPage').then((m) => ({ default: m.DevLevelPage })));

export function App() {
  const { bootstrap, wakingUp } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-soft text-navy relative">
        {/* Waking Up The Server banner for free-tier delays */}
        {wakingUp && (
          <div className="bg-sunny-yellow text-navy px-4 py-2 text-center text-xs font-heading font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-300">
            <Server className="w-4 h-4 animate-pulse text-navy" />
            <span>Waking up the server... please hold on while the free instance boots up.</span>
          </div>
        )}

        <TopBar />

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <LoadingDrop message="Loading page..." />
              </div>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/sandbox" element={<SandboxPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                path="/levels"
                element={
                  <ProtectedRoute>
                    <LevelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/:levelId"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <PlayPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/practice/:seed"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <PracticePage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Dev-only route for testing levels without login */}
              {import.meta.env.DEV && (
                <Route
                  path="/dev/level/:id"
                  element={
                    <ErrorBoundary>
                      <DevLevelPage />
                    </ErrorBoundary>
                  }
                />
              )}

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
