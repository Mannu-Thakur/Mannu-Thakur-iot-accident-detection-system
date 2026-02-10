import { useState, useEffect } from 'react';

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message, itemName }) {
    const [closing, setClosing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setClosing(false);
            setSubmitting(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 300);
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm();
            handleClose();
        } catch (error) {
            console.error('Delete failed:', error);
            setSubmitting(false);
        }
    };

    if (!isOpen && !closing) return null;

    return (
        <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
            <div className="modal-content glass-panel bounce-in" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title || 'Confirm Delete'}</h3>
                    <button className="btn-close" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p>{message || 'Are you sure you want to delete this item?'}</p>
                    {itemName && <p className="font-medium mt-2">{itemName}</p>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={handleClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? <span className="spinner"></span> : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DeleteConfirmationModal;
