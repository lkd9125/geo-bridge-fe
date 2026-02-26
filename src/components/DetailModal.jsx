import './DetailModal.css';

export default function DetailModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="detail-modal-header">
          <h2>{title}</h2>
          <button type="button" className="detail-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="detail-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
