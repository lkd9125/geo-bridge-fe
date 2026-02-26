import { useState, useEffect } from 'react';
import { getFormatList, createFormat, deleteFormat } from '../api/format.js';
import DetailModal from '../components/DetailModal.jsx';
import './Pages.css';
import './Format.css';

const CONTENT_TYPES = [
  { value: '', label: '선택 안 함' },
  { value: 'application/json', label: 'application/json' },
  { value: 'application/xml', label: 'application/xml' },
  { value: 'text/plain', label: 'text/plain' },
];

const initialForm = {
  name: '',
  format: '',
  contentType: '',
};

const formatExample = `{"lat":#{lat},"lon":#{lon}}`;
const formatExampleXml = `<point lat="#{lat}" lon="#{lon}"/>`;

export default function FormatForm() {
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);
  const [detailFormat, setDetailFormat] = useState(null);

  const loadList = async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await getFormatList({ page: 1, size: 100 });
      setList(data.list ?? []);
    } catch (err) {
      setListError(err.response?.data?.message || '목록을 불러오지 못했습니다.');
      setList([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);
    setFormLoading(true);
    try {
      const body = {
        name: form.name,
        format: form.format,
        ...(form.contentType && { contentType: form.contentType }),
      };
      await createFormat(body);
      setFormSuccess(true);
      setForm(initialForm);
      await loadList();
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (idx, name) => {
    if (!window.confirm(`"${name}" 포맷을 삭제할까요?`)) return;
    setDeletingIdx(idx);
    try {
      await deleteFormat(idx);
      await loadList();
    } catch (err) {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setDeletingIdx(null);
    }
  };

  return (
    <div className="page form-page format-page">
      <h1>데이터 포맷</h1>
      <p className="form-desc">
        좌표 전송 시 사용할 포맷 목록입니다. <code>{'#{lat}'}</code>, <code>{'#{lon}'}</code> 에 위도·경도가 들어갑니다. 새 포맷은 아래 버튼으로 추가할 수 있습니다.
      </p>

      {listError && <p className="form-error">{listError}</p>}
      {listLoading ? (
        <p className="loading">목록 불러오는 중...</p>
      ) : (
        <div className="format-list-wrap">
          {list.length === 0 ? (
            <p className="format-list-empty">등록된 포맷이 없습니다.</p>
          ) : (
            <ul className="format-list">
              {list.map((item) => (
                <li key={item.idx} className="format-item">
                  <div
                    className="format-item-info format-item-info-clickable"
                    onClick={() => setDetailFormat(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setDetailFormat(item)}
                  >
                    <span className="format-item-name">{item.name}</span>
                    {item.contentType && (
                      <span className="format-item-type">{item.contentType}</span>
                    )}
                    {item.format && (
                      <span className="format-item-preview">{item.format}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="format-item-delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.idx, item.name); }}
                    disabled={deletingIdx === item.idx}
                  >
                    {deletingIdx === item.idx ? '삭제 중...' : '삭제'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!showForm ? (
        <button type="button" className="format-add-btn" onClick={() => setShowForm(true)}>
          포맷 추가
        </button>
      ) : (
        <div className="format-form-wrap">
          <h2 className="format-form-title">포맷 추가</h2>
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
              <select
                name="contentType"
                value={form.contentType}
                onChange={handleChange}
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="format-examples">
              <p>예시:</p>
              <code>{formatExample}</code>
              <code>{formatExampleXml}</code>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            {formSuccess && <p className="form-success">저장되었습니다.</p>}
            <div className="format-form-actions">
              <button type="submit" disabled={formLoading}>
                {formLoading ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                className="format-form-cancel"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                  setFormError('');
                  setFormSuccess(false);
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <DetailModal
        isOpen={!!detailFormat}
        onClose={() => setDetailFormat(null)}
        title={detailFormat ? detailFormat.name : '포맷 상세'}
      >
        {detailFormat && (
          <>
            <dl className="detail-dl">
              {detailFormat.contentType && (
                <>
                  <dt>Content-Type</dt>
                  <dd>{detailFormat.contentType}</dd>
                </>
              )}
              <dt>포맷 내용</dt>
              <dd style={{ padding: 0, marginTop: '0.25rem' }}>
                {detailFormat.format ? (
                  <pre className="detail-pre">{detailFormat.format}</pre>
                ) : (
                  '—'
                )}
              </dd>
            </dl>
          </>
        )}
      </DetailModal>
    </div>
  );
}
