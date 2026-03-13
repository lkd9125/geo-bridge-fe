import { useEffect, Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
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
  useEffect(() => {
    const handler = () => navigate('/login', { replace: true });
    window.addEventListener('auth-required', handler);
    return () => window.removeEventListener('auth-required', handler);
  }, [navigate]);
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
