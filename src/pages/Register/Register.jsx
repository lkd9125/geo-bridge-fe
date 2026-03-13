import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth.js';
import '../Pages.css';
import '../Auth.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, password);
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해 주세요.' } });
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page form-page auth-page">
      <div className="auth-card">
        <div className="auth-card-accent" aria-hidden />
        <div className="auth-card-inner">
          <h1>회원가입</h1>
          <p className="auth-subtitle">새 계정을 만들고 서비스를 이용해 보세요.</p>
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
                autoComplete="new-password"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </button>
            <p className="form-footer">
              이미 계정이 있으신가요? <Link to="/login">로그인</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
