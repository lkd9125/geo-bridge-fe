import { useState } from 'react';
import { createHost } from '../api/host.js';
import './Pages.css';

const EMITTER_TYPES = ['MQTT', 'TCP', 'HTTP', 'WS'];

export default function HostForm() {
  const [form, setForm] = useState({
    type: 'MQTT',
    host: '',
    name: '',
    topic: '',
    hostId: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const body = {
        type: form.type,
        host: form.host,
        name: form.name,
        ...(form.topic && { topic: form.topic }),
        ...(form.hostId && { hostId: form.hostId }),
        ...(form.password && { password: form.password }),
      };
      await createHost(body);
      setSuccess(true);
      setForm({ type: 'MQTT', host: '', name: '', topic: '', hostId: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page form-page">
      <h1>호스트 저장</h1>
      <p className="form-desc">연결할 서버(호스트) 정보를 입력하세요.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          프로토콜 타입
          <select name="type" value={form.type} onChange={handleChange} required>
            {EMITTER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          호스트 (주소)
          <input
            type="text"
            name="host"
            value={form.host}
            onChange={handleChange}
            placeholder="예: mqtt://broker.example.com:1883"
            required
          />
        </label>
        <label>
          이름 (식별용)
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="예: My MQTT Broker"
            required
          />
        </label>
        <label>
          토픽 (선택)
          <input
            type="text"
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="MQTT 토픽 (선택)"
          />
        </label>
        <label>
          호스트 아이디 (선택)
          <input
            type="text"
            name="hostId"
            value={form.hostId}
            onChange={handleChange}
          />
        </label>
        <label>
          비밀번호 (선택)
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">저장되었습니다.</p>}
        <button type="submit" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
