import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Pages.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="page home-page">
      <h1>Geo Bridge</h1>
      <p className="home-desc">
        지도에서 좌표를 선택하고, 속도에 맞춰 위치 데이터를 전송하는 시뮬레이터입니다.
      </p>
      {user ? (
        <div className="home-links">
          <Link to="/host" className="card-link">호스트 설정</Link>
          <Link to="/format" className="card-link">데이터 포맷 설정</Link>
          <Link to="/map" className="card-link">지도 시뮬레이터</Link>
          <Link to="/map/monitoring" className="card-link">모니터링</Link>
        </div>
      ) : (
        <div className="home-links">
          <Link to="/login" className="card-link">로그인</Link>
          <Link to="/register" className="card-link">회원가입</Link>
        </div>
      )}
    </div>
  );
}
