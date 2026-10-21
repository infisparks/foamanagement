'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  itemTitle: string;
  itemDetails?: string;
  itemTypeLabel?: string;
  onConfirmDelete: () => Promise<void>;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  title = 'Move to Trash?',
  subtitle = 'Type DELETE to confirm soft deletion',
  itemTitle,
  itemDetails,
  itemTypeLabel = 'Item',
  onConfirmDelete,
}: DeleteConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  async function handleDelete() {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await onConfirmDelete();
      setConfirmInput('');
      onClose();
    } catch (err: any) {
      console.error('Error soft-deleting item:', err);
      setErrorMsg(err.message || 'Failed to move to Trash');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleClose() {
    if (isDeleting) return;
    setConfirmInput('');
    setErrorMsg('');
    onClose();
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#991B1B' }}>
                {title}
              </div>
              <div style={{ fontSize: 11, color: '#B91C1C' }}>
                {subtitle}
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#991B1B',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#DC2626',
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Item details card */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {itemTypeLabel} to be moved to trash:
            </div>
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13.5, lineHeight: 1.4 }}>
              {itemTitle}
            </div>
            {itemDetails && (
              <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                {itemDetails}
              </div>
            )}
          </div>

          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
            This item will not be permanently deleted. It will be moved to the <strong>Trash</strong> where it can be restored at any time.
          </div>

          {/* Type DELETE Prompt */}
          <div>
            <label
              htmlFor="confirm-delete-input"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              To confirm, type <span style={{ color: '#DC2626', fontWeight: 700, fontFamily: 'monospace' }}>DELETE</span> below:
            </label>
            <input
              id="confirm-delete-input"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
              disabled={isDeleting}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: isConfirmed ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                fontSize: 13,
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: isConfirmed ? '#FEF2F2' : '#FFFFFF',
                outline: 'none',
                boxShadow: isConfirmed ? '0 0 0 3px rgba(220, 38, 38, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={isDeleting}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isConfirmed && !isDeleting ? '#DC2626' : '#FCA5A5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isConfirmed && !isDeleting ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s ease',
              opacity: isConfirmed ? 1 : 0.7,
            }}
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Moving to Trash...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Move to Trash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
