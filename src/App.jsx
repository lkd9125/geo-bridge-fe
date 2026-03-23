import { useEffect, Fragment } from 'react';
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { apiClient } from './api/client.js';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home/Home.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import HostForm from './pages/HostForm/HostForm.jsx';
import FormatForm from './pages/FormatForm/FormatForm.jsx';
import MapSimulator from './pages/MapSimulator/MapSimulator.jsx';
import MapMonitoring from './pages/MapMonitoring/MapMonitoring.jsx';
import LoadTest from './pages/LoadTest/LoadTest.jsx';
import { prefersHashRouter } from './utils/runtimeEnv.js';
import './App.css';

/** file:// 또는 (선택) Electron preload 플래그 → HashRouter, 그 외 BrowserRouter */
function AppRouter({ children }) {
  if (prefersHashRouter()) {
    return <HashRouter>{children}</HashRouter>;
  }
  return <BrowserRouter>{children}</BrowserRouter>;
}

function AuthRequiredListener() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = () => {
      logout();
      navigate('/', { replace: true });
    };
    window.addEventListener('auth-required', handler);
    return () => window.removeEventListener('auth-required', handler);
  }, [navigate, logout]);

  // 페이지 이동 시 토큰 헬스 체크
  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/user/info')
      .catch(() => {
        // 401/J403 등은 interceptor에서 auth-required 이벤트를 발생시켜 처리됨
      });
  }, [location.pathname, user]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <AppRouter>
        <Fragment>
          <AuthRequiredListener />
          <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="host"
              element={
                <ProtectedRoute>
                  <HostForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="format"
              element={
                <ProtectedRoute>
                  <FormatForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="map"
              element={
                <ProtectedRoute>
                  <MapSimulator />
                </ProtectedRoute>
              }
            />
            <Route
              path="map/monitoring"
              element={
                <ProtectedRoute>
                  <MapMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="load-test"
              element={
                <ProtectedRoute>
                  <LoadTest />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Fragment>
      </AppRouter>
    </AuthProvider>
  );
}

export default App;
