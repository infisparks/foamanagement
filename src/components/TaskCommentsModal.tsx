'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, Task, TaskComment } from '@/types/crm';
import { notifyTaskAssigneeNewComment } from '@/lib/whatsapp';

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [waNotificationStatus, setWaNotificationStatus] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Live timer to update relative time ("1 min ago") every 30 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
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
          user:profiles!task_comments_user_id_fkey(id, name, email, phone, role, designation, avatar_url)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      setErrorMsg(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
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
          user:profiles!task_comments_user_id_fkey(id, name, email, phone, role, designation, avatar_url)
        `)
        .single();

      if (insertErr) throw insertErr;

      setComments((prev) => [...prev, inserted as any]);
      setNewComment('');

      // 2. Direct client-side WhatsApp notification to task assignee
      const assigneePhone = task.assignee?.phone;
      const assigneeName = task.assignee?.name || 'Team Member';

      if (assigneePhone) {
        notifyTaskAssigneeNewComment({
          taskTitle: task.title,
          clientName: task.client?.name || 'General Client',
          commenterName: currentUser.name,
          commenterDesignation: currentUser.designation,
          commentText,
          assigneePhone,
          assigneeName,
        })
          .then((res) => {
            if (res.success) {
              setWaNotificationStatus(`WhatsApp alert sent to ${assigneeName} (${assigneePhone})`);
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
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 30 }}>
              No notes attached yet. Add a note to collaborate and notify the task owner!
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.user_id === currentUser?.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    backgroundColor: isMe ? '#F5F3FF' : '#F8FAFC',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: isMe ? '1px solid #DDD6FE' : '1px solid #E2E8F0',
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
                      </div>
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
                    </div>

                    <p style={{ fontSize: 12.5, color: '#334155', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                      {c.comment}
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

        {/* Comment Input */}
        <form
          onSubmit={handleAddComment}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              placeholder={`Write a comment as ${currentUser?.name} (${currentUser?.designation})...`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !newComment.trim()}
              style={{ padding: '8px 16px' }}
            >
              <Send size={14} />
              <span>{submitting ? 'Posting...' : 'Comment'}</span>
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: '#64748B' }}>
            💬 Team members can comment on any deliverable. Adding a comment triggers a WhatsApp alert to the task owner.
          </div>
        </form>
      </div>
    </div>
  );
}
