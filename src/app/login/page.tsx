'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import { RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { currentUser, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/');
    }
  }, [currentUser, loading, router]);

  if (loading) {
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
          Checking session...
        </div>
      </div>
    );
  }

  if (currentUser) {
    return null; // Will redirect via useEffect
  }

  return <AuthScreen onAuthenticated={(profile) => login(profile)} />;
}
