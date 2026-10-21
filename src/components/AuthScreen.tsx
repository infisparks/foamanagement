'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Briefcase, 
  Shield, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/crm';

interface AuthScreenProps {
  onAuthenticated: (profile: Profile) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin@786');
  const [showPassword, setShowPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('919958399157');
  const [regRole, setRegRole] = useState<'admin' | 'team'>('team');
  const [regDesignation, setRegDesignation] = useState('Meta Ads Specialist');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Fetch profile from Supabase profiles table
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profError) throw profError;

      if (!profile) {
        throw new Error('No user profile found with this email. Please check your credentials or register.');
      }

      // Check password if profile has password column
      if (profile.password && profile.password !== password) {
        throw new Error('Incorrect password. Please verify your credentials.');
      }

      // Successfully authenticated
      localStorage.setItem('fo_crm_user_id', profile.id);
      onAuthenticated(profile);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Registration
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regPhone.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = regEmail.trim().toLowerCase();

    try {
      const userId: string = crypto.randomUUID();

      // Insert into profiles table
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: regName.trim(),
          email: cleanEmail,
          phone: regPhone.trim(),
          role: regRole,
          designation: regDesignation.trim() || (regRole === 'admin' ? 'Agency Director' : 'Team Member'),
          password: regPassword,
          avatar_url: `https://images.unsplash.com/photo-${regRole === 'admin' ? '1534528741775-53994a69daeb' : '1507003211169-0a1dd7228f2d'}?w=120&auto=format&fit=crop&q=80`,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('An account with this email already exists. Please log in.');
        }
        throw insertError;
      }

      setSuccessMsg('Account registered successfully! Logging you in...');
      setTimeout(() => {
        localStorage.setItem('fo_crm_user_id', newProfile.id);
        onAuthenticated(newProfile);
      }, 600);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#0F172A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Subtle Gradient Accents */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, rgba(168, 85, 247, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container Card */}
      <div
        style={{
          maxWidth: 940,
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
          zIndex: 10,
        }}
        className="auth-grid-card"
      >
        {/* Left Side: Agency Brand & Features */}
        <div
          style={{
            padding: '36px 32px',
            backgroundColor: '#F8FAFC',
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="auth-sidebar-features"
        >
          <div>
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 16,
                  color: '#FFFFFF',
                  boxShadow: '0 3px 10px rgba(99, 102, 241, 0.3)',
                }}
              >
                FO
              </div>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  First Option Agency
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>
                  Client Deliverables & Team CRM
                </div>
              </div>
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', lineHeight: 1.35, marginBottom: 10 }}>
              Real-time deliverables, delay audits & WhatsApp alerts.
            </div>
            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.6, marginBottom: 26 }}>
              Automated notifications for client onboarding and team notes, deadline delay tracking for salary appraisals, and multi-team collaboration.
            </p>

            {/* Feature Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                    Evolution WhatsApp Dispatch
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Instant alerts to all members on client onboarding & notes
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#FFFBEB',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                    Deadline Delay Auditor
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Automated delayed day calculation for review at salary payout
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                    Role-Based Access
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Admin full control & Team deliverable execution
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#059669' }} />
            <span>Supabase Connected (Live Auth Active)</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
              {mode === 'login' ? 'Sign In to Portal' : 'Register New Account'}
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              {mode === 'login'
                ? 'Enter your agency credentials to access workspace'
                : 'Create your agency account to collaborate with team'}
            </div>
          </div>

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
                marginBottom: 16,
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#059669',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    color="#94A3B8"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gmail.com"
                    style={{ paddingLeft: 32 }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    color="#94A3B8"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: 32, paddingRight: 32 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  fontSize: 13.5,
                  marginTop: 4,
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Agency CRM'}</span>
                <ArrowRight size={15} />
              </button>

              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Don&apos;t have an account yet?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4F46E5',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 12,
                    textDecoration: 'underline',
                  }}
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div>
                <label className="form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="919958399157"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">
                    Role Assignment
                  </label>
                  <select
                    className="form-select"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                  >
                    <option value="team">Team Member</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Department / Designation
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="Meta Ads, SEO, Creative..."
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Create Password *
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  padding: '9px 16px',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <span>{loading ? 'Creating Account...' : 'Register & Join Agency'}</span>
                <ArrowRight size={15} />
              </button>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  Already registered?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4F46E5',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 12,
                    textDecoration: 'underline',
                  }}
                >
                  Log in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
