'use client';

import React from 'react';
import { Menu, Plus, Shield, Smartphone, LogOut } from 'lucide-react';
import { Profile } from '@/types/crm';

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentUser: Profile | null;
  onOpenMobileMenu: () => void;
  onOpenOnboardModal: () => void;
  isAdmin: boolean;
  onSignOut: () => void;
}

export default function Header({
  title,
  subtitle,
  currentUser,
  onOpenMobileMenu,
  onOpenOnboardModal,
  isAdmin,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="app-header">
      {/* Left Title & Mobile Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <button
          onClick={onOpenMobileMenu}
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

        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="hide-on-mobile"
              style={{
                fontSize: 11.5,
                color: '#64748B',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Onboard Client Button */}
        {isAdmin ? (
          <button
            onClick={onOpenOnboardModal}
            className="btn-primary"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            <Plus size={14} />
            <span className="hide-on-mobile">Onboard Client</span>
            <span className="mobile-only">Onboard</span>
          </button>
        ) : null}

        {/* User Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 8px',
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
          }}
          title={`${currentUser?.name} (${currentUser?.role}) - ${currentUser?.phone}`}
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 11.5,
              }}
            >
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'FO'}
            </div>
          )}

          <div className="hide-on-mobile" style={{ textAlign: 'left', lineHeight: 1.25 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{currentUser?.name}</span>
              <span
                className={`badge ${currentUser?.role === 'admin' ? 'badge-admin' : 'badge-team'}`}
                style={{ fontSize: 9.5, padding: '1px 6px' }}
              >
                {currentUser?.role === 'admin' ? 'Admin' : 'Team'}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <Smartphone size={10} color="#059669" />
              <span>{currentUser?.phone}</span>
            </div>
          </div>
        </div>

        {/* Prominent Header Logout Button */}
        <button
          onClick={onSignOut}
          className="btn-secondary"
          style={{
            padding: '6px 8px',
            fontSize: 12,
            gap: 4,
            color: '#DC2626',
            borderColor: '#FECACA',
            flexShrink: 0,
          }}
          title="Sign Out of Portal"
        >
          <LogOut size={13} color="#DC2626" />
          <span className="hide-on-mobile">Logout</span>
        </button>
      </div>
    </header>
  );
}
