import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-logo">Geo Bridge</Link>
        <nav className="layout-nav">
          {user ? (
            <>
              <Link to="/host">호스트</Link>
              <Link to="/format">포맷</Link>
              <Link to="/map">지도 시뮬레이터</Link>
              <button type="button" onClick={handleLogout} className="layout-logout">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link to="/register">회원가입</Link>
            </>
          )}
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
