import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import HostForm from './pages/HostForm.jsx';
import FormatForm from './pages/FormatForm.jsx';
import MapSimulator from './pages/MapSimulator.jsx';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
