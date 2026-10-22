'use client';

import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  Check, 
  Search, 
  Users, 
  Building2, 
  AlertCircle,
  Save,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Designation, Profile } from '@/types/crm';
import { supabase } from '@/lib/supabase';

interface DesignationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  designations: Designation[];
  profiles: Profile[];
  onRefresh: () => void;
}

const COMMON_DEPARTMENTS = [
  'Paid Media',
  'Leadership',
  'Creative & Content',
  'Engineering',
  'Growth & SEO',
  'Client Success',
  'Operations',
];

export default function DesignationsSidebar({
  isOpen,
  onClose,
  designations,
  profiles,
  onRefresh,
}: DesignationsSidebarProps) {
  // Tab filter: Active vs Archived (soft deleted)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Designation Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Designation Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Feedback Notification Banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  function showBanner(text: string, type: 'success' | 'error' = 'success') {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 3500);
  }

  // Handle Add Designation
  async function handleCreateDesignation(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Designation title is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const cleanTitle = title.trim();
      const cleanDept = department.trim() || null;
      const cleanDesc = description.trim() || null;

      // Check if duplicate active title exists
      const existing = designations.find(
        (d) => !d.is_deleted && d.title.toLowerCase() === cleanTitle.toLowerCase()
      );
      if (existing) {
        setFormError('An active designation with this title already exists.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('designations').insert({
        title: cleanTitle,
        department: cleanDept,
        description: cleanDesc,
        is_deleted: false,
      });

      if (error) throw error;

      setTitle('');
      setDepartment('');
      setDescription('');
      setShowAddForm(false);
      showBanner(`Designation "${cleanTitle}" created successfully!`);
      onRefresh();
    } catch (err: any) {
      console.error('Error creating designation:', err);
      setFormError(err.message || 'Failed to create designation.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Start Edit Mode
  function startEdit(d: Designation) {
    setEditingId(d.id);
    setEditTitle(d.title);
    setEditDepartment(d.department || '');
    setEditDescription(d.description || '');
    setEditError('');
  }

  // Cancel Edit
  function cancelEdit() {
    setEditingId(null);
    setEditError('');
  }

  // Handle Save Edit
  async function handleUpdateDesignation(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) {
      setEditError('Designation title is required.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      const cleanTitle = editTitle.trim();
      const cleanDept = editDepartment.trim() || null;
      const cleanDesc = editDescription.trim() || null;

      const { error } = await supabase
        .from('designations')
        .update({
          title: cleanTitle,
          department: cleanDept,
          description: cleanDesc,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      // Also update text fallback in profiles linked to this designation
      await supabase
        .from('profiles')
        .update({
          designation: cleanTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('designation_id', editingId);

      setEditingId(null);
      showBanner(`Designation "${cleanTitle}" updated successfully!`);
      onRefresh();
    } catch (err: any) {
      console.error('Error updating designation:', err);
      setEditError(err.message || 'Failed to update designation.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Soft Delete Designation ("not permanent delete add is delete")
  async function handleSoftDelete(d: Designation) {
    const assignedCount = profiles.filter(
      (p) => p.designation_id === d.id || p.designation === d.title
    ).length;

    const confirmMsg = assignedCount > 0
      ? `"${d.title}" is currently assigned to ${assignedCount} team member(s). Are you sure you want to archive it? It will not be permanently deleted and can be restored.`
      : `Archive "${d.title}"? It will not be permanently deleted and can be restored at any time.`;

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('designations')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', d.id);

      if (error) throw error;

      showBanner(`"${d.title}" archived (soft deleted).`);
      onRefresh();
    } catch (err: any) {
      console.error('Error archiving designation:', err);
      showBanner(err.message || 'Failed to archive designation.', 'error');
    }
  }

  // Restore Soft Deleted Designation
  async function handleRestore(d: Designation) {
    try {
      const { error } = await supabase
        .from('designations')
        .update({
          is_deleted: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', d.id);

      if (error) throw error;

      showBanner(`"${d.title}" restored successfully!`);
      onRefresh();
    } catch (err: any) {
      console.error('Error restoring designation:', err);
      showBanner(err.message || 'Failed to restore designation.', 'error');
    }
  }

  // Filtered lists
  const activeList = designations.filter((d) => !d.is_deleted);
  const archivedList = designations.filter((d) => d.is_deleted);

  const displayedList = (activeTab === 'active' ? activeList : archivedList).filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.department && d.department.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 60,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Slide-over Drawer */}
      <div
        className="drawer-content"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          zIndex: 65,
          boxShadow: '-4px 0 24px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Agency Designations</span>
                <span
                  style={{
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {activeList.length} Active
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                Add, edit, or archive team roles & departments
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close Designations Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Alert */}
        {bannerMsg && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: bannerMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              borderBottom: `1px solid ${bannerMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              color: bannerMsg.type === 'success' ? '#065F46' : '#DC2626',
              fontSize: 12.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {bannerMsg.type === 'success' ? <Check size={15} color="#059669" /> : <AlertCircle size={15} />}
            <span>{bannerMsg.text}</span>
          </div>
        )}

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action Row: Create Designation Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'active' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'active' ? '#4338CA' : '#64748B',
                  boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Active ({activeList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'archived' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'archived' ? '#4338CA' : '#64748B',
                  boxShadow: activeTab === 'archived' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Archived ({archivedList.length})
              </button>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary btn-sm"
              style={{ gap: 6 }}
            >
              <Plus size={14} />
              <span>{showAddForm ? 'Cancel Form' : 'New Designation'}</span>
            </button>
          </div>

          {/* Add Designation Form Collapsible */}
          {showAddForm && (
            <div
              className="card-clean"
              style={{
                padding: '16px',
                border: '1.5px solid #C7D2FE',
                backgroundColor: '#FAFAFF',
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#312E81', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={15} color="#4F46E5" />
                <span>Create Designation</span>
              </div>

              {formError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateDesignation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">
                    Designation Title <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Senior Meta Ads Specialist"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label">Department / Domain</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Paid Media, Creative, Tech..."
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    list="departments-list"
                  />
                  <datalist id="departments-list">
                    {COMMON_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {COMMON_DEPARTMENTS.slice(0, 4).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepartment(d)}
                        style={{
                          background: '#EEF2FF',
                          border: '1px solid #E0E7FF',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: 10.5,
                          color: '#4338CA',
                          cursor: 'pointer',
                        }}
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Description / Responsibilities (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Briefly describe key role responsibilities..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary btn-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Designation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              color="#94A3B8"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder={`Search ${activeTab === 'active' ? 'active' : 'archived'} designations...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12.5 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* List of Designations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayedList.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                }}
              >
                <FolderOpen size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                  No {activeTab} designations found
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                  {searchTerm
                    ? 'Try adjusting your search criteria'
                    : activeTab === 'active'
                    ? 'Click "New Designation" above to add your first role'
                    : 'No designations have been archived'}
                </div>
              </div>
            ) : (
              displayedList.map((d) => {
                const isEditing = editingId === d.id;
                const assignedMembers = profiles.filter(
                  (p) => p.designation_id === d.id || (!p.designation_id && p.designation === d.title)
                );

                if (isEditing) {
                  return (
                    <div
                      key={d.id}
                      className="card-clean"
                      style={{
                        padding: '14px',
                        border: '1.5px solid #818CF8',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#312E81', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Edit2 size={13} color="#4F46E5" />
                        <span>Edit Designation</span>
                      </div>

                      {editError && (
                        <div
                          style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            marginBottom: 8,
                          }}
                        >
                          {editError}
                        </div>
                      )}

                      <form onSubmit={handleUpdateDesignation} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: 11.5 }}>
                            Title <span style={{ color: '#EF4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: 11.5 }}>Department</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            list="departments-list"
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: 11.5 }}>Description</label>
                          <textarea
                            className="form-textarea"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-primary btn-sm"
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save size={13} />
                                <span>Update</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div
                    key={d.id}
                    className="card-clean"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      border: '1px solid #E2E8F0',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C7D2FE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A' }}>
                            {d.title}
                          </span>
                          {d.department && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                fontSize: 11,
                                fontWeight: 500,
                                padding: '1px 7px',
                                borderRadius: 4,
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              <Building2 size={10} color="#64748B" />
                              <span>{d.department}</span>
                            </span>
                          )}
                          {d.is_deleted && (
                            <span
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              Archived
                            </span>
                          )}
                        </div>

                        {d.description && (
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                            {d.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#94A3B8' }}>
                          <Users size={12} color="#6366F1" />
                          <span style={{ color: assignedMembers.length > 0 ? '#4338CA' : '#94A3B8', fontWeight: assignedMembers.length > 0 ? 600 : 400 }}>
                            {assignedMembers.length} {assignedMembers.length === 1 ? 'member' : 'members'} assigned
                          </span>
                          {assignedMembers.length > 0 && (
                            <span style={{ color: '#64748B' }}>
                              ({assignedMembers.map((m) => m.name).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {!d.is_deleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="btn-secondary btn-sm"
                              style={{ padding: '5px 7px', fontSize: 11 }}
                              title="Edit designation title, department & details"
                            >
                              <Edit2 size={12} color="#6366F1" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(d)}
                              className="btn-secondary btn-sm"
                              style={{ padding: '5px 7px', fontSize: 11, color: '#DC2626' }}
                              title="Archive designation (soft delete - not permanent)"
                            >
                              <Trash2 size={12} color="#DC2626" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(d)}
                            className="btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11, color: '#059669', gap: 4 }}
                            title="Restore archived designation"
                          >
                            <RotateCcw size={12} color="#059669" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: '#64748B',
          }}
        >
          <span>Linked foreign key to Team Profiles</span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
