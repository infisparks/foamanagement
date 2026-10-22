'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Shield, 
  UserCheck, 
  X, 
  Check, 
  Smartphone, 
  Edit2, 
  Save, 
  RefreshCw, 
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { Profile, Task, Designation } from '@/types/crm';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { useAuth } from '@/context/AuthContext';
import DesignationsSidebar from '@/components/DesignationsSidebar';

interface TeamMembersViewProps {
  profiles: Profile[];
  tasks: Task[];
  designations?: Designation[];
  currentUser: Profile | null;
  onRefresh: () => void;
}

export default function TeamMembersView({
  profiles,
  tasks,
  designations = [],
  currentUser,
  onRefresh,
}: TeamMembersViewProps) {
  const { refreshProfile } = useAuth();

  // Designations Sidebar State
  const [isDesignationsSidebarOpen, setIsDesignationsSidebarOpen] = useState(false);

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'team'>('team');
  const [designationId, setDesignationId] = useState('');
  const [customDesignation, setCustomDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Profile State (Admin or self)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignationId, setEditDesignationId] = useState('');
  const [editCustomDesignation, setEditCustomDesignation] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'team'>('team');
  const [updating, setUpdating] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // WhatsApp Ping States
  const [testingPhone, setTestingPhone] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const activeDesignations = designations.filter((d) => !d.is_deleted);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Name, email, WhatsApp phone number, and password are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userId = crypto.randomUUID();

      // Resolve designation title & foreign key ID
      const selectedDesig = designations.find((d) => d.id === designationId);
      const finalTitle = selectedDesig 
        ? selectedDesig.title 
        : (customDesignation.trim() || (role === 'admin' ? 'Agency Director' : 'Team Specialist'));
      const finalDesigId = selectedDesig ? selectedDesig.id : null;

      const { error } = await supabase.from('profiles').insert({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role,
        designation: finalTitle,
        designation_id: finalDesigId,
        password: password.trim(),
        avatar_url: `https://images.unsplash.com/photo-${role === 'admin' ? '1534528741775-53994a69daeb' : '1507003211169-0a1dd7228f2d'}?w=120&auto=format&fit=crop&q=80`,
      });

      if (error) throw error;

      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setDesignationId('');
      setCustomDesignation('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to add profile:', err);
      setErrorMsg(err.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  }

  // Open Edit Profile Modal
  function startEditing(p: Profile) {
    setEditingProfile(p);
    setEditName(p.name);
    setEditPhone(p.phone || '');
    
    // Find matching designation by foreign key or title
    const matched = designations.find(
      (d) => d.id === p.designation_id || (!d.is_deleted && d.title.toLowerCase() === (p.designation || '').toLowerCase())
    );
    if (matched) {
      setEditDesignationId(matched.id);
      setEditCustomDesignation('');
    } else {
      setEditDesignationId(p.designation_id || '');
      setEditCustomDesignation(p.designation || '');
    }

    setEditRole(p.role || 'team');
    setEditErrorMsg('');
  }

  // Handle Update Profile in Supabase
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProfile) return;
    if (!editName.trim() || !editPhone.trim()) {
      setEditErrorMsg('Name and WhatsApp phone number are required.');
      return;
    }

    setUpdating(true);
    setEditErrorMsg('');

    try {
      const selectedDesig = designations.find((d) => d.id === editDesignationId);
      const finalTitle = selectedDesig 
        ? selectedDesig.title 
        : (editCustomDesignation.trim() || editingProfile.designation || 'Team Member');
      const finalDesigId = selectedDesig ? selectedDesig.id : (editDesignationId || null);

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName.trim(),
          phone: editPhone.trim(),
          designation: finalTitle,
          designation_id: finalDesigId,
          role: editRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      // If user edited their own profile, sync local auth state
      if (currentUser?.id === editingProfile.id) {
        await refreshProfile();
      }

      setSuccessBanner(`Profile for "${editName.trim()}" updated successfully!`);
      setTimeout(() => setSuccessBanner(null), 4000);
      setEditingProfile(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setEditErrorMsg(err.message || 'Error updating profile');
    } finally {
      setUpdating(false);
    }
  }

  // Direct client-side WhatsApp test message
  async function handleTestPing(member: Profile) {
    setTestingPhone(member.id);
    setTestResult(null);
    try {
      const res = await sendWhatsAppNotification({
        recipientPhone: member.phone,
        recipientName: member.name,
        message: `👋 Hello ${member.name}! First Option Agency CRM test ping to your WhatsApp. System is live!`,
        eventType: 'manual_test',
      });

      if (res.success) {
        setTestResult(`WhatsApp ping dispatched to ${member.name}!`);
      } else {
        setTestResult(`Ping recorded to WhatsApp dispatch log.`);
      }
    } catch (err) {
      setTestResult('Ping recorded to dispatch history.');
    } finally {
      setTimeout(() => {
        setTestingPhone(null);
        setTestResult(null);
      }, 4000);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar */}
      <div
        className="card-clean"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
            Agency Team Directory ({profiles.length})
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>
            Manage agency roles, departments, and verified WhatsApp notification numbers
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsDesignationsSidebarOpen(true)}
              className="btn-secondary btn-sm"
              style={{
                gap: 6,
                borderColor: '#C7D2FE',
                color: '#4338CA',
                backgroundColor: '#FAFAFF',
              }}
              title="Open Designations & Roles Sidebar"
            >
              <Briefcase size={14} color="#6366F1" />
              <span>Designations</span>
              <span
                style={{
                  backgroundColor: '#EEF2FF',
                  color: '#4F46E5',
                  padding: '1px 7px',
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 700,
                  border: '1px solid #E0E7FF',
                }}
              >
                {activeDesignations.length}
              </span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Add Team Member</span>
            </button>
          </div>
        )}
      </div>

      {successBanner && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#ECFDF5',
            borderRadius: 8,
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: 12.5,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} color="#059669" />
          <span>{successBanner}</span>
        </div>
      )}

      {testResult && (
        <div
          style={{
            padding: '9px 14px',
            backgroundColor: '#EFF6FF',
            borderRadius: 8,
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Check size={14} />
          <span>{testResult}</span>
        </div>
      )}

      {/* Team Members Table */}
      <div className="table-container">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Member & Designation</th>
              <th>System Role</th>
              <th>Email</th>
              <th>WhatsApp Number</th>
              <th>Assigned Deliverables</th>
              <th style={{ textAlign: 'right' }}>Actions & WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const memberTasks = tasks.filter((t) => t.assigned_to === p.id && !t.is_deleted);
              const completedCount = memberTasks.filter((t) => t.status === 'completed').length;
              const isPinging = testingPhone === p.id;
              const linkedDesig = designations.find(
                (d) => d.id === p.designation_id || (!p.designation_id && d.title.toLowerCase() === (p.designation || '').toLowerCase())
              );

              return (
                <tr key={p.id}>
                  {/* Member & Avatar */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.name}
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
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                            {p.designation || linkedDesig?.title || 'Team Member'}
                          </span>
                          {linkedDesig?.department && (
                            <span
                              style={{
                                fontSize: 9.5,
                                padding: '1px 5px',
                                borderRadius: 4,
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                border: '1px solid #E2E8F0',
                                fontWeight: 500,
                              }}
                            >
                              {linkedDesig.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <span
                      className={`badge ${p.role === 'admin' ? 'badge-admin' : 'badge-team'}`}
                    >
                      {p.role === 'admin' ? <Shield size={11} /> : <UserCheck size={11} />}
                      <span>{p.role.toUpperCase()}</span>
                    </span>
                  </td>

                  {/* Email */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#475569', fontSize: 12 }}>
                      <Mail size={12} color="#94A3B8" />
                      <span>{p.email}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 500, fontSize: 12.5 }}>
                      <Smartphone size={13} color="#059669" />
                      <span>{p.phone}</span>
                    </div>
                  </td>

                  {/* Tasks count */}
                  <td>
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <strong>{memberTasks.length}</strong> total
                      <span style={{ color: '#64748B', fontSize: 11, marginLeft: 4 }}>
                        ({completedCount} done)
                      </span>
                    </div>
                  </td>

                  {/* Actions & WhatsApp ping */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      {(isAdmin || currentUser?.id === p.id) && (
                        <button
                          onClick={() => startEditing(p)}
                          className="btn-secondary btn-sm"
                          style={{ padding: '4px 9px', fontSize: 11.5, gap: 4 }}
                          title="Edit profile name, phone number, role, or designation"
                        >
                          <Edit2 size={12} color="#6366F1" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleTestPing(p)}
                        disabled={isPinging}
                        className="btn-secondary btn-sm"
                        style={{ padding: '4px 9px', fontSize: 11.5, gap: 4 }}
                        title="Send instant test WhatsApp ping"
                      >
                        <Smartphone size={12} color="#059669" />
                        <span>{isPinging ? 'Pinging...' : 'Test WhatsApp'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#4F46E5" />
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                  Add Team Member
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ padding: '18px 20px' }}>
              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="name@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">WhatsApp Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">System Role</label>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                    >
                      <option value="team">Team Member</option>
                      <option value="admin">Administrator (Full Access)</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Designation *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setIsDesignationsSidebarOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4F46E5',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: 0,
                        }}
                      >
                        <Briefcase size={11} />
                        <span>Manage / Add</span>
                      </button>
                    </div>

                    <select
                      className="form-select"
                      value={designationId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDesignationId(val);
                        if (val !== 'custom') {
                          setCustomDesignation('');
                        }
                      }}
                    >
                      <option value="">Select official designation...</option>
                      {activeDesignations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.department ? `(${d.department})` : ''}
                        </option>
                      ))}
                      <option value="custom">Other / Custom Title</option>
                    </select>

                    {designationId === 'custom' && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter custom designation title..."
                        value={customDesignation}
                        onChange={(e) => setCustomDesignation(e.target.value)}
                        style={{ marginTop: 6 }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Login Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
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
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (Admin or Self) */}
      {editingProfile && (
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
                  <Edit2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                    Edit Profile: {editingProfile.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>
                    Update name, WhatsApp notification number, role & department
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditingProfile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
                aria-label="Close Edit Modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ padding: '18px 20px' }}>
              {editErrorMsg && (
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
                    marginBottom: 12,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Email (Account Login)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editingProfile.email}
                      disabled
                      style={{ backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">WhatsApp Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 919876543210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: 10.5, color: '#059669', marginTop: 3, display: 'block' }}>
                      Country code + number (no spaces or +)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">System Role</label>
                    <select
                      className="form-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      disabled={!isAdmin}
                    >
                      <option value="team">Team Member</option>
                      <option value="admin">Administrator (Full Access)</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Designation *</label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile(null);
                            setIsDesignationsSidebarOpen(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4F46E5',
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: 0,
                          }}
                        >
                          <Briefcase size={11} />
                          <span>Manage / Add</span>
                        </button>
                      )}
                    </div>

                    <select
                      className="form-select"
                      value={editDesignationId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditDesignationId(val);
                        if (val !== 'custom') {
                          setEditCustomDesignation('');
                        }
                      }}
                    >
                      <option value="">Select official designation...</option>
                      {activeDesignations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.department ? `(${d.department})` : ''}
                        </option>
                      ))}
                      <option value="custom">Other / Custom Title</option>
                    </select>

                    {editDesignationId === 'custom' && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter custom designation title..."
                        value={editCustomDesignation}
                        onChange={(e) => setEditCustomDesignation(e.target.value)}
                        style={{ marginTop: 6 }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
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
                  onClick={() => setEditingProfile(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designations Management Slide-Over Sidebar */}
      <DesignationsSidebar
        isOpen={isDesignationsSidebarOpen}
        onClose={() => setIsDesignationsSidebarOpen(false)}
        designations={designations}
        profiles={profiles}
        onRefresh={onRefresh}
      />
    </div>
  );
}
