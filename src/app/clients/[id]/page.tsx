'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Client, Task, Profile } from '@/types/crm';
import DelayBadge from '@/components/DelayBadge';
import TaskCommentsModal from '@/components/TaskCommentsModal';
import DeleteTaskConfirmModal from '@/components/DeleteTaskConfirmModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TaskTitleInputWithDropdown from '@/components/TaskTitleInputWithDropdown';
import { renderTextWithLinks } from '@/lib/renderLinks';
import { formatTimeAgo } from '@/lib/timeAgo';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Users,
  ExternalLink,
  Shield,
  UserCheck,
  LogOut,
  Sparkles,
  RotateCcw,
  X,
  Flame,
  Menu
} from 'lucide-react';

interface ClientTasksPageProps {
  params: Promise<{ id: string }>;
}

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

function ClientTasksContent({ params }: ClientTasksPageProps) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const { currentUser, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Sidebar navigation state
  const [currentTab, setCurrentTab] = useState<'clients' | 'team_report' | 'members' | 'whatsapp_logs' | 'guidance'>('clients');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Task Slide-Over Drawer State
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // User-specific most-used Quick Pick templates
  const [userTemplates, setUserTemplates] = useState<UserTaskTemplate[]>([]);

  // Interactive Task states
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'delayed' | 'deleted'>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  // Load user-specific task templates from Supabase task_templates table
  useEffect(() => {
    if (currentUser?.id) {
      loadUserTaskTemplates();
    }
  }, [currentUser]);

  async function loadUserTaskTemplates() {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('title, count')
        .eq('user_id', currentUser.id)
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

  // Helpers for 11:59 PM default deadlines
  function getPreset1159(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  }

  // Set default deadline to Tomorrow 11:59 PM and default assignee on mount
  useEffect(() => {
    setDeadline(getPreset1159(1));

    if (currentUser) {
      setAssignedTo(currentUser.id);
    }
  }, [currentUser]);

  // Load client and tasks
  useEffect(() => {
    if (currentUser && clientId) {
      loadClientAndTasks();
    }
  }, [currentUser, clientId]);

  async function loadClientAndTasks() {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Client info
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientErr) throw clientErr;
      setClient(clientData);

      // 2. Fetch Profiles for assignee selector
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (profErr) throw profErr;
      setProfiles(profilesData || []);

      // 3. Fetch Tasks for this client
      const { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, name, email, phone, role, designation, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, name, email, role)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (taskErr) throw taskErr;

      // 4. Fetch comment counts for tasks
      const loadedTasks = tasksData || [];
      const taskIds = loadedTasks.map((t) => t.id);
      const commentCountMap: Record<string, number> = {};

      if (taskIds.length > 0) {
        const { data: commentsCountData } = await supabase
          .from('task_comments')
          .select('task_id')
          .in('task_id', taskIds)
          .or('is_deleted.is.null,is_deleted.eq.false');

        if (commentsCountData) {
          commentsCountData.forEach((c: { task_id: string }) => {
            commentCountMap[c.task_id] = (commentCountMap[c.task_id] || 0) + 1;
          });
        }
      }

      setTasks(
        loadedTasks.map((t) => ({
          ...t,
          comments_count: commentCountMap[t.id] || 0,
        }))
      );
    } catch (err: any) {
      console.error('Error loading client tasks:', err);
      setErrorMsg(err.message || 'Could not load client details');
    } finally {
      setLoading(false);
    }
  }

  // Handle Save Template & Count increment in Supabase task_templates table
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

      // Reload templates sorted by count
      loadUserTaskTemplates();
    } catch (e) {
      console.warn('Error saving template to DB:', e);
    }
  }

  // Handle Create Task (supports form submit or quick create from suggestions)
  async function handleCreateTask(e?: React.FormEvent, overrideTitle?: string) {
    if (e) e.preventDefault();
    const finalTitle = (overrideTitle || taskTitle).trim();
    if (!finalTitle) {
      setFormError('Please enter a task title.');
      return;
    }
    const targetDeadline = deadline || getPreset1159(1);

    setAddingTask(true);
    setFormError('');

    try {
      const targetAssignedTo = currentUser?.role === 'team' ? currentUser.id : (assignedTo || currentUser?.id);

      const { data: newTask, error: insertErr } = await supabase
        .from('tasks')
        .insert({
          client_id: clientId,
          title: finalTitle,
          description: taskDescription.trim() || null,
          assigned_to: targetAssignedTo,
          created_by: currentUser?.id,
          deadline: new Date(targetDeadline).toISOString(),
          status: 'pending',
          is_delayed: false,
          delay_days: 0,
        })
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, name, email, phone, role, designation, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, name, email, role)
        `)
        .single();

      if (insertErr) throw insertErr;

      // Save to current user's personal most-used quick picks!
      recordUserTaskTemplate(finalTitle);

      // Optimistic update
      setTasks((prev) => [newTask, ...prev]);
      setTaskTitle('');
      setTaskDescription('');
      setIsAddDrawerOpen(false); // Close slide drawer
      setSuccessNotice(`Deliverable "${newTask.title}" added successfully!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setFormError(err.message || 'Error creating task');
    } finally {
      setAddingTask(false);
    }
  }

  // Handle Quick Deadline Preset (Always sets 11:59 PM)
  function setDeadlinePreset(daysFromNow: number) {
    setDeadline(getPreset1159(daysFromNow));
  }

  // Toggle Task Status (Complete / Pending)
  async function handleToggleTask(task: Task) {
    const canToggle = currentUser?.role === 'admin' || task.assigned_to === currentUser?.id;
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

      // Update local state immediately
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: isNowComplete ? 'completed' : 'pending',
                completed_at: isNowComplete ? nowIso : null,
                is_delayed: isDelayed,
                delay_days: delayDays,
              }
            : t
        )
      );
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
      alert('Could not update task: ' + err.message);
    } finally {
      setTogglingTaskId(null);
    }
  }

  // Soft Delete Task (Sets is_deleted: true)
  async function handleSoftDeleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_deleted: true } : t)));
  }

  // Restore Task (Sets is_deleted: false)
  async function handleRestoreTask(task: Task) {
    const isAdmin = currentUser?.role === 'admin';
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
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_deleted: false } : t)));
    } catch (err: any) {
      console.error('Failed to restore deliverable:', err);
      alert('Could not restore deliverable: ' + err.message);
    }
  }

  // Soft Delete Client (Sets is_deleted: true)
  async function handleSoftDeleteCurrentClient() {
    if (!client || !isAdmin) return;
    const { error } = await supabase
      .from('clients')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', client.id);
    if (error) throw error;
    router.push('/');
  }

  // Restore Client (Sets is_deleted: false)
  async function handleRestoreCurrentClient() {
    if (!client || !isAdmin) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', client.id);
      if (error) throw error;
      setClient((prev) => (prev ? { ...prev, is_deleted: false } : prev));
    } catch (err: any) {
      alert('Failed to restore client: ' + err.message);
    }
  }

  // Formatting helpers
  function formatDate(iso?: string | null) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Computed metrics (excluding soft-deleted tasks)
  const activeTasks = tasks.filter((t) => !t.is_deleted);
  const deletedTasks = tasks.filter((t) => t.is_deleted);
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const delayedTasks = activeTasks.filter((t) => {
    if (t.is_delayed) return true;
    if (t.status === 'pending') {
      return new Date().getTime() > new Date(t.deadline).getTime();
    }
    return false;
  }).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Filtered task list
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase())) ||
      (t.assignee?.name && t.assignee.name.toLowerCase().includes(taskSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'deleted') {
      return t.is_deleted === true;
    }

    if (t.is_deleted) return false;

    if (filterStatus === 'pending') return t.status === 'pending';
    if (filterStatus === 'completed') return t.status === 'completed';
    if (filterStatus === 'delayed') {
      return t.is_delayed || (t.status === 'pending' && new Date().getTime() > new Date(t.deadline).getTime());
    }
    return true;
  });

  // Accordion state: map of memberId -> boolean (true = open, false/undefined = closed by default)
  const [openMembers, setOpenMembers] = useState<Record<string, boolean>>({});

  // Group filtered tasks by assigned team member
  const teamGroups = React.useMemo(() => {
    const groupMap = new Map<
      string,
      {
        memberId: string;
        memberName: string;
        memberRole?: string;
        memberDesignation?: string;
        memberAvatar?: string;
        memberPhone?: string;
        tasks: Task[];
      }
    >();

    filteredTasks.forEach((task) => {
      const assignedId = task.assigned_to || 'unassigned';
      if (!groupMap.has(assignedId)) {
        const profile = task.assignee || profiles.find((p) => p.id === assignedId);
        groupMap.set(assignedId, {
          memberId: assignedId,
          memberName: profile?.name || (assignedId === 'unassigned' ? 'Unassigned Deliverables' : 'Team Member'),
          memberRole: profile?.role,
          memberDesignation: profile?.designation,
          memberAvatar: profile?.avatar_url,
          memberPhone: profile?.phone,
          tasks: [],
        });
      }
      groupMap.get(assignedId)!.tasks.push(task);
    });

    return Array.from(groupMap.values()).map((group) => {
      const total = group.tasks.length;
      const completed = group.tasks.filter((t) => t.status === 'completed').length;
      const pending = total - completed;
      const delayed = group.tasks.filter((t) => {
        if (t.is_delayed) return true;
        if (t.status === 'pending') {
          return new Date().getTime() > new Date(t.deadline).getTime();
        }
        return false;
      }).length;

      return {
        ...group,
        total,
        completed,
        pending,
        delayed,
      };
    }).sort((a, b) => {
      if (currentUser?.id) {
        if (a.memberId === currentUser.id) return -1;
        if (b.memberId === currentUser.id) return 1;
      }
      return a.memberName.localeCompare(b.memberName);
    });
  }, [filteredTasks, profiles, currentUser]);

  const toggleMemberCollapse = (memberId: string) => {
    setOpenMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const expandAllMembers = () => {
    const next: Record<string, boolean> = {};
    teamGroups.forEach((g) => {
      next[g.memberId] = true;
    });
    setOpenMembers(next);
  };
  const collapseAllMembers = () => setOpenMembers({});

  if (authLoading || (loading && !client)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <RefreshCw size={28} className="animate-spin" color="#6366F1" />
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
          Loading client deliverable workspace...
        </div>
      </div>
    );
  }

  if (errorMsg || !client) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          gap: 16,
        }}
      >
        <div className="card-clean" style={{ maxWidth: 480, width: '100%', padding: '24px', textAlign: 'center' }}>
          <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Client Not Found
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
            {errorMsg || 'The requested client record does not exist or may have been deleted.'}
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Docked Left Sidebar (Same as Dashboard!) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          router.push(tab === 'clients' ? '/' : `/?tab=${tab}`);
        }}
        currentUser={currentUser}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSignOut={logout}
      />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Header */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                alignItems: 'center',
                color: '#64748B',
                flexShrink: 0,
              }}
              className="mobile-only"
              aria-label="Toggle Navigation"
            >
              <Menu size={20} />
            </button>

            <Link
              href="/"
              className="btn-secondary btn-sm"
              style={{
                textDecoration: 'none',
                gap: 5,
                fontWeight: 600,
                color: '#334155',
                padding: '5px 10px',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={13} />
              <span className="hide-on-mobile">Back to Clients</span>
              <span className="mobile-only">Back</span>
            </Link>

            <div style={{ height: 18, width: 1, backgroundColor: '#E2E8F0' }} className="hide-on-mobile" />

            <div className="hide-on-mobile" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {client.name}
              </span>
              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
                Client Deliverables Hub
              </span>
            </div>
          </div>

          {/* Right: + Add Task Drawer Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => {
                setFormError('');
                setIsAddDrawerOpen(true);
              }}
              className="btn-primary"
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span className="hide-on-mobile">+ Add Deliverable Task</span>
              <span className="mobile-only">+ Add Task</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="btn-secondary btn-sm"
              style={{ color: '#DC2626', borderColor: '#FECACA', padding: '5px 8px' }}
              title="Sign Out"
            >
              <LogOut size={13} color="#DC2626" />
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="app-main-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Success Notice Banner */}
          {successNotice && (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '10px 16px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Check size={16} color="#059669" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Trash notice if client is soft-deleted */}
          {client.is_deleted && (
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                color: '#991B1B',
                fontSize: 13,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={16} color="#DC2626" />
                <span>
                  <strong>Trash Notice:</strong> This client record is currently in the Trash.
                </span>
              </div>
              {isAdmin && (
                <button
                  onClick={handleRestoreCurrentClient}
                  className="btn-secondary btn-sm"
                  style={{
                    color: '#059669',
                    backgroundColor: '#ECFDF5',
                    borderColor: '#A7F3D0',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Restore Client</span>
                </button>
              )}
            </div>
          )}

          {/* Client Header Hero Card */}
          <div className="card-clean" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              {/* Client Profile details */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #C7D2FE',
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={24} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', margin: 0 }}>
                      {client.name}
                    </h1>
                    {client.industry && (
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {client.industry}
                      </span>
                    )}
                    {client.is_deleted && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          padding: '2px 7px',
                          borderRadius: 4,
                          border: '1px solid #FECACA',
                        }}
                      >
                        TRASH
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap', fontSize: 12, color: '#64748B' }}>
                    {client.phone && (
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#059669',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        <Phone size={12} />
                        <span>+{client.phone}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} />
                      <span>Onboarded: {formatDate(client.created_at)}</span>
                      <span style={{ color: '#6366F1', fontWeight: 600, fontSize: 11 }}>
                        ({formatTimeAgo(client.created_at)})
                      </span>
                    </div>
                  </div>

                  {client.notes && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: '#475569',
                        backgroundColor: '#F8FAFC',
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        maxWidth: 620,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#334155' }}>Brief: </span>
                      {renderTextWithLinks(client.notes)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Open Add Task Drawer & Client Delete/Restore */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setFormError('');
                    setIsAddDrawerOpen(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: 12.5, padding: '7px 15px' }}
                >
                  <Plus size={15} />
                  <span>Add Deliverable Task</span>
                </button>

                {isAdmin && (
                  client.is_deleted ? (
                    <button
                      onClick={handleRestoreCurrentClient}
                      className="btn-secondary"
                      style={{
                        padding: '7px 14px',
                        fontSize: 12.5,
                        color: '#059669',
                        backgroundColor: '#ECFDF5',
                        borderColor: '#A7F3D0',
                        gap: 4,
                      }}
                      title="Restore client from trash"
                    >
                      <RotateCcw size={14} />
                      <span>Restore Client</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDeleteClientModal(true)}
                      className="btn-danger"
                      style={{ padding: '7px 12px', fontSize: 12.5 }}
                      title="Move client to trash (Type DELETE to confirm)"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Move to Trash</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Progress & Metrics Summary */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #F1F5F9',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#64748B' }}>
                  Total Deliverables
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {totalTasks}
                </div>
              </div>

              <div style={{ padding: '8px 12px', backgroundColor: '#F0FDF4', borderRadius: 8, border: '1px solid #DCFCE7' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#166534' }}>
                  Completed ({progressPercent}%)
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#15803D', marginTop: 2 }}>
                  {completedTasks}
                </div>
              </div>

              <div style={{ padding: '8px 12px', backgroundColor: '#FFFBEB', borderRadius: 8, border: '1px solid #FEF3C7' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#92400E' }}>
                  Pending Work
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#B45309', marginTop: 2 }}>
                  {pendingTasks}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: delayedTasks > 0 ? '#FEF2F2' : '#F8FAFC',
                  borderRadius: 8,
                  border: delayedTasks > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: delayedTasks > 0 ? '#991B1B' : '#64748B' }}>
                  Delay Penalties
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: delayedTasks > 0 ? '#DC2626' : '#64748B', marginTop: 2 }}>
                  {delayedTasks} {delayedTasks === 1 ? 'task' : 'tasks'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: progressPercent === 100 ? '#10B981' : '#6366F1',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: All Deliverables for this Client */}
          <div className="card-clean" style={{ padding: '20px 24px' }}>
            {/* Header & Filter Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Deliverables & Objectives ({filteredTasks.length})
                </h2>
                <p style={{ fontSize: 11.5, color: '#64748B', margin: 0 }}>
                  Tick off deliverables, audit timestamps, and collaborate via WhatsApp-linked notes
                </p>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'all', label: `All (${totalTasks})` },
                    { id: 'pending', label: `Pending (${pendingTasks})` },
                    { id: 'completed', label: `Completed (${completedTasks})` },
                    { id: 'delayed', label: `Delayed (${delayedTasks})` },
                    ...(deletedTasks.length > 0 || filterStatus === 'deleted'
                      ? [{ id: 'deleted', label: `🗑️ Trash (${deletedTasks.length})` }]
                      : []),
                  ] as { id: 'all' | 'pending' | 'completed' | 'delayed' | 'deleted'; label: string }[]
                ).map((tab) => {
                  const isActive = filterStatus === tab.id;
                  const isTrashTab = tab.id === 'deleted';
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: isActive ? 600 : 500,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: isActive
                          ? isTrashTab
                            ? '1px solid #EF4444'
                            : '1px solid #6366F1'
                          : '1px solid #E2E8F0',
                        backgroundColor: isActive
                          ? isTrashTab
                            ? '#FEF2F2'
                            : '#EEF2FF'
                          : '#FFFFFF',
                        color: isActive
                          ? isTrashTab
                            ? '#DC2626'
                            : '#4338CA'
                          : isTrashTab
                          ? '#DC2626'
                          : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Bar & Expand/Collapse Toggle inside tasks */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search deliverables by title, instructions, or assigned team member..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  style={{ fontSize: 12.5 }}
                />
              </div>

              {teamGroups.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={expandAllMembers}
                    className="btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '5px 9px', gap: 4 }}
                    title="Expand all team dropdowns"
                  >
                    <ChevronDown size={13} />
                    <span>Expand All</span>
                  </button>
                  <button
                    onClick={collapseAllMembers}
                    className="btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '5px 9px', gap: 4 }}
                    title="Collapse all team dropdowns"
                  >
                    <ChevronUp size={13} />
                    <span>Collapse All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Task List Rendering Grouped by Team */}
            {filteredTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  color: '#64748B',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px dashed #E2E8F0',
                }}
              >
                <CheckCircle2 size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                  No deliverables found
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, marginBottom: 14 }}>
                  {tasks.length === 0
                    ? 'No tasks added yet for this client. Open the sidebar drawer to add the first deliverable.'
                    : 'No tasks match your search and filter criteria.'}
                </p>
                {tasks.length === 0 && (
                  <button
                    onClick={() => {
                      setFormError('');
                      setIsAddDrawerOpen(true);
                    }}
                    className="btn-primary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Add First Deliverable</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {teamGroups.map((group) => {
                  const isExpanded = Boolean(openMembers[group.memberId]);
                  const isCollapsed = !isExpanded;
                  const isCurrentUser = currentUser?.id === group.memberId;

                  return (
                    <div
                      key={group.memberId}
                      style={{
                        backgroundColor: isCurrentUser ? '#FAF5FF' : '#FFFFFF',
                        borderRadius: 10,
                        border: isCurrentUser ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
                        overflow: 'hidden',
                        boxShadow: isCurrentUser ? '0 4px 14px rgba(99, 102, 241, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Subheading of that Team / Member */}
                      <div
                        onClick={() => toggleMemberCollapse(group.memberId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 12,
                          padding: '11px 16px',
                          backgroundColor: isCurrentUser
                            ? (isCollapsed ? '#F5F3FF' : '#EEF2FF')
                            : (isCollapsed ? '#FAFAFA' : '#F8FAFC'),
                          borderBottom: isCollapsed ? 'none' : (isCurrentUser ? '1px solid #C7D2FE' : '1px solid #E2E8F0'),
                          borderLeft: isCurrentUser ? '4px solid #6366F1' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        title={isCollapsed ? 'Click to open deliverables dropdown' : 'Click to collapse'}
                      >
                        {/* Left: Chevron + Avatar + Team Name + Role */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              backgroundColor: isCurrentUser ? '#6366F1' : '#EEF2FF',
                              color: isCurrentUser ? '#FFFFFF' : '#6366F1',
                            }}
                          >
                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          </div>

                          {/* Member Avatar */}
                          {group.memberAvatar ? (
                            <img
                              src={group.memberAvatar}
                              alt={group.memberName}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isCurrentUser ? '2px solid #6366F1' : 'none',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                backgroundColor: isCurrentUser ? '#6366F1' : '#EEF2FF',
                                color: isCurrentUser ? '#FFFFFF' : '#4F46E5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                border: isCurrentUser ? '2px solid #4338CA' : 'none',
                              }}
                            >
                              {group.memberName.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: isCurrentUser ? '#1E1B4B' : '#0F172A' }}>
                                {group.memberName}
                              </span>

                              {isCurrentUser && (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 9999,
                                    backgroundColor: '#4F46E5',
                                    color: '#FFFFFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)',
                                    letterSpacing: '0.02em',
                                  }}
                                  title="This is your assigned workspace"
                                >
                                  ★ You
                                </span>
                              )}

                              {group.memberRole && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    textTransform: 'uppercase',
                                    backgroundColor: group.memberRole === 'admin' ? '#EEF2FF' : '#F1F5F9',
                                    color: group.memberRole === 'admin' ? '#4F46E5' : '#475569',
                                    border: '1px solid #E2E8F0',
                                  }}
                                >
                                  {group.memberRole}
                                </span>
                              )}

                              {group.memberDesignation && (
                                <span style={{ fontSize: 11, color: '#64748B' }}>
                                  • {group.memberDesignation}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Metrics Badges & WhatsApp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {group.memberPhone && (
                            <a
                              href={`https://wa.me/${group.memberPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hi ${group.memberName}, regarding client "${client?.name}" deliverables.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#059669',
                                fontSize: 11,
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                              title="Message team member on WhatsApp"
                            >
                              <Phone size={11} />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                            }}
                          >
                            {group.total} {group.total === 1 ? 'Task' : 'Tasks'}
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                            }}
                          >
                            {group.completed} Done
                          </span>

                          {group.pending > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: '#FFFBEB',
                                color: '#D97706',
                              }}
                            >
                              {group.pending} Pending
                            </span>
                          )}

                          {group.delayed > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                              }}
                            >
                              {group.delayed} Delayed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Content with that Team Member's Tasks */}
                      {!isCollapsed && (
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                          {group.tasks.map((task) => {
                            const isCompleted = task.status === 'completed';
                            const isToggling = togglingTaskId === task.id;
                            const canToggle = currentUser?.role === 'admin' || task.assigned_to === currentUser?.id;

                            return (
                              <div
                                key={task.id}
                                style={{
                                  padding: '12px 15px',
                                  backgroundColor: isCompleted ? '#F8FAFC' : '#FFFFFF',
                                  borderRadius: 8,
                                  border: '1px solid #E2E8F0',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  transition: 'all 0.15s ease',
                                  borderLeft: isCompleted
                                    ? '4px solid #10B981'
                                    : task.is_delayed
                                    ? '4px solid #DC2626'
                                    : '4px solid #6366F1',
                                }}
                              >
                                {/* Left: Checkbox & Info */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
                                  <button
                                    onClick={() => handleToggleTask(task)}
                                    disabled={isToggling || !canToggle}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: canToggle ? 'pointer' : 'not-allowed',
                                      opacity: canToggle ? 1 : 0.4,
                                      padding: 2,
                                      marginTop: 2,
                                      color: isCompleted ? '#059669' : '#94A3B8',
                                    }}
                                    title={
                                      !canToggle
                                        ? 'Only the assigned team member or Admin can mark this completed'
                                        : isCompleted
                                        ? 'Mark Pending'
                                        : 'Mark Completed'
                                    }
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 size={19} color="#059669" />
                                    ) : (
                                      <Circle size={19} color="#94A3B8" />
                                    )}
                                  </button>

                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span
                                        style={{
                                          fontSize: 13.5,
                                          fontWeight: 600,
                                          color: task.is_deleted ? '#94A3B8' : isCompleted ? '#64748B' : '#0F172A',
                                          textDecoration: task.is_deleted || isCompleted ? 'line-through' : 'none',
                                        }}
                                      >
                                        {task.title}
                                      </span>

                                      {task.is_deleted && (
                                        <span
                                          className="badge"
                                          style={{
                                            backgroundColor: '#FEE2E2',
                                            color: '#DC2626',
                                            border: '1px solid #FECACA',
                                            fontSize: 10,
                                            padding: '1px 6px',
                                          }}
                                        >
                                          In Trash
                                        </span>
                                      )}

                                      {/* Status & Live Countdown Badge */}
                                      <DelayBadge
                                        deadline={task.deadline}
                                        completedAt={task.completed_at}
                                        status={task.status}
                                      />
                                    </div>

                                    {task.description && (
                                      <p style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Audit Timestamps */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5, flexWrap: 'wrap', fontSize: 11, color: '#94A3B8' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={11} />
                                        <span>Deadline: {formatDate(task.deadline)}</span>
                                      </span>

                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span>Added: {formatDate(task.created_at)}</span>
                                        <span style={{ color: '#6366F1', fontWeight: 600, fontSize: 10 }}>
                                          ({formatTimeAgo(task.created_at)})
                                        </span>
                                      </span>

                                      {isCompleted && task.completed_at && (
                                        <span style={{ color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                          <span>Completed: {formatDate(task.completed_at)}</span>
                                          <span style={{ opacity: 0.85, fontSize: 10 }}>({formatTimeAgo(task.completed_at)})</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Action Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {/* Notes Button with dynamic total count badge */}
                                  <button
                                    onClick={() => setCommentTask(task)}
                                    className="btn-secondary btn-sm"
                                    style={{
                                      gap: 5,
                                      fontSize: 11.5,
                                      padding: '4px 9px',
                                      backgroundColor: (task.comments_count || 0) > 0 ? '#EEF2FF' : '#FFFFFF',
                                      borderColor: (task.comments_count || 0) > 0 ? '#C7D2FE' : '#E2E8F0',
                                      color: (task.comments_count || 0) > 0 ? '#4338CA' : '#334155',
                                      fontWeight: (task.comments_count || 0) > 0 ? 600 : 500,
                                    }}
                                    title={
                                      (task.comments_count || 0) > 0
                                        ? `${task.comments_count} ${task.comments_count === 1 ? 'note' : 'notes'} on this deliverable`
                                        : 'Add or view notes'
                                    }
                                  >
                                    <MessageSquare
                                      size={12}
                                      color={(task.comments_count || 0) > 0 ? '#4F46E5' : '#6366F1'}
                                    />
                                    <span>Notes</span>
                                    {(task.comments_count || 0) > 0 && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          minWidth: 17,
                                          height: 17,
                                          padding: '0 5px',
                                          borderRadius: 999,
                                          backgroundColor: '#4F46E5',
                                          color: '#FFFFFF',
                                          fontSize: 10,
                                          fontWeight: 700,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {task.comments_count}
                                      </span>
                                    )}
                                  </button>

                                  {/* Delete or Restore Button */}
                                  {task.is_deleted ? (
                                    <button
                                      onClick={() => handleRestoreTask(task)}
                                      className="btn-secondary btn-sm"
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: 11.5,
                                        gap: 5,
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
                                    (currentUser?.role === 'admin' || task.assigned_to === currentUser?.id || task.created_by === currentUser?.id) && (
                                      <button
                                        onClick={() => setTaskToDelete({ ...task, client: client || undefined })}
                                        className="btn-danger btn-sm"
                                        title="Move deliverable to Trash"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide-over Right Drawer: Add Deliverable Task */}
      {isAddDrawerOpen && (
        <div
          className="drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddDrawerOpen(false);
          }}
        >
          <div className="drawer-content">
            {/* Drawer Header */}
            <div
              style={{
                padding: '18px 22px',
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
                    borderRadius: 9,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                    Add Deliverable Task
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>
                    Client: <strong style={{ color: '#334155' }}>{client.name}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsAddDrawerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
                aria-label="Close Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={handleCreateTask} style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Task Deliverable Title with Autocomplete Suggestions Dropdown */}
              <div>
                <label className="form-label">
                  Task Deliverable Title <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <TaskTitleInputWithDropdown
                  value={taskTitle}
                  onChange={setTaskTitle}
                  templates={userTemplates}
                  placeholder="e.g. Research & Launch Meta Ads Campaign, Reel Script..."
                  required
                  onCreate={(customTitle) => handleCreateTask(undefined, customTitle)}
                />
              </div>

              {/* Deliverable Scope & Instructions */}
              <div>
                <label className="form-label">Deliverable Scope & Brief (Optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Provide checklist, assets drive links, creative directions..."
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>

              {/* Assigned Team Member */}
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
                        {currentUser.name} (Assigned to You - Team Role)
                      </option>
                    </select>
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      Team members can only create tasks assigned to themselves.
                    </p>
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
                        {p.name} ({p.role.toUpperCase()} - {p.designation})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Deadline */}
              <div>
                <label className="form-label">
                  Target Deadline <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
                {/* Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>Preset:</span>
                  <button
                    type="button"
                    onClick={() => setDeadlinePreset(1)}
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
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
                    onClick={() => setDeadlinePreset(3)}
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
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
                    onClick={() => setDeadlinePreset(7)}
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
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

              {/* Submit Buttons */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 16,
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
                  onClick={() => setIsAddDrawerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addingTask}
                  style={{ padding: '8px 18px' }}
                >
                  {addingTask ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Adding Deliverable...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save & Assign Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Comments Modal */}
      <TaskCommentsModal
        isOpen={Boolean(commentTask)}
        onClose={() => setCommentTask(null)}
        task={commentTask}
        currentUser={currentUser}
        onCommentAdded={loadClientAndTasks}
      />

      {/* Delete Task Confirmation Modal */}
      <DeleteTaskConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        task={taskToDelete}
        onConfirmDelete={handleSoftDeleteTask}
      />

      {/* Delete Client Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteClientModal}
        onClose={() => setShowDeleteClientModal(false)}
        title="Move Client to Trash?"
        subtitle="Type DELETE to confirm client soft deletion"
        itemTitle={client?.name || ''}
        itemDetails={client?.industry ? `Industry: ${client.industry}` : undefined}
        itemTypeLabel="Client"
        onConfirmDelete={handleSoftDeleteCurrentClient}
      />
    </div>
  );
}

export default function ClientTasksPage(props: ClientTasksPageProps) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <RefreshCw size={28} className="animate-spin" color="#6366F1" />
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
            Loading client workspace...
          </div>
        </div>
      }
    >
      <ClientTasksContent {...props} />
    </Suspense>
  );
}
