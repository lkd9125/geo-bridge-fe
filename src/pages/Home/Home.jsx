import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import logo from '../../assets/logo.svg';
import './Home.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="home-hero">
        <img src={logo} alt="Geo Bridge animated logo" className="home-logo" />
        <p className="home-tagline">지도 위 클릭 한 번으로 시작하는 위치 데이터 시뮬레이터</p>
        <p className="home-desc">
          지도 위에 경로를 그리면 설정한 속도에 맞춰 실시간 좌표가 생성됩니다. 별도의 하드웨어 없이도 MQTT, TCP, HTTP, WebSocket 등 다양한 프로토콜로 드론·차량의 이동을 즉시 시뮬레이션하고 모니터링하세요.
        </p>
      </section>

      {user ? (
        <section className="home-section">
          <h2 className="home-section-title">서비스 바로가기</h2>
          <div className="home-grid">
            <Link to="/host" className="home-card">
              <span className="home-card-icon" aria-hidden>⚙</span>
              <h3 className="home-card-title">호스트 설정</h3>
              <p className="home-card-desc">전송할 서버(MQTT, TCP 등) 연결 정보를 등록합니다.</p>
            </Link>
            <Link to="/format" className="home-card">
              <span className="home-card-icon" aria-hidden>📄</span>
              <h3 className="home-card-title">데이터 포맷</h3>
              <p className="home-card-desc">좌표를 담을 JSON/XML 등 전송 포맷을 정의합니다.</p>
            </Link>
            <Link to="/map" className="home-card">
              <span className="home-card-icon" aria-hidden>🗺</span>
              <h3 className="home-card-title">지도 시뮬레이터</h3>
              <p className="home-card-desc">지도에서 경로를 찍고 속도를 설정해 시뮬레이션을 실행합니다.</p>
            </Link>
            <Link to="/map/monitoring" className="home-card">
              <span className="home-card-icon" aria-hidden>📡</span>
              <h3 className="home-card-title">모니터링</h3>
              <p className="home-card-desc">실시간으로 전송 중인 시뮬레이터 위치를 지도에서 확인합니다.</p>
            </Link>
            <Link to="/load-test" className="home-card">
              <span className="home-card-icon" aria-hidden>🔥</span>
              <h3 className="home-card-title">부하테스트</h3>
              <p className="home-card-desc">동일 조건으로 시뮬레이터를 다수 실행해 부하를 점검합니다.</p>
            </Link>
          </div>
        </section>
      ) : (
        <section className="home-section">
          <h2 className="home-section-title">시작하기</h2>
          <p className="home-section-desc">서비스를 이용하려면 로그인해 주세요.</p>
          <div className="home-grid">
            <Link to="/login" className="home-card">
              <span className="home-card-icon" aria-hidden>→</span>
              <h3 className="home-card-title">로그인</h3>
              <p className="home-card-desc">이미 계정이 있다면 로그인합니다.</p>
            </Link>
            <Link to="/register" className="home-card">
              <span className="home-card-icon" aria-hidden>+</span>
              <h3 className="home-card-title">회원가입</h3>
              <p className="home-card-desc">새 계정을 만들어 서비스를 이용합니다.</p>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
