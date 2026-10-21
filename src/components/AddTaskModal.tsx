'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, User, AlignLeft, AlertCircle, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, Client } from '@/types/crm';
import TaskTitleInputWithDropdown from '@/components/TaskTitleInputWithDropdown';

interface UserTaskTemplate {
  title: string;
  count: number;
}

const DEFAULT_TEMPLATES: UserTaskTemplate[] = [
  { title: 'Run Meta Ads Campaign', count: 3 },
  { title: 'Design Carousel Creatives', count: 2 },
  { title: 'Product Shoot & Video Editing', count: 2 },
  { title: 'Influencer Outreach & Collabs', count: 1 },
  { title: 'SEO Audit & Performance Review', count: 1 },
];

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  profiles: Profile[];
  currentUser: Profile | null;
  onTaskCreated: () => void;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  client,
  profiles,
  currentUser,
  onTaskCreated,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUser?.id || '');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userTemplates, setUserTemplates] = useState<UserTaskTemplate[]>([]);

  function getPreset1159(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  }

  useEffect(() => {
    if (isOpen) {
      setDeadline(getPreset1159(1));
      if (!assignedTo && currentUser) {
        setAssignedTo(currentUser.id);
      }

      // Load user-scoped templates from Supabase
      if (currentUser?.id) {
        loadUserTaskTemplates(currentUser.id);
      }
    }
  }, [isOpen, currentUser]);

  async function loadUserTaskTemplates(userId: string) {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('title, count')
        .eq('user_id', userId)
        .order('count', { ascending: false });

      if (!error && data && data.length > 0) {
        setUserTemplates(data);
      } else {
        setUserTemplates(DEFAULT_TEMPLATES);
      }
    } catch (e) {
      setUserTemplates(DEFAULT_TEMPLATES);
    }
  }

  async function recordUserTaskTemplate(titleToAdd: string) {
    if (!currentUser?.id) return;
    const cleanTitle = titleToAdd.trim();
    if (!cleanTitle) return;

    try {
      const { data: existing } = await supabase
        .from('task_templates')
        .select('id, count')
        .eq('user_id', currentUser.id)
        .ilike('title', cleanTitle)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('task_templates')
          .update({
            count: (existing.count || 1) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('task_templates')
          .insert({
            user_id: currentUser.id,
            title: cleanTitle,
            count: 1,
          });
      }

      loadUserTaskTemplates(currentUser.id);
    } catch (e) {
      console.warn('Error saving template:', e);
    }
  }

  if (!isOpen || !client) return null;

  async function handleSubmit(e?: React.FormEvent, overrideTitle?: string) {
    if (e) e.preventDefault();
    if (!client) return;
    const cleanTitle = (overrideTitle || title).trim();
    if (!cleanTitle) {
      setErrorMsg('Task title is required.');
      return;
    }
    const targetDeadline = deadline || getPreset1159(1);

    setLoading(true);
    setErrorMsg('');

    try {
      const targetAssignedTo = currentUser?.role === 'team' ? currentUser.id : (assignedTo || currentUser?.id);

      const { error: insertError } = await supabase.from('tasks').insert({
        client_id: client.id,
        title: cleanTitle,
        description: description.trim() || null,
        assigned_to: targetAssignedTo,
        created_by: currentUser?.id,
        deadline: new Date(targetDeadline).toISOString(),
        status: 'pending',
      });

      if (insertError) throw insertError;

      // Increment / record user template
      recordUserTaskTemplate(cleanTitle);

      setTitle('');
      setDescription('');
      onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error('Error adding task:', err);
      setErrorMsg(err.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
              <CheckSquare size={17} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                Add New Deliverable Task
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Client: <strong style={{ color: '#4F46E5' }}>{client.name}</strong>
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

        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', overflowY: 'auto' }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div>
              <label className="form-label">
                Task Title / Deliverable <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <TaskTitleInputWithDropdown
                value={title}
                onChange={setTitle}
                templates={userTemplates}
                placeholder="e.g. Research audience & launch Meta Ads"
                required
                onCreate={(customTitle) => handleSubmit(undefined, customTitle)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">
                  Assigned Team Member <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {currentUser?.role === 'team' ? (
                  <>
                    <select
                      className="form-select"
                      value={currentUser.id}
                      disabled
                      style={{ backgroundColor: '#F8FAFC', cursor: 'not-allowed', color: '#475569' }}
                    >
                      <option value={currentUser.id}>
                        {currentUser.name} (Assigned to You)
                      </option>
                    </select>
                    <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Team members can only assign tasks to themselves.
                    </div>
                  </>
                ) : (
                  <select
                    className="form-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.designation})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="form-label">
                  Deadline Date & Time <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
                {/* 11:59 PM Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Preset (11:59 PM):</span>
                  <button
                    type="button"
                    onClick={() => setDeadline(getPreset1159(1))}
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeadline(getPreset1159(3))}
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeadline(getPreset1159(7))}
                    style={{
                      fontSize: 10.5,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    +1 Week
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Deliverable Scope & Asset Links</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Objective targets, drive links, specific requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              backgroundColor: '#FFFBEB',
              borderRadius: 8,
              border: '1px solid #FDE68A',
              fontSize: 11.5,
              color: '#92400E',
            }}
          >
            ⚠️ <strong>Deadline Rule:</strong> Completing this task past the deadline will record delay penalties in the team management & salary audit report.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding Task...' : 'Add Task to Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
