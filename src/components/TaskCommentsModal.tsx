'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Clock, AlertCircle, Link2, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, Task, TaskComment } from '@/types/crm';
import { notifyTaskAssigneeNewComment } from '@/lib/whatsapp';
import { renderTextWithLinks, POPULAR_PLATFORMS, getPlatformForUrl } from '@/lib/renderLinks';
import DeleteConfirmModal from './DeleteConfirmModal';

interface TaskCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: Profile | null;
  onCommentAdded?: () => void;
}

export default function TaskCommentsModal({
  isOpen,
  onClose,
  task,
  currentUser,
  onCommentAdded,
}: TaskCommentsModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkToAttach, setLinkToAttach] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [waNotificationStatus, setWaNotificationStatus] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const [viewingTrash, setViewingTrash] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<TaskComment | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const activeComments = comments.filter((c) => !c.is_deleted);
  const deletedComments = comments.filter((c) => c.is_deleted === true);
  const displayedComments = viewingTrash ? deletedComments : activeComments;

  function handleInsertLink() {
    if (!linkToAttach.trim()) return;
    let url = linkToAttach.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    setNewComment((prev) => (prev.trim() ? `${prev.trim()} ${url}` : url));
    setLinkToAttach('');
    setShowLinkInput(false);
  }

  // Live timer to update relative time ("1 min ago") every 30 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setViewingTrash(false);
      setNoteToDelete(null);
    }
  }, [isOpen]);

  function formatTimeAgo(isoString?: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 10) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr${diffInHours === 1 ? '' : 's'} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  useEffect(() => {
    if (isOpen && task) {
      loadComments();
    }
  }, [isOpen, task]);

  async function loadComments() {
    if (!task) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          id,
          task_id,
          user_id,
          comment,
          created_at,
          is_deleted,
          user:profiles!task_comments_user_id_fkey(id, name, email, phone, role, designation, avatar_url)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      setErrorMsg(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  async function handleSoftDeleteNote() {
    if (!noteToDelete) return;
    const { error } = await supabase
      .from('task_comments')
      .update({ is_deleted: true })
      .eq('id', noteToDelete.id);
    if (error) throw error;
    setComments((prev) =>
      prev.map((c) => (c.id === noteToDelete.id ? { ...c, is_deleted: true } : c))
    );
    if (onCommentAdded) onCommentAdded();
  }

  async function handleRestoreNote(note: TaskComment) {
    const canRestore = isAdmin || note.user_id === currentUser?.id;
    if (!canRestore) {
      alert('Permission denied: You can only restore your own notes.');
      return;
    }
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ is_deleted: false })
        .eq('id', note.id);
      if (error) throw error;
      setComments((prev) =>
        prev.map((c) => (c.id === note.id ? { ...c, is_deleted: false } : c))
      );
      if (onCommentAdded) onCommentAdded();
    } catch (err: any) {
      alert('Failed to restore note: ' + err.message);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !newComment.trim() || !currentUser) return;

    setSubmitting(true);
    setErrorMsg('');
    setWaNotificationStatus(null);

    const commentText = newComment.trim();

    try {
      // 1. Insert comment into Supabase (Client-Side)
      const { data: inserted, error: insertErr } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          comment: commentText,
        })
        .select(`
          id,
          task_id,
          user_id,
          comment,
          created_at,
          is_deleted,
          user:profiles!task_comments_user_id_fkey(id, name, email, phone, role, designation, avatar_url)
        `)
        .single();

      if (insertErr) throw insertErr;

      // Put latest note on top
      setComments((prev) => [inserted as any, ...prev]);
      setNewComment('');

      // 2. Direct client-side WhatsApp notification to task assignee
      let assigneeId = task.assigned_to || task.assignee?.id;
      let assigneePhone = task.assignee?.phone;
      let assigneeName = task.assignee?.name;

      if ((!assigneePhone || !assigneeName) && assigneeId) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, phone, designation')
            .eq('id', assigneeId)
            .single();
          if (prof) {
            assigneePhone = prof.phone;
            assigneeName = prof.name;
          }
        } catch (e) {
          console.warn('Could not fetch assignee profile:', e);
        }
      }

      // Check if task belongs to current user by User ID only (never by phone number)
      const isMyOwnTask = Boolean(assigneeId && assigneeId === currentUser.id);

      if (!isMyOwnTask && assigneePhone) {
        const clientName = task.client?.name || 'Deliverable Task';
        notifyTaskAssigneeNewComment({
          taskTitle: task.title,
          clientName,
          commenterName: currentUser.name,
          commenterDesignation: currentUser.designation,
          commentText,
          assigneePhone,
          assigneeName: assigneeName || 'Team Member',
        })
          .then((res) => {
            if (res.success) {
              setWaNotificationStatus(`WhatsApp alert sent to ${assigneeName || 'Assignee'} (${assigneePhone})`);
            } else {
              setWaNotificationStatus(`WhatsApp dispatch recorded to system logs.`);
            }
          })
          .catch((e) => console.warn('WhatsApp alert trigger catch:', e));
      }

      if (onCommentAdded) onCommentAdded();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setErrorMsg(err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !task) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 620, height: 600 }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={17} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                Task Notes & Collaboration
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                {task.title}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: 11.5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>Client: </span>
            <strong style={{ color: '#0F172A' }}>{task.client?.name || 'Client'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Assigned To: </span>
            <strong style={{ color: '#4F46E5' }}>{task.assignee?.name || 'Unassigned'}</strong>
            <span style={{ color: '#64748B' }}> ({task.assignee?.designation})</span>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Deadline: </span>
            <strong style={{ color: '#DC2626' }}>
              {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </strong>
          </div>
        </div>

        {/* Sub-Header: Active Notes & Trash Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setViewingTrash(false)}
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: !viewingTrash ? 600 : 500,
                backgroundColor: !viewingTrash ? '#4F46E5' : '#FFFFFF',
                color: !viewingTrash ? '#FFFFFF' : '#475569',
                border: '1px solid',
                borderColor: !viewingTrash ? '#4F46E5' : '#E2E8F0',
                cursor: 'pointer',
              }}
            >
              Active Notes ({activeComments.length})
            </button>
            {deletedComments.length > 0 && (
              <button
                type="button"
                onClick={() => setViewingTrash(true)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: viewingTrash ? 600 : 500,
                  backgroundColor: viewingTrash ? '#DC2626' : '#FFFFFF',
                  color: viewingTrash ? '#FFFFFF' : '#DC2626',
                  border: '1px solid',
                  borderColor: viewingTrash ? '#DC2626' : '#FCA5A5',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={11} />
                <span>Trash ({deletedComments.length})</span>
              </button>
            )}
          </div>

          <span style={{ color: '#64748B', fontSize: 11 }}>
            {viewingTrash
              ? `${deletedComments.length} deleted note${deletedComments.length === 1 ? '' : 's'}`
              : `${activeComments.length} note${activeComments.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Comments List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#FFFFFF',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 30 }}>
              Loading notes...
            </div>
          ) : displayedComments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 30 }}>
              {viewingTrash
                ? 'No notes in Trash.'
                : 'No notes attached yet. Add a note to collaborate and notify the task owner!'}
            </div>
          ) : (
            displayedComments.map((c) => {
              const isMe = c.user_id === currentUser?.id;
              const canDelete = isAdmin || isMe;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    backgroundColor: c.is_deleted ? '#F1F5F9' : isMe ? '#F5F3FF' : '#F8FAFC',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: c.is_deleted
                      ? '1px solid #CBD5E1'
                      : isMe
                      ? '1px solid #DDD6FE'
                      : '1px solid #E2E8F0',
                    opacity: c.is_deleted ? 0.85 : 1,
                  }}
                >
                  {c.user?.avatar_url ? (
                    <img
                      src={c.user.avatar_url}
                      alt={c.user.name}
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {c.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                          {c.user?.name}
                        </span>
                        <span
                          className={`badge ${c.user?.role === 'admin' ? 'badge-admin' : 'badge-team'}`}
                          style={{ fontSize: 9.5, padding: '1px 5px' }}
                        >
                          {c.user?.designation || (c.user?.role === 'admin' ? 'Admin' : 'Team')}
                        </span>
                        {c.is_deleted && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontWeight: 700,
                            }}
                          >
                            In Trash
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}
                          title={new Date(c.created_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        >
                          <Clock size={11} color="#94A3B8" />
                          <span>{formatTimeAgo(c.created_at)}</span>
                        </span>

                        {/* Action: Delete (Move to Trash) or Restore */}
                        {c.is_deleted ? (
                          canDelete && (
                            <button
                              type="button"
                              onClick={() => handleRestoreNote(c)}
                              className="btn-secondary btn-sm"
                              style={{
                                padding: '2px 7px',
                                fontSize: 11,
                                gap: 3,
                                color: '#059669',
                                backgroundColor: '#ECFDF5',
                                borderColor: '#A7F3D0',
                              }}
                              title="Restore note"
                            >
                              <RotateCcw size={11} />
                              <span>Restore</span>
                            </button>
                          )
                        ) : (
                          canDelete && (
                            <button
                              type="button"
                              onClick={() => setNoteToDelete(c)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94A3B8',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 4,
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                              title="Delete note (Type DELETE to confirm)"
                            >
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <p style={{
                      fontSize: 12.5,
                      color: c.is_deleted ? '#64748B' : '#334155',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      lineHeight: 1.6,
                      textDecoration: c.is_deleted ? 'line-through' : 'none',
                    }}>
                      {renderTextWithLinks(c.comment)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Status banner */}
        {waNotificationStatus && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: '#ECFDF5',
              borderTop: '1px solid #A7F3D0',
              color: '#059669',
              fontSize: 11.5,
            }}
          >
            ✓ {waNotificationStatus}
          </div>
        )}

        {/* Note Input */}
        <form
          onSubmit={handleAddComment}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}
        >
          {/* Quick Link Inserter Bar */}
          {showLinkInput && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '10px 12px',
                backgroundColor: '#EEF2FF',
                borderRadius: 8,
                border: '1px solid #C7D2FE',
              }}
            >
              {/* Popular Platform Quick Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#4338CA' }}>
                  Popular Platforms:
                </span>
                {POPULAR_PLATFORMS.slice(0, 7).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const domainMap: Record<string, string> = {
                        'google-drive': 'https://drive.google.com/drive/folders/',
                        'google-sheets': 'https://docs.google.com/spreadsheets/d/',
                        'figma': 'https://figma.com/design/',
                        'github': 'https://github.com/',
                        'youtube': 'https://youtube.com/watch?v=',
                        'meta-ads': 'https://adsmanager.facebook.com/adsmanager/',
                        'loom': 'https://loom.com/share/',
                      };
                      setLinkToAttach(domainMap[p.id] || `https://${p.id}.com/`);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 4,
                      backgroundColor: p.bgColor,
                      color: p.color,
                      border: `1px solid ${p.borderColor}`,
                      cursor: 'pointer',
                    }}
                    title={`Pre-fill ${p.name} link`}
                  >
                    {p.icon(11)}
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Link2 size={14} color="#4F46E5" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  className="form-input"
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: 12,
                    backgroundColor: '#FFFFFF',
                  }}
                  placeholder="Paste URL here (e.g., https://figma.com/... or https://drive.google.com/...)"
                  value={linkToAttach}
                  onChange={(e) => setLinkToAttach(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '5px 12px', fontSize: 11.5 }}
                  onClick={handleInsertLink}
                  disabled={!linkToAttach.trim()}
                >
                  Insert Link
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '5px 8px', fontSize: 11.5 }}
                  onClick={() => {
                    setShowLinkInput(false);
                    setLinkToAttach('');
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Detected Platform Preview */}
              {linkToAttach.trim() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: '#64748B' }}>Preview Badge:</span>
                  {(() => {
                    const matched = getPlatformForUrl(linkToAttach.trim());
                    if (matched) {
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: matched.bgColor,
                            color: matched.color,
                            border: `1px solid ${matched.borderColor}`,
                            fontWeight: 600,
                          }}
                        >
                          {matched.icon(12)}
                          <span>{matched.name}</span>
                        </span>
                      );
                    }
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#FFFFFF',
                          color: '#4338CA',
                          border: '1px solid #CBD5E1',
                          fontWeight: 500,
                        }}
                      >
                        🌐 Custom Web URL
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              placeholder={`Write a note or paste a link (Figma, Drive, Loom)...`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowLinkInput((prev) => !prev)}
              title="Attach a link to this note"
              style={{
                padding: '8px 12px',
                fontSize: 12,
                gap: 5,
                backgroundColor: showLinkInput ? '#EEF2FF' : '#FFFFFF',
                borderColor: showLinkInput ? '#4F46E5' : '#E2E8F0',
                color: showLinkInput ? '#4F46E5' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Link2 size={13} />
              <span className="hidden sm:inline">Attach Link</span>
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !newComment.trim()}
              style={{ padding: '8px 16px' }}
            >
              <Send size={14} />
              <span>{submitting ? 'Posting...' : 'Note'}</span>
            </button>
          </div>

          <div
            style={{
              fontSize: 10.5,
              color: '#64748B',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <span>📝 Team members can add notes and attach links. Assignee receives WhatsApp alert when added by others.</span>
            <span style={{ color: '#4F46E5', fontWeight: 500 }}>Links are auto-clickable 🔗</span>
          </div>
        </form>
      </div>

      {/* Delete Note Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        title="Move Note to Trash?"
        subtitle="Type DELETE to confirm note soft deletion"
        itemTitle={noteToDelete?.comment ? (noteToDelete.comment.length > 70 ? noteToDelete.comment.slice(0, 70) + '...' : noteToDelete.comment) : ''}
        itemDetails={noteToDelete ? `By ${noteToDelete.user?.name || 'Team Member'} • ${formatTimeAgo(noteToDelete.created_at)}` : undefined}
        itemTypeLabel="Note"
        onConfirmDelete={handleSoftDeleteNote}
      />
    </div>
  );
}
