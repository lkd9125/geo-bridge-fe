import { useState, useEffect } from 'react';
import { getHostList, createHost, deleteHost } from '../../api/host.js';
import DetailModal from '../../components/DetailModal.jsx';
import '../Pages.css';
import './Host.css';

const EMITTER_TYPES = ['MQTT', 'TCP', 'HTTP', 'WS'];

const initialForm = {
  type: 'MQTT',
  host: '',
  name: '',
  topic: '',
  hostId: '',
  password: '',
};

export default function HostForm() {
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);
  const [detailHost, setDetailHost] = useState(null);

  const loadList = async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await getHostList({ page: 1, size: 100 });
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
        type: form.type,
        host: form.host,
        name: form.name,
        ...(form.topic && { topic: form.topic }),
        ...(form.hostId && { hostId: form.hostId }),
        ...(form.password && { password: form.password }),
      };
      await createHost(body);
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
    if (!window.confirm(`"${name}" 호스트를 삭제할까요?`)) return;
    setDeletingIdx(idx);
    try {
      await deleteHost(idx);
      await loadList();
    } catch (err) {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setDeletingIdx(null);
    }
  };

  return (
    <div className="page form-page host-page">
      <h1>호스트 설정</h1>
      <p className="form-desc">등록한 호스트 목록입니다. 새 호스트는 아래 버튼으로 추가할 수 있습니다.</p>

      {listError && <p className="form-error">{listError}</p>}
      {listLoading ? (
        <p className="loading">목록 불러오는 중...</p>
      ) : (
        <div className="host-list-wrap">
          {list.length === 0 ? (
            <p className="host-list-empty">등록된 호스트가 없습니다.</p>
          ) : (
            <ul className="host-list">
              {list.map((item) => (
                <li key={item.idx} className="host-item">
                  <div
                    className="host-item-info host-item-info-clickable"
                    onClick={() => setDetailHost(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setDetailHost(item)}
                  >
                    <span className="host-item-name">{item.name}</span>
                    <span className="host-item-type">{item.type}</span>
                    {item.host && <span className="host-item-addr">{item.host}</span>}
                  </div>
                  <button
                    type="button"
                    className="host-item-delete"
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
        <button type="button" className="host-add-btn" onClick={() => setShowForm(true)}>
          호스트 추가
        </button>
      ) : (
        <div className="host-form-wrap">
          <h2 className="host-form-title">호스트 추가</h2>
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
            {formError && <p className="form-error">{formError}</p>}
            {formSuccess && <p className="form-success">저장되었습니다.</p>}
            <div className="host-form-actions">
              <button type="submit" disabled={formLoading}>
                {formLoading ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                className="host-form-cancel"
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
        isOpen={!!detailHost}
        onClose={() => setDetailHost(null)}
        title={detailHost ? detailHost.name : '호스트 상세'}
      >
        {detailHost && (
          <dl className="detail-dl">
            <dt>프로토콜 타입</dt>
            <dd>{detailHost.type}</dd>
            <dt>호스트 (주소)</dt>
            <dd>{detailHost.host || '—'}</dd>
            <dt>이름</dt>
            <dd>{detailHost.name}</dd>
            {detailHost.topic != null && detailHost.topic !== '' && (
              <>
                <dt>토픽</dt>
                <dd>{detailHost.topic}</dd>
              </>
            )}
            {detailHost.hostId != null && detailHost.hostId !== '' && (
              <>
                <dt>호스트 아이디</dt>
                <dd>{detailHost.hostId}</dd>
              </>
            )}
            {detailHost.password != null && detailHost.password !== '' && (
              <>
                <dt>비밀번호</dt>
                <dd>••••••••</dd>
              </>
            )}
          </dl>
        )}
      </DetailModal>
    </div>
  );
}
