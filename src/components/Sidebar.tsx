'use client';

import React from 'react';
import { 
  Building2, 
  Users, 
  CheckSquare, 
  MessageSquare, 
  TrendingUp,
  X,
  ChevronRight,
  LogOut,
  Shield,
  UserCheck,
  BookOpen
} from 'lucide-react';
import { Profile } from '@/types/crm';

interface SidebarProps {
  currentTab: 'clients' | 'team_report' | 'members' | 'whatsapp_logs' | 'guidance';
  setCurrentTab: (tab: 'clients' | 'team_report' | 'members' | 'whatsapp_logs' | 'guidance') => void;
  currentUser: Profile | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onSignOut,
}: SidebarProps) {
  const isAdmin = currentUser?.role === 'admin';

  const allNavItems = [
    {
      id: 'clients' as const,
      label: 'Clients & Tasks',
      icon: Building2,
      desc: 'Onboard & track deliverables',
      adminOnly: false,
    },
    {
      id: 'team_report' as const,
      label: 'Team & Salary Report',
      icon: TrendingUp,
      desc: 'Delay calculations & audit',
      adminOnly: false,
    },
    {
      id: 'guidance' as const,
      label: 'Team Guidance',
      icon: BookOpen,
      desc: 'Word SOPs & research library',
      adminOnly: false,
    },
    {
      id: 'members' as const,
      label: 'Agency Team Directory',
      icon: Users,
      desc: 'Roles & WhatsApp numbers',
      adminOnly: true,
    },
    {
      id: 'whatsapp_logs' as const,
      label: 'WhatsApp Dispatch Logs',
      icon: MessageSquare,
      desc: 'Real-time alert delivery logs',
      adminOnly: true,
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="mobile-overlay"
        />
      )}

      <aside className={`app-sidebar ${isOpenMobile ? 'sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '18px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#FFFFFF',
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
              }}
            >
              FO
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', letterSpacing: '-0.01em' }}>
                First Option Agency
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Client & Team CRM
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 4,
            }}
            className="mobile-only"
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current User Info Card */}
        <div
          style={{
            margin: '12px',
            padding: '10px 12px',
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'FO'}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span
                className={`badge ${currentUser?.role === 'admin' ? 'badge-admin' : 'badge-team'}`}
                style={{ fontSize: 9.5, padding: '1px 5px' }}
              >
                {currentUser?.role === 'admin' ? <Shield size={9} /> : <UserCheck size={9} />}
                <span>{currentUser?.role?.toUpperCase()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '6px 10px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.04em' }}>
            Agency Workspace
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  onCloseMobile();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 3,
                  border: 'none',
                  backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                  color: isActive ? '#4338CA' : '#475569',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={16} color={isActive ? '#6366F1' : '#64748B'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} color="#6366F1" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom Bar: Sign Out & Status */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <button
            onClick={onSignOut}
            className="btn-secondary"
            style={{
              width: '100%',
              fontSize: 12,
              padding: '7px 10px',
              justifyContent: 'flex-start',
              gap: 8,
              color: '#DC2626',
              borderColor: '#FECACA',
              backgroundColor: '#FFFFFF',
            }}
          >
            <LogOut size={13} color="#DC2626" />
            <span>Sign Out</span>
          </button>

          <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span>Supabase Connected</span>
            </span>
            <span>Client-Only</span>
          </div>
        </div>
      </aside>
    </>
  );
}
