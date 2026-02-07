import { useState } from 'react';
import { createFormat } from '../api/format.js';
import './Pages.css';

export default function FormatForm() {
  const [form, setForm] = useState({
    name: '',
    format: '',
    contentType: '',
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
        name: form.name,
        format: form.format,
        ...(form.contentType && { contentType: form.contentType }),
      };
      await createFormat(body);
      setSuccess(true);
      setForm({ name: '', format: '', contentType: '' });
    } catch (err) {
      setError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatExample = `{"lat":#{lat},"lon":#{lon}}`;
  const formatExampleXml = `<point lat="#{lat}" lon="#{lon}"/>`;

  return (
    <div className="page form-page">
      <h1>데이터 포맷 저장</h1>
      <p className="form-desc">
        좌표 전송 시 사용할 포맷을 정의합니다. <code>#{lat}</code>, <code>#{lon}</code> 에 위도·경도가 들어갑니다.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          포맷 이름 (별칭)
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="예: JSON 기본"
            required
          />
        </label>
        <label>
          포맷 내용
          <textarea
            name="format"
            value={form.format}
            onChange={handleChange}
            placeholder={`예: ${formatExample}`}
            rows={5}
            required
          />
        </label>
        <label>
          Content-Type (선택)
          <input
            type="text"
            name="contentType"
            value={form.contentType}
            onChange={handleChange}
            placeholder="예: application/json"
          />
        </label>
        <div className="format-examples">
          <p>예시:</p>
          <code>{formatExample}</code>
          <code>{formatExampleXml}</code>
        </div>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">저장되었습니다.</p>}
        <button type="submit" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
