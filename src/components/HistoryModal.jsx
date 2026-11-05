import { useCallback, useEffect, useState } from 'react';
import {
  deleteHistory,
  getHistoryList,
  toggleHistoryFavorite,
} from '../api/history.js';
import './HistoryModal.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

export default function HistoryModal({ isOpen, onClose, onLoad }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionSn, setActionSn] = useState(null);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPage: 0,
    prevPage: null,
    nextPage: null,
  });

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await getHistoryList({ page, size: 10, range: 10 });
      setItems(response.list || []);
      setPagination({
        page: response.page || 1,
        totalPage: response.totalPage || 0,
        prevPage: response.prevPage,
        nextPage: response.nextPage,
      });
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || '이력을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData(1);
    }
  }, [isOpen, loadData]);

  const handleFavorite = async (history) => {
    setActionSn(history.sn);
    setError('');
    try {
      await toggleHistoryFavorite(history.sn);
      await loadData(1);
    } catch (err) {
      setError(err.response?.data?.message || '즐겨찾기 변경에 실패했습니다.');
    } finally {
      setActionSn(null);
    }
  };

  const handleDelete = async (history) => {
    const confirmed = window.confirm(`'${history.title || `이력 #${history.sn}`}'을 삭제할까요?`);
    if (!confirmed) return;

    setActionSn(history.sn);
    setError('');
    try {
      await deleteHistory(history.sn);
      const nextPage = items.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination.page;
      await loadData(nextPage);
    } catch (err) {
      setError(err.response?.data?.message || '이력 삭제에 실패했습니다.');
    } finally {
      setActionSn(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <div>
            <h2>이전 실행 이력</h2>
            <p>저장한 경로와 실행 설정을 다시 불러올 수 있어요.</p>
          </div>
          <button type="button" className="history-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="history-modal-body">
          {error && <div className="history-modal-error">{error}</div>}
          {loading ? (
            <div className="history-modal-state">이력을 불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="history-modal-state">저장된 실행 이력이 없습니다.</div>
          ) : (
            <div className="history-list">
              {items.map((history) => {
                const busy = actionSn === history.sn;
                return (
                  <article key={history.sn} className={`history-item ${history.favorite ? 'favorite' : ''}`}>
                    <div className="history-item-main">
                      <div className="history-item-title-row">
                        <strong>{history.title || `이력 #${history.sn}`}</strong>
                        {history.favorite && <span className="history-favorite-badge">즐겨찾기</span>}
                      </div>
                      <div className="history-item-summary">
                        <span>{history.type || 'TYPE 없음'}</span>
                        <span>{history.host || 'HOST 없음'}</span>
                        <span>경로 {history.path?.length || 0}개</span>
                      </div>
                      <div className="history-item-date">
                        실행 저장 {formatDateTime(history.createDt)}
                        {history.favoriteDt && ` · 즐겨찾기 ${formatDateTime(history.favoriteDt)}`}
                      </div>
                    </div>
                    <div className="history-item-actions">
                      <button
                        type="button"
                        className={`history-favorite-button ${history.favorite ? 'active' : ''}`}
                        onClick={() => handleFavorite(history)}
                        disabled={busy}
                        title={history.favorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                      >
                        {history.favorite ? '★' : '☆'}
                      </button>
                      <button type="button" className="history-load-button" onClick={() => onLoad(history)} disabled={busy}>
                        불러오기
                      </button>
                      <button type="button" className="history-delete-button" onClick={() => handleDelete(history)} disabled={busy}>
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="history-modal-footer">
          <button type="button" onClick={() => loadData(pagination.page - 1)} disabled={!pagination.prevPage || loading}>
            이전
          </button>
          <span>{pagination.totalPage === 0 ? 0 : pagination.page} / {pagination.totalPage}</span>
          <button type="button" onClick={() => loadData(pagination.page + 1)} disabled={!pagination.nextPage || loading}>
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
