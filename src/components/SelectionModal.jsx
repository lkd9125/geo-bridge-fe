import { useState, useEffect } from 'react';
import './SelectionModal.css';

export default function SelectionModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  title, 
  fetchData, 
  getItemLabel,
  selectedValue 
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPage: 1,
    prevPage: null,
    nextPage: null,
  });

  useEffect(() => {
    if (isOpen) {
      loadData(1);
    }
  }, [isOpen]);

  const loadData = async (page) => {
    setLoading(true);
    try {
      const res = await fetchData({ page, size: 10 });
      setItems(res.list || []);
      setPagination({
        page: res.page || 1,
        totalPage: res.totalPage || 1,
        prevPage: res.prevPage,
        nextPage: res.nextPage,
      });
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPage) {
      loadData(newPage);
    }
  };

  const handleSelect = (item) => {
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">로딩 중...</div>
          ) : items.length === 0 ? (
            <div className="modal-empty">데이터가 없습니다.</div>
          ) : (
            <div className="modal-list">
              {items.map((item) => (
                <div
                  key={item.idx}
                  className={`modal-item ${selectedValue === String(item.idx) ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  {getItemLabel(item)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <div className="modal-pagination">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.prevPage || loading}
              className="pagination-btn"
            >
              이전
            </button>
            <span className="pagination-info">
              {pagination.page} / {pagination.totalPage}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.nextPage || loading}
              className="pagination-btn"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
