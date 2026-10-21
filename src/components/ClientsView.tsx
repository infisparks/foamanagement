'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  MessageSquare, 
  Phone, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Client, Task, Profile } from '@/types/crm';
import DelayBadge from './DelayBadge';
import { supabase } from '@/lib/supabase';

interface ClientsViewProps {
  clients: Client[];
  tasks: Task[];
  profiles: Profile[];
  currentUser: Profile | null;
  onRefresh: () => void;
  onOpenAddTask: (client: Client) => void;
  onOpenComments: (task: Task) => void;
  onOpenOnboardModal: () => void;
}

export default function ClientsView({
  clients,
  tasks,
  profiles,
  currentUser,
  onRefresh,
  onOpenAddTask,
  onOpenComments,
  onOpenOnboardModal,
}: ClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Filter clients by search query and category
  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery));
    const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  // Calculate client progress
  function getClientStats(clientId: string) {
    const clientTasks = tasks.filter((t) => t.client_id === clientId);
    const total = clientTasks.length;
    const completed = clientTasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, percentage, clientTasks };
  }

  // Toggle task complete / pending
  async function handleToggleTask(task: Task) {
    const canToggle = isAdmin || task.assigned_to === currentUser?.id;
    if (!canToggle) {
      alert('Permission denied: You can only mark tasks assigned to you as completed.');
      return;
    }

    setTogglingTaskId(task.id);
    const isNowComplete = task.status !== 'completed';
    const nowIso = new Date().toISOString();

    let isDelayed = false;
    let delayDays = 0;

    if (isNowComplete) {
      const deadlineMs = new Date(task.deadline).getTime();
      const compMs = new Date(nowIso).getTime();
      if (compMs > deadlineMs) {
        isDelayed = true;
        delayDays = Math.max(1, Math.ceil((compMs - deadlineMs) / (1000 * 60 * 60 * 24)));
      }
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: isNowComplete ? 'completed' : 'pending',
          completed_at: isNowComplete ? nowIso : null,
          is_delayed: isDelayed,
          delay_days: delayDays,
          updated_at: nowIso,
        })
        .eq('id', task.id);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
      alert('Could not update task status: ' + err.message);
    } finally {
      setTogglingTaskId(null);
    }
  }

  // Delete Client (Admin-only)
  async function handleDeleteClient(clientId: string, clientName: string) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete client "${clientName}" and all associated tasks?`)) {
      return;
    }
    setDeletingClientId(clientId);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      alert('Error deleting client: ' + err.message);
    } finally {
      setDeletingClientId(null);
    }
  }

  // Delete Task (Admin or Creator)
  async function handleDeleteTask(taskId: string, title: string, createdBy?: string) {
    if (!isAdmin && createdBy !== currentUser?.id) {
      alert('Only Admin or the task creator can delete this task.');
      return;
    }
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('Failed to delete task: ' + err.message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Filter and Search Bar */}
      <div
        className="card-clean"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12.5 }}
            />
          </div>

          <select
            className="form-select"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            style={{ width: 'auto', flex: '0 0 auto', minWidth: 120, fontSize: 12.5 }}
          >
            <option value="all">All Industries</option>
            <option value="Clothing Brand">Clothing / Fashion</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Fintech">Fintech</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Real Estate">Real Estate</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Showing <strong>{filteredClients.length}</strong> client{filteredClients.length === 1 ? '' : 's'}
          </div>
          {isAdmin && (
            <button onClick={onOpenOnboardModal} className="btn-primary btn-sm">
              <Plus size={14} />
              <span>Onboard Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div
          className="card-clean"
          style={{ padding: '52px 20px', textAlign: 'center', color: '#64748B' }}
        >
          <Building2 size={42} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>
            No clients onboarded yet
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', maxWidth: 420, margin: '0 auto 16px' }}>
            {searchQuery
              ? 'Try modifying your search or filter criteria.'
              : isAdmin
              ? 'Click "Onboard Client" above to onboard your first brand client and notify the team.'
              : 'Admin has not onboarded any clients yet.'}
          </div>
          {isAdmin && (
            <button onClick={onOpenOnboardModal} className="btn-primary btn-sm">
              <Plus size={14} />
              <span>Onboard First Client</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredClients.map((client) => {
            const { total, completed, pending, percentage, clientTasks } = getClientStats(client.id);
            const isExpanded = expandedClientId === client.id;

            return (
              <div key={client.id} className="card-clean" style={{ overflow: 'hidden' }}>
                {/* Client Main Summary Card Bar */}
                <div
                  className="client-card-header"
                  style={{
                    backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                  }}
                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                >
                  {/* Left: Client Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Link
                          href={`/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: '#0F172A',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          className="hover:underline"
                        >
                          <span>{client.name}</span>
                          <ExternalLink size={12} color="#6366F1" />
                        </Link>
                        {client.industry && (
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: '1px 6px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {client.industry}
                          </span>
                        )}
                        <span
                          className={`badge ${client.status === 'active' ? 'badge-completed' : 'badge-pending'}`}
                          style={{ fontSize: 9.5, padding: '1px 6px' }}
                        >
                          {client.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: '#64748B', flexWrap: 'wrap' }}>
                        {client.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={10} color="#059669" />
                            {client.phone}
                          </span>
                        )}
                        <span>
                          Onboarded: {new Date(client.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress & Quick Action */}
                  <div className="client-card-actions">
                    {/* Progress Bar & Counters */}
                    <div style={{ width: 130, display: 'flex', flexDirection: 'column', gap: 3 }} className="hide-on-mobile">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ color: '#475569' }}>Total Progress</span>
                        <span style={{ color: percentage === 100 ? '#059669' : '#4F46E5' }}>{percentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: percentage === 100 ? '#10B981' : '#6366F1',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{completed} done</span>
                        <span>{pending} pending</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Dedicated Client Page Link */}
                      <Link
                        href={`/clients/${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="btn-primary btn-sm"
                        style={{ textDecoration: 'none', gap: 4, padding: '5px 10px', fontSize: 12 }}
                        title="Open client page to add your task"
                      >
                        <Plus size={13} />
                        <span>Add Your Task</span>
                      </Link>

                      {/* Quick Add Task Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddTask(client);
                        }}
                        className="btn-secondary btn-sm"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        title="Add deliverable task for this client"
                      >
                        <Plus size={13} />
                        <span className="hide-on-mobile">Quick Add</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id, client.name);
                          }}
                          className="btn-danger btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Delete client (Admin Only)"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      <div style={{ color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Client Details & Tasks Table */}
                {isExpanded && (
                  <div style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}>
                    {/* Onboarding Notes if any */}
                    {client.notes && (
                      <div
                        style={{
                          marginBottom: 14,
                          padding: '12px 14px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          borderLeft: '3px solid #6366F1',
                          fontSize: 12.5,
                          color: '#334155',
                        }}
                      >
                        <strong style={{ color: '#0F172A' }}>Client Scope & Notes:</strong> {client.notes}
                      </div>
                    )}

                    {/* Section Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                        Deliverables & Execution Tasks ({clientTasks.length})
                      </div>
                      <button
                        onClick={() => onOpenAddTask(client)}
                        className="btn-primary btn-sm"
                      >
                        <Plus size={13} />
                        <span>Add Deliverable Task</span>
                      </button>
                    </div>

                    {/* Tasks List */}
                    {clientTasks.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '28px 12px',
                          color: '#64748B',
                          fontSize: 12,
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          border: '1px dashed #CBD5E1',
                        }}
                      >
                        No deliverables added yet. Click <strong>&quot;Add Deliverable Task&quot;</strong> above to log objectives.
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="table-clean">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>Done</th>
                              <th>Deliverable / Task</th>
                              <th>Assigned Member</th>
                              <th>Deadline</th>
                              <th>Added / Completed</th>
                              <th>Countdown & Status</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientTasks.map((t) => {
                              const isComplete = t.status === 'completed';
                              const assignee = profiles.find((p) => p.id === t.assigned_to);
                              const canToggle = isAdmin || t.assigned_to === currentUser?.id;

                              return (
                                <tr
                                  key={t.id}
                                  style={{
                                    backgroundColor: isComplete
                                      ? '#F8FAFC'
                                      : t.assigned_to === currentUser?.id
                                      ? '#FAF5FF'
                                      : '#FFFFFF',
                                    opacity: togglingTaskId === t.id ? 0.5 : 1,
                                    borderLeft: t.assigned_to === currentUser?.id ? '3px solid #6366F1' : '3px solid transparent',
                                  }}
                                >
                                  {/* Checkbox Tick / Untick */}
                                  <td>
                                    <button
                                      onClick={() => handleToggleTask(t)}
                                      disabled={togglingTaskId === t.id || !canToggle}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: canToggle ? 'pointer' : 'not-allowed',
                                        opacity: canToggle ? 1 : 0.4,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: isComplete ? '#059669' : '#CBD5E1',
                                      }}
                                      title={
                                        !canToggle
                                          ? 'Only the assigned team member or Admin can mark this completed'
                                          : isComplete
                                          ? 'Mark as pending'
                                          : 'Mark as complete'
                                      }
                                    >
                                      {isComplete ? (
                                        <CheckCircle2 size={19} color="#059669" />
                                      ) : (
                                        <Circle size={19} color="#94A3B8" />
                                      )}
                                    </button>
                                  </td>

                                  {/* Task Title & Description */}
                                  <td>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        color: isComplete ? '#64748B' : '#0F172A',
                                        textDecoration: isComplete ? 'line-through' : 'none',
                                      }}
                                    >
                                      {t.title}
                                    </div>
                                    {t.description && (
                                      <div
                                        style={{
                                          fontSize: 11.5,
                                          color: '#64748B',
                                          maxWidth: 420,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          marginTop: 2,
                                        }}
                                      >
                                        {t.description}
                                      </div>
                                    )}
                                  </td>

                                  {/* Assignee */}
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div
                                        style={{
                                          width: 24,
                                          height: 24,
                                          borderRadius: '50%',
                                          backgroundColor: '#EEF2FF',
                                          color: '#4F46E5',
                                          fontSize: 10,
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        {assignee?.name?.slice(0, 2).toUpperCase() || 'TM'}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                                          <span>{assignee?.name || 'Unassigned'}</span>
                                          {t.assigned_to === currentUser?.id && (
                                            <span
                                              style={{
                                                fontSize: 9.5,
                                                fontWeight: 700,
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                                backgroundColor: '#EEF2FF',
                                                color: '#4F46E5',
                                                border: '1px solid #C7D2FE',
                                              }}
                                            >
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 10.5, color: '#64748B' }}>
                                          {assignee?.designation}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Deadline */}
                                  <td>
                                    <div style={{ fontSize: 11.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Clock size={11} color="#64748B" />
                                      <span>
                                        {new Date(t.deadline).toLocaleDateString([], {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Added / Completed Time */}
                                  <td>
                                    <div style={{ fontSize: 11, color: '#64748B' }}>
                                      <div>
                                        Added: {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {t.completed_at && (
                                        <div style={{ color: '#059669', fontWeight: 500, marginTop: 1 }}>
                                          Done: {new Date(t.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Delay Status */}
                                  <td>
                                    <DelayBadge
                                      deadline={t.deadline}
                                      completedAt={t.completed_at}
                                      status={t.status}
                                    />
                                  </td>

                                  {/* Actions */}
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <button
                                        onClick={() => onOpenComments({ ...t, client, assignee })}
                                        className="btn-secondary btn-sm"
                                        style={{
                                          padding: '3px 8px',
                                          fontSize: 11.5,
                                          gap: 5,
                                          backgroundColor: (t.comments_count || 0) > 0 ? '#EEF2FF' : '#FFFFFF',
                                          borderColor: (t.comments_count || 0) > 0 ? '#C7D2FE' : '#E2E8F0',
                                          color: (t.comments_count || 0) > 0 ? '#4338CA' : '#334155',
                                          fontWeight: (t.comments_count || 0) > 0 ? 600 : 500,
                                        }}
                                        title={
                                          (t.comments_count || 0) > 0
                                            ? `${t.comments_count} ${t.comments_count === 1 ? 'comment' : 'comments'} on this deliverable`
                                            : 'Comments & Collaboration'
                                        }
                                      >
                                        <MessageSquare size={12} color={(t.comments_count || 0) > 0 ? '#4F46E5' : '#6366F1'} />
                                        <span>Comments</span>
                                        {(t.comments_count || 0) > 0 && (
                                          <span
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              minWidth: 16,
                                              height: 16,
                                              padding: '0 4px',
                                              borderRadius: 999,
                                              backgroundColor: '#4F46E5',
                                              color: '#FFFFFF',
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              lineHeight: 1,
                                            }}
                                          >
                                            {t.comments_count}
                                          </span>
                                        )}
                                      </button>

                                      {(isAdmin || t.created_by === currentUser?.id) && (
                                        <button
                                          onClick={() => handleDeleteTask(t.id, t.title, t.created_by)}
                                          className="btn-danger btn-sm"
                                          style={{ padding: '3px 6px' }}
                                          title="Delete task"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
