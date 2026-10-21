'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Filter,
  MessageSquare,
  Download,
  RefreshCw
} from 'lucide-react';
import { Profile, Task, Client } from '@/types/crm';
import DelayBadge, { calculateDelayInfo } from './DelayBadge';
import { supabase } from '@/lib/supabase';
import { generateTeamReportPDF, TaskCommentWithUser } from '@/lib/exportPdfReport';

interface TeamReportViewProps {
  tasks: Task[];
  profiles: Profile[];
  clients: Client[];
  currentUser?: Profile | null;
  onOpenComments: (task: Task) => void;
}

export default function TeamReportView({
  tasks,
  profiles,
  clients,
  currentUser,
  onOpenComments,
}: TeamReportViewProps) {
  const isTeamRole = currentUser?.role === 'team';
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.role === 'team' ? currentUser.id : 'all'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'team') {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    setStartDate(firstDayOfMonth);
    setEndDate(today);
  }, []);

  // Filter tasks based on selected user and date range
  const effectiveUserId = isTeamRole && currentUser?.id ? currentUser.id : selectedUserId;

  const filteredTasks = tasks.filter((task) => {
    if (effectiveUserId !== 'all' && task.assigned_to !== effectiveUserId) {
      return false;
    }

    if (startDate) {
      const taskDate = task.created_at.slice(0, 10);
      if (taskDate < startDate) return false;
    }
    if (endDate) {
      const taskDate = task.created_at.slice(0, 10);
      if (taskDate > endDate) return false;
    }

    return true;
  });

  // Calculate metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');

  let delayedTasksCount = 0;
  let totalDelayedDays = 0;

  filteredTasks.forEach((t) => {
    const info = calculateDelayInfo(t.deadline, t.completed_at, t.status);
    if (info.isDelayed) {
      delayedTasksCount += 1;
      totalDelayedDays += info.days;
    }
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const selectedProfile = profiles.find((p) => p.id === selectedUserId);

  // Comments mapping by taskId for inline viewing and PDF export
  const [commentsByTaskId, setCommentsByTaskId] = useState<Record<string, TaskCommentWithUser[]>>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadTaskComments();
  }, [tasks]);

  async function loadTaskComments() {
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          id,
          task_id,
          comment,
          created_at,
          user:profiles!task_comments_user_id_fkey(name, designation, role)
        `)
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const map: Record<string, TaskCommentWithUser[]> = {};
        data.forEach((c: any) => {
          if (!map[c.task_id]) map[c.task_id] = [];
          map[c.task_id].push({
            id: c.id,
            task_id: c.task_id,
            comment: c.comment,
            created_at: c.created_at,
            user: c.user,
          });
        });
        setCommentsByTaskId(map);
      }
    } catch (e) {
      console.warn('Failed to load comments for report:', e);
    }
  }

  // Handle PDF Export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      let currentComments = commentsByTaskId;
      const taskIds = filteredTasks.map((t) => t.id);
      if (taskIds.length > 0) {
        const { data } = await supabase
          .from('task_comments')
          .select(`
            id,
            task_id,
            comment,
            created_at,
            user:profiles!task_comments_user_id_fkey(name, designation, role)
          `)
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });

        if (data) {
          const map: Record<string, TaskCommentWithUser[]> = {};
          data.forEach((c: any) => {
            if (!map[c.task_id]) map[c.task_id] = [];
            map[c.task_id].push({
              id: c.id,
              task_id: c.task_id,
              comment: c.comment,
              created_at: c.created_at,
              user: c.user,
            });
          });
          currentComments = map;
          setCommentsByTaskId(map);
        }
      }

      await generateTeamReportPDF({
        filteredTasks,
        clients,
        profiles,
        selectedProfile,
        startDate,
        endDate,
        totalTasks,
        completedTasksCount: completedTasks.length,
        completionRate,
        pendingTasksCount: pendingTasks.length,
        delayedTasksCount,
        totalDelayedDays,
        commentsByTaskId: currentComments,
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Could not generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter Bar */}
      <div
        className="card-clean"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* User Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px', minWidth: 0, width: '100%' }}>
          <Users size={16} color="#4F46E5" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label" style={{ marginBottom: 2 }}>
              Select Team Member for Deliverable & Salary Audit:
            </label>
            {isTeamRole && currentUser ? (
              <select
                className="form-select"
                value={currentUser.id}
                disabled
                style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, backgroundColor: '#F8FAFC', cursor: 'not-allowed', width: '100%' }}
              >
                <option value={currentUser.id}>
                  👤 {currentUser.name} — Your Personal Deliverables & Salary Audit
                </option>
              </select>
            ) : (
              <select
                className="form-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, width: '100%' }}
              >
                <option value="all">📊 All Team Members (Entire Agency Overview)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.designation} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Date Range Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          <div style={{ flex: '1 1 120px', minWidth: 110 }}>
            <label className="form-label" style={{ marginBottom: 2 }}>
              Start Date
            </label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', fontSize: 12 }}
            />
          </div>

          <div style={{ flex: '1 1 120px', minWidth: 110 }}>
            <label className="form-label" style={{ marginBottom: 2 }}>
              End Date
            </label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', fontSize: 12 }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end', flex: '0 0 auto' }}>
            <button
              onClick={() => {
                const n = new Date();
                setStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10));
                setEndDate(n.toISOString().slice(0, 10));
              }}
              className="btn-secondary btn-sm"
              title="Reset to current month"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {/* Total Tasks */}
        <div className="card-clean" style={{ padding: '16px' }}>
          <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>
            Total Deliverables
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>
            {totalTasks}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
            Assigned in timeframe
          </div>
        </div>

        {/* Completed Work */}
        <div className="card-clean" style={{ padding: '16px' }}>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} />
            <span>Completed Work</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
            {completedTasks.length}
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginLeft: 6 }}>
              ({completionRate}%)
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
            Deliverables done
          </div>
        </div>

        {/* Pending Work */}
        <div className="card-clean" style={{ padding: '16px' }}>
          <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} />
            <span>Pending Work</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706' }}>
            {pendingTasks.length}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
            In-progress deliverables
          </div>
        </div>

        {/* Delayed Tasks (Highlighted for Salary / Review) */}
        <div
          className="card-clean"
          style={{
            padding: '16px',
            backgroundColor: delayedTasksCount > 0 ? '#FEF2F2' : '#FFFFFF',
            border: delayedTasksCount > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={13} />
            <span>Delayed Deliverables</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>
            {delayedTasksCount}
            <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6, color: '#B91C1C' }}>
              ({totalDelayedDays} total days)
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>
            ⚠️ Audit during salary payout
          </div>
        </div>
      </div>

      {/* Detailed Tasks Breakdown Table */}
      <div className="card-clean" style={{ padding: '16px 18px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
              Deliverable Audit Log: {selectedProfile ? selectedProfile.name : 'All Agency Members'}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>
              Showing {filteredTasks.length} deliverables matching date filter
            </div>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting || filteredTasks.length === 0}
            className="btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              backgroundColor: '#4F46E5',
              fontSize: 12,
              fontWeight: 600,
              cursor: isExporting || filteredTasks.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isExporting || filteredTasks.length === 0 ? 0.7 : 1,
            }}
            title="Download PDF report with all tasks and comments"
          >
            {isExporting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Export PDF Report</span>
              </>
            )}
          </button>
        </div>

        {filteredTasks.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: 12.5,
            }}
          >
            No deliverables found for the selected team member and date range.
          </div>
        ) : (
          <div className="table-container">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Task Deliverable</th>
                  <th>Assigned Person</th>
                  <th>Created Date</th>
                  <th>Deadline Date</th>
                  <th>Completed Date</th>
                  <th>Delay Status & Deduction Check</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const client = clients.find((c) => c.id === t.client_id);
                  const assignee = profiles.find((p) => p.id === t.assigned_to);
                  const delayInfo = calculateDelayInfo(t.deadline, t.completed_at, t.status);

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        style={{
                          backgroundColor: delayInfo.isDelayed ? '#FFFBFB' : '#FFFFFF',
                        }}
                      >
                      {/* Client */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 12.5 }}>
                          {client?.name || 'Client'}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748B' }}>
                          {client?.industry}
                        </div>
                      </td>

                      {/* Task Deliverable */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748B',
                              maxWidth: 320,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.description}
                          </div>
                        )}
                      </td>

                      {/* Assigned Person */}
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
                              <span>{assignee?.name}</span>
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
                            <div style={{ fontSize: 10, color: '#64748B' }}>
                              {assignee?.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td>
                        <span style={{ fontSize: 11.5, color: '#64748B' }}>
                          {new Date(t.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Deadline Date */}
                      <td>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: '#334155' }}>
                          {new Date(t.deadline).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Completed Date */}
                      <td>
                        {t.completed_at ? (
                          <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 500 }}>
                            {new Date(t.completed_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* Delay Status & Days Delayed */}
                      <td>
                        {delayInfo.isDelayed ? (
                          <span
                            className="badge badge-delayed"
                            style={{ fontSize: 11.5, padding: '3px 8px' }}
                          >
                            <AlertTriangle size={12} />
                            <span>{delayInfo.label}</span>
                          </span>
                        ) : t.status === 'completed' ? (
                          <span className="badge badge-completed">
                            <CheckCircle2 size={11} />
                            <span>On Time</span>
                          </span>
                        ) : (
                          <span className="badge badge-pending">
                            <Clock size={11} />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenComments({ ...t, client, assignee })}
                          className="btn-secondary btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
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
                      </td>
                    </tr>
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
