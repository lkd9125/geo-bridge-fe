import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Pages.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const message = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokenData = await login(username, password);
      authLogin(tokenData);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page form-page">
      <h1>로그인</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          아이디
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
        <p className="form-footer">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </form>
    </div>
  );
}
