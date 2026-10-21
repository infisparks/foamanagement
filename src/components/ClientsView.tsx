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
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { Client, Task, Profile } from '@/types/crm';
import DelayBadge from './DelayBadge';
import DeleteTaskConfirmModal from './DeleteTaskConfirmModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import { supabase } from '@/lib/supabase';
import { renderTextWithLinks } from '@/lib/renderLinks';
import { formatTimeAgo } from '@/lib/timeAgo';

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
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [viewTrashClientId, setViewTrashClientId] = useState<Record<string, boolean>>({});
  const [viewingDeletedClients, setViewingDeletedClients] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const activeClients = clients.filter((c) => !c.is_deleted);
  const deletedClients = clients.filter((c) => c.is_deleted === true);
  const sourceClients = viewingDeletedClients ? deletedClients : activeClients;

  // Filter clients by search query and category
  const filteredClients = sourceClients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery));
    const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  // Calculate client progress (ignoring soft-deleted tasks)
  function getClientStats(clientId: string) {
    const allClientTasks = tasks.filter((t) => t.client_id === clientId);
    const clientTasks = allClientTasks.filter((t) => !t.is_deleted);
    const deletedTasks = allClientTasks.filter((t) => t.is_deleted);
    const total = clientTasks.length;
    const completed = clientTasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, percentage, clientTasks, deletedTasks };
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

  // Soft Delete Client (Sets is_deleted: true)
  async function handleSoftDeleteClient() {
    if (!clientToDelete || !isAdmin) return;
    const { error } = await supabase
      .from('clients')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', clientToDelete.id);
    if (error) throw error;
    onRefresh();
  }

  // Restore Client (Sets is_deleted: false)
  async function handleRestoreClient(client: Client) {
    if (!isAdmin) {
      alert('Only administrators can restore client records.');
      return;
    }
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', client.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('Failed to restore client: ' + err.message);
    }
  }

  // Soft Delete Task (Sets is_deleted: true)
  async function handleSoftDeleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    onRefresh();
  }

  // Restore Task (Sets is_deleted: false)
  async function handleRestoreTask(task: Task) {
    const canRestore = isAdmin || task.assigned_to === currentUser?.id || task.created_by === currentUser?.id;
    if (!canRestore) {
      alert('Permission denied: You can only restore tasks assigned to or created by you.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Failed to restore deliverable:', err);
      alert('Could not restore deliverable: ' + err.message);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setViewingDeletedClients(false)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: !viewingDeletedClients ? 600 : 500,
                backgroundColor: !viewingDeletedClients ? '#4F46E5' : '#F1F5F9',
                color: !viewingDeletedClients ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Active Clients ({activeClients.length})
            </button>
            {deletedClients.length > 0 && (
              <button
                onClick={() => setViewingDeletedClients(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: viewingDeletedClients ? 600 : 500,
                  backgroundColor: viewingDeletedClients ? '#DC2626' : '#FEE2E2',
                  color: viewingDeletedClients ? '#FFFFFF' : '#DC2626',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={12} />
                <span>Trash ({deletedClients.length})</span>
              </button>
            )}
            <span style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>
              Showing <strong>{filteredClients.length}</strong> {viewingDeletedClients ? 'deleted' : ''} client{filteredClients.length === 1 ? '' : 's'}
            </span>
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
            const { total, completed, pending, percentage, clientTasks, deletedTasks } = getClientStats(client.id);
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
                        {client.is_deleted && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontWeight: 700,
                            }}
                          >
                            TRASH
                          </span>
                        )}
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
                        <span style={{ color: '#6366F1', fontWeight: 600, fontSize: 10 }}>
                          ({formatTimeAgo(client.created_at)})
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
                        client.is_deleted ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreClient(client);
                            }}
                            className="btn-secondary btn-sm"
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              color: '#059669',
                              backgroundColor: '#ECFDF5',
                              borderColor: '#A7F3D0',
                              gap: 4,
                            }}
                            title="Restore client from trash"
                          >
                            <RotateCcw size={13} />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientToDelete(client);
                            }}
                            className="btn-danger btn-sm"
                            style={{ padding: '5px 8px' }}
                            title="Move client to trash (Type DELETE to confirm)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )
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
                        <strong style={{ color: '#0F172A' }}>Client Scope & Notes:</strong> {renderTextWithLinks(client.notes)}
                      </div>
                    )}

                    {/* Section Header */}
                    {(() => {
                      const isViewingTrash = Boolean(viewTrashClientId[client.id]);
                      const displayTasks = isViewingTrash ? deletedTasks : clientTasks;

                      return (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 10,
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isViewingTrash ? '#DC2626' : '#0F172A' }}>
                                {isViewingTrash
                                  ? `Trash / Deleted Tasks (${deletedTasks.length})`
                                  : `Deliverables & Execution Tasks (${clientTasks.length})`}
                              </div>
                              {deletedTasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewTrashClientId((prev) => ({
                                      ...prev,
                                      [client.id]: !prev[client.id],
                                    }))
                                  }
                                  className="btn-secondary btn-sm"
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    gap: 4,
                                    color: isViewingTrash ? '#4F46E5' : '#DC2626',
                                    backgroundColor: isViewingTrash ? '#EEF2FF' : '#FEF2F2',
                                    borderColor: isViewingTrash ? '#C7D2FE' : '#FECACA',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Trash2 size={11} />
                                  <span>{isViewingTrash ? '← Active Deliverables' : `View Trash (${deletedTasks.length})`}</span>
                                </button>
                              )}
                            </div>
                            {!isViewingTrash && (
                              <button
                                onClick={() => onOpenAddTask(client)}
                                className="btn-primary btn-sm"
                              >
                                <Plus size={13} />
                                <span>Add Deliverable Task</span>
                              </button>
                            )}
                          </div>

                          {/* Tasks List */}
                          {displayTasks.length === 0 ? (
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
                              {isViewingTrash
                                ? 'No deleted tasks in Trash for this client.'
                                : <>No deliverables added yet. Click <strong>&quot;Add Deliverable Task&quot;</strong> above to log objectives.</>}
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
                            {displayTasks.map((t: Task) => {
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
                                      <div style={{ fontSize: 10, color: '#6366F1', fontWeight: 600, marginTop: 1 }}>
                                        {formatTimeAgo(t.created_at)}
                                      </div>
                                      {t.completed_at && (
                                        <div style={{ color: '#059669', fontWeight: 500, marginTop: 3 }}>
                                          Done: {new Date(t.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ({formatTimeAgo(t.completed_at)})
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
                                            ? `${t.comments_count} ${t.comments_count === 1 ? 'note' : 'notes'} on this deliverable`
                                            : 'Notes & Collaboration'
                                        }
                                      >
                                        <MessageSquare size={12} color={(t.comments_count || 0) > 0 ? '#4F46E5' : '#6366F1'} />
                                        <span>Notes</span>
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

                                      {isViewingTrash ? (
                                        <button
                                          onClick={() => handleRestoreTask(t)}
                                          className="btn-secondary btn-sm"
                                          style={{
                                            padding: '3px 8px',
                                            fontSize: 11.5,
                                            gap: 4,
                                            color: '#059669',
                                            backgroundColor: '#ECFDF5',
                                            borderColor: '#A7F3D0',
                                            fontWeight: 600,
                                          }}
                                          title="Restore deliverable to active"
                                        >
                                          <RotateCcw size={12} />
                                          <span>Restore</span>
                                        </button>
                                      ) : (
                                        (isAdmin || t.assigned_to === currentUser?.id || t.created_by === currentUser?.id) && (
                                          <button
                                            onClick={() => setTaskToDelete({ ...t, client, assignee })}
                                            className="btn-danger btn-sm"
                                            style={{ padding: '3px 6px' }}
                                            title="Move deliverable to Trash"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )
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
                  </>
                );
              })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      <DeleteTaskConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        task={taskToDelete}
        onConfirmDelete={handleSoftDeleteTask}
      />

      {/* Delete Client Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        title="Move Client to Trash?"
        subtitle="Type DELETE to confirm client soft deletion"
        itemTitle={clientToDelete?.name || ''}
        itemDetails={clientToDelete?.industry ? `Industry: ${clientToDelete.industry}` : undefined}
        itemTypeLabel="Client"
        onConfirmDelete={handleSoftDeleteClient}
      />
    </div>
  );
}
