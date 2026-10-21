'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';
import { Task } from '@/types/crm';

interface DeleteTaskConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirmDelete: (taskId: string) => Promise<void>;
}

export default function DeleteTaskConfirmModal({
  isOpen,
  onClose,
  task,
  onConfirmDelete,
}: DeleteTaskConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !task) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  async function handleDelete() {
    if (!isConfirmed || isDeleting || !task) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await onConfirmDelete(task.id);
      setConfirmInput('');
      onClose();
    } catch (err: any) {
      console.error('Error soft-deleting task:', err);
      setErrorMsg(err.message || 'Failed to move task to Trash');
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
                Move Deliverable to Trash?
              </div>
              <div style={{ fontSize: 11, color: '#B91C1C' }}>
                Type DELETE to confirm soft deletion
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
                border: '1px solid #FECACA',
                borderRadius: 6,
                color: '#DC2626',
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Task Info Card */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              {task.title}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Client: <strong style={{ color: '#334155' }}>{task.client?.name || 'General'}</strong></span>
              <span>Assignee: <strong style={{ color: '#4F46E5' }}>{task.assignee?.name || 'Unassigned'}</strong></span>
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>
            This task will be moved to the <strong>Trash</strong>. It will be hidden across the dashboard, reports, and client views, but can be <strong>restored at any time</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
              Please type <span style={{ color: '#DC2626', fontFamily: 'monospace' }}>DELETE</span> to confirm:
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Type DELETE"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed && !isDeleting) {
                  e.preventDefault();
                  handleDelete();
                }
              }}
              autoFocus
              style={{
                borderColor: isConfirmed ? '#DC2626' : '#CBD5E1',
                backgroundColor: isConfirmed ? '#FEF2F2' : '#FFFFFF',
                fontWeight: 600,
                color: isConfirmed ? '#DC2626' : '#0F172A',
                letterSpacing: '1px',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
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
            style={{ padding: '7px 14px', fontSize: 12.5 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            style={{
              padding: '7px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              backgroundColor: isConfirmed ? '#DC2626' : '#FCA5A5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: isConfirmed && !isDeleting ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.15s ease',
            }}
          >
            {isDeleting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Moving to Trash...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>Delete Deliverable</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
