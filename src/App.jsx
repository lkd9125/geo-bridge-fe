import { useEffect, Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import './App.css';

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
      <BrowserRouter>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Fragment>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
