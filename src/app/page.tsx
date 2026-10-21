'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ClientsView from '@/components/ClientsView';
import TeamReportView from '@/components/TeamReportView';
import TeamMembersView from '@/components/TeamMembersView';
import WhatsAppLogsView from '@/components/WhatsAppLogsView';
import OnboardClientModal from '@/components/OnboardClientModal';
import AddTaskModal from '@/components/AddTaskModal';
import TaskCommentsModal from '@/components/TaskCommentsModal';
import { supabase } from '@/lib/supabase';
import { Profile, Client, Task } from '@/types/crm';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState<'clients' | 'team_report' | 'members' | 'whatsapp_logs'>('clients');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals States
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [addTaskClient, setAddTaskClient] = useState<Client | null>(null);
  const [commentTask, setCommentTask] = useState<Task | null>(null);

  // Auth Guard: if not loading and not logged in -> redirect to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  // Tab Guard: Team members cannot access members directory or WhatsApp logs
  useEffect(() => {
    if (currentUser?.role === 'team' && (currentTab === 'members' || currentTab === 'whatsapp_logs')) {
      setCurrentTab('clients');
    }
  }, [currentUser, currentTab]);

  // Load CRM data whenever currentUser is available
  useEffect(() => {
    if (currentUser) {
      fetchCRMData();
    }
  }, [currentUser]);

  // Fetch all CRM records client-side from Supabase
  async function fetchCRMData() {
    setDataLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });

      if (profErr) throw profErr;
      setProfiles(profilesData || []);

      // 2. Fetch clients
      const { data: clientsData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientErr) throw clientErr;
      setClients(clientsData || []);

      // 3. Fetch tasks
      const { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (taskErr) throw taskErr;

      const loadedTasks = tasksData || [];
      const taskIds = loadedTasks.map((t) => t.id);
      const commentCountMap: Record<string, number> = {};

      if (taskIds.length > 0) {
        const { data: commentsCountData } = await supabase
          .from('task_comments')
          .select('task_id')
          .in('task_id', taskIds);

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
      console.error('Error fetching CRM data:', err);
      setErrorMsg(err.message || 'Failed to connect to database');
    } finally {
      setDataLoading(false);
    }
  }

  // Titles per tab
  const tabTitles = {
    clients: {
      title: 'Clients & Deliverables Management',
      subtitle: 'Onboard brand clients, delegate tasks, track deadlines & progress',
    },
    team_report: {
      title: 'Team Management & Salary Review',
      subtitle: 'Audit completed work, pending tasks, and delay penalties by date range',
    },
    members: {
      title: 'Agency Team Directory',
      subtitle: 'Manage agency staff, roles, and WhatsApp notification numbers',
    },
    whatsapp_logs: {
      title: 'WhatsApp Alert Dispatch Console',
      subtitle: 'Real-time logs of onboarding alerts and task comment pings',
    },
  };

  const currentTabInfo = tabTitles[currentTab];

  // 1. Auth Loading Spinner
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          color: '#64748B',
        }}
      >
        <RefreshCw size={28} className="animate-spin" color="#6366F1" />
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>
          Checking agency credentials...
        </div>
      </div>
    );
  }

  // 2. If unauthenticated, redirecting to /login
  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === 'admin';

  // 3. Authenticated CRM Dashboard
  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSignOut={logout}
      />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Header with prominent Logout button */}
        <Header
          title={currentTabInfo.title}
          subtitle={currentTabInfo.subtitle}
          currentUser={currentUser}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
          isAdmin={isAdmin}
          onSignOut={logout}
        />

        {/* Page Content Container */}
        <main className="app-main-content">
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderRadius: 8,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={fetchCRMData}
                className="btn-secondary btn-sm"
              >
                Retry
              </button>
            </div>
          )}

          {dataLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 320,
                gap: 12,
                color: '#94A3B8',
              }}
            >
              <RefreshCw size={24} className="animate-spin" color="#6366F1" />
              <div style={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0' }}>
                Syncing workspace from Supabase...
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  tasks={tasks}
                  profiles={profiles}
                  currentUser={currentUser}
                  onRefresh={fetchCRMData}
                  onOpenAddTask={(client) => setAddTaskClient(client)}
                  onOpenComments={(task) => setCommentTask(task)}
                  onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
                />
              )}

              {currentTab === 'team_report' && (
                <TeamReportView
                  tasks={tasks}
                  profiles={profiles}
                  clients={clients}
                  currentUser={currentUser}
                  onOpenComments={(task) => setCommentTask(task)}
                />
              )}

              {currentTab === 'members' && isAdmin && (
                <TeamMembersView
                  profiles={profiles}
                  tasks={tasks}
                  currentUser={currentUser}
                  onRefresh={fetchCRMData}
                />
              )}

              {currentTab === 'whatsapp_logs' && isAdmin && <WhatsAppLogsView />}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <OnboardClientModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        currentUser={currentUser}
        onClientCreated={fetchCRMData}
      />

      <AddTaskModal
        isOpen={Boolean(addTaskClient)}
        onClose={() => setAddTaskClient(null)}
        client={addTaskClient}
        profiles={profiles}
        currentUser={currentUser}
        onTaskCreated={fetchCRMData}
      />

      <TaskCommentsModal
        isOpen={Boolean(commentTask)}
        onClose={() => setCommentTask(null)}
        task={commentTask}
        currentUser={currentUser}
        onCommentAdded={fetchCRMData}
      />
    </div>
  );
}
