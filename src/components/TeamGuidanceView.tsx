'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  Eye, 
  Lock, 
  Globe, 
  Users, 
  Briefcase, 
  ArrowLeft, 
  Save, 
  Clock, 
  FileText, 
  Share2, 
  Copy, 
  Printer, 
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Sparkles,
  Layers,
  ChevronRight,
  Shield,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Profile, Designation, TeamGuidanceDoc } from '@/types/crm';
import { supabase } from '@/lib/supabase';
import RichDocumentEditor from './RichDocumentEditor';

interface TeamGuidanceViewProps {
  currentUser: Profile | null;
  profiles: Profile[];
  designations: Designation[];
}

const DEFAULT_CATEGORIES = [
  'All Categories',
  'Software & Engineering',
  'Research & Strategy',
  'Client Onboarding & Success',
  'Paid Media & Ads',
  'Creative & Design',
  'Agency Policies & SOPs',
];

export default function TeamGuidanceView({
  currentUser,
  profiles,
  designations,
}: TeamGuidanceViewProps) {
  const isAdmin = currentUser?.role === 'admin';

  // State
  const [docs, setDocs] = useState<TeamGuidanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [activeDoc, setActiveDoc] = useState<TeamGuidanceDoc | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable Document Fields
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Software & Engineering');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessDoc, setAccessDoc] = useState<TeamGuidanceDoc | null>(null);

  // New Doc Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Software & Engineering');
  const [newContent, setNewContent] = useState('');
  const [newAccessType, setNewAccessType] = useState<'all' | 'restricted'>('all');
  const [newAllowedUserIds, setNewAllowedUserIds] = useState<string[]>([]);
  const [newAllowedDesigIds, setNewAllowedDesigIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Access Modal Form
  const [targetAccessType, setTargetAccessType] = useState<'all' | 'restricted'>('all');
  const [targetAllowedUserIds, setTargetAllowedUserIds] = useState<string[]>([]);
  const [targetAllowedDesigIds, setTargetAllowedDesigIds] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

  // Notification Banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function showBanner(text: string, type: 'success' | 'error' = 'success') {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 3500);
  }

  // Fetch guidance docs from Supabase
  useEffect(() => {
    fetchDocs();
  }, []);

  // Non-admin protection: prevent print shortcut
  useEffect(() => {
    if (!isAdmin) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent Print shortcut Ctrl+P / Cmd+P
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          showBanner('Printing guidance documents is restricted to administrators.', 'error');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isAdmin]);

  async function fetchDocs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_guidance_docs')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (err: any) {
      console.error('Error fetching guidance docs:', err);
      showBanner(err.message || 'Failed to load guidance files.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filter docs based on permissions & search
  const visibleDocs = docs.filter((doc) => {
    // 1. Permission check
    if (!isAdmin && currentUser) {
      if (doc.access_type === 'restricted') {
        const hasDirectUserAccess = doc.allowed_user_ids?.includes(currentUser.id);
        const hasDesignationAccess = currentUser.designation_id && doc.allowed_designation_ids?.includes(currentUser.designation_id);
        if (!hasDirectUserAccess && !hasDesignationAccess) {
          return false;
        }
      }
    }

    // 2. Category filter
    if (selectedCategory !== 'All Categories' && doc.category !== selectedCategory) {
      return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchCategory = doc.category.toLowerCase().includes(q);
      const matchContent = doc.content.toLowerCase().includes(q);
      if (!matchTitle && !matchCategory && !matchContent) return false;
    }

    return true;
  });

  // Open Document Detail
  function handleOpenDoc(doc: TeamGuidanceDoc, editMode = false) {
    setActiveDoc(doc);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditContent(doc.content);
    // Non-admin members can ONLY view (editMode is forced false)
    setIsEditing(isAdmin ? editMode : false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Save changes to current document (Admin only)
  async function handleSaveActiveDoc() {
    if (!isAdmin) {
      showBanner('Only administrators can edit and save guidance documents.', 'error');
      return;
    }

    if (!activeDoc || !editTitle.trim()) {
      showBanner('Document title cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_guidance_docs')
        .update({
          title: editTitle.trim(),
          category: editCategory.trim(),
          content: editContent,
          updated_by: currentUser?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeDoc.id);

      if (error) throw error;

      // Update local state
      const updatedDoc: TeamGuidanceDoc = {
        ...activeDoc,
        title: editTitle.trim(),
        category: editCategory.trim(),
        content: editContent,
        updated_by: currentUser?.id || null,
        updated_at: new Date().toISOString(),
      };

      setActiveDoc(updatedDoc);
      setDocs(docs.map((d) => (d.id === activeDoc.id ? updatedDoc : d)));
      setIsEditing(false);
      showBanner('Document saved successfully!');
    } catch (err: any) {
      console.error('Error saving document:', err);
      showBanner(err.message || 'Failed to save document.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Create new document (Admin only)
  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setCreateError('Only administrators can create guidance documents.');
      return;
    }
    if (!newTitle.trim()) {
      setCreateError('Document title is required.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const { data, error } = await supabase
        .from('team_guidance_docs')
        .insert({
          title: newTitle.trim(),
          category: newCategory.trim() || 'General Guidance',
          content: newContent || '<p>Start typing document content here...</p>',
          access_type: newAccessType,
          allowed_user_ids: newAllowedUserIds,
          allowed_designation_ids: newAllowedDesigIds,
          created_by: currentUser?.id || null,
          updated_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setNewTitle('');
      setNewCategory('Software & Engineering');
      setNewContent('');
      setNewAccessType('all');
      setNewAllowedUserIds([]);
      setNewAllowedDesigIds([]);
      setIsCreateModalOpen(false);
      showBanner('New guidance file created!');
      await fetchDocs();
      if (data) {
        handleOpenDoc(data, false);
      }
    } catch (err: any) {
      console.error('Error creating document:', err);
      setCreateError(err.message || 'Failed to create document.');
    } finally {
      setCreating(false);
    }
  }

  // Open Access Control Modal
  function openAccessModal(doc: TeamGuidanceDoc) {
    setAccessDoc(doc);
    setTargetAccessType(doc.access_type);
    setTargetAllowedUserIds(doc.allowed_user_ids || []);
    setTargetAllowedDesigIds(doc.allowed_designation_ids || []);
    setIsAccessModalOpen(true);
  }

  // Save Access Permissions
  async function handleSaveAccess() {
    if (!accessDoc) return;
    setSavingAccess(true);
    try {
      const { error } = await supabase
        .from('team_guidance_docs')
        .update({
          access_type: targetAccessType,
          allowed_user_ids: targetAllowedUserIds,
          allowed_designation_ids: targetAllowedDesigIds,
          updated_by: currentUser?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accessDoc.id);

      if (error) throw error;

      const updated = {
        ...accessDoc,
        access_type: targetAccessType,
        allowed_user_ids: targetAllowedUserIds,
        allowed_designation_ids: targetAllowedDesigIds,
        updated_at: new Date().toISOString(),
      };

      setDocs(docs.map((d) => (d.id === accessDoc.id ? updated : d)));
      if (activeDoc?.id === accessDoc.id) {
        setActiveDoc(updated);
      }

      setIsAccessModalOpen(false);
      showBanner('File access permissions updated!');
    } catch (err: any) {
      console.error('Error updating access:', err);
      showBanner(err.message || 'Failed to update access permissions.', 'error');
    } finally {
      setSavingAccess(false);
    }
  }

  // Soft delete document (Admin only)
  async function handleDeleteDoc(doc: TeamGuidanceDoc) {
    if (!isAdmin) {
      showBanner('Only administrators can delete guidance documents.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${doc.title}"? This file will be archived.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_guidance_docs')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      if (error) throw error;

      setDocs(docs.filter((d) => d.id !== doc.id));
      if (activeDoc?.id === doc.id) {
        setActiveDoc(null);
      }
      showBanner(`"${doc.title}" deleted.`);
    } catch (err: any) {
      console.error('Error deleting doc:', err);
      showBanner(err.message || 'Failed to delete document.', 'error');
    }
  }

  // Resolve author name from profiles
  function getAuthorName(userId?: string | null) {
    if (!userId) return 'Agency Admin';
    const found = profiles.find((p) => p.id === userId);
    return found ? `${found.name} (${found.designation || found.role})` : 'Agency Admin';
  }

  // Format date helper
  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return iso;
    }
  }

  // Copy full document text
  function handleCopyContent() {
    if (!activeDoc) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = activeDoc.content;
    const text = tempDiv.innerText || tempDiv.textContent || '';
    navigator.clipboard.writeText(text);
    showBanner('Document text copied to clipboard!');
  }

  // Print Document (Admin only)
  function handlePrint() {
    if (!isAdmin) {
      showBanner('Printing guidance documents is restricted to administrators.', 'error');
      return;
    }
    window.print();
  }

  // ==========================================
  // VIEW: 1. FULL PAGE DOCUMENT READER / EDITOR
  // ==========================================
  if (activeDoc) {
    const updaterInfo = getAuthorName(activeDoc.updated_by);
    const creatorInfo = getAuthorName(activeDoc.created_by);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner */}
        {bannerMsg && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: bannerMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              borderRadius: 8,
              border: `1px solid ${bannerMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              color: bannerMsg.type === 'success' ? '#065F46' : '#DC2626',
              fontSize: 12.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {bannerMsg.type === 'success' ? <Check size={16} color="#059669" /> : <AlertCircle size={16} />}
            <span>{bannerMsg.text}</span>
          </div>
        )}

        {/* Top Professional Navigation Bar */}
        <div
          className="card-clean"
          style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Back Button & Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setActiveDoc(null)}
              className="btn-secondary btn-sm"
              style={{ gap: 6, padding: '6px 12px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Library</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
              <span>Team Guidance</span>
              <ChevronRight size={12} color="#94A3B8" />
              <span style={{ fontWeight: 600, color: '#4338CA' }}>{activeDoc.category}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Access Badge & Setting */}
            <button
              onClick={() => isAdmin && openAccessModal(activeDoc)}
              className="btn-secondary btn-sm"
              style={{
                gap: 6,
                borderColor: activeDoc.access_type === 'all' ? '#C7D2FE' : '#FDE68A',
                backgroundColor: activeDoc.access_type === 'all' ? '#FAFAFF' : '#FFFBEB',
                color: activeDoc.access_type === 'all' ? '#4338CA' : '#92400E',
                cursor: isAdmin ? 'pointer' : 'default',
              }}
              title={isAdmin ? 'Configure Team Access' : 'View Access Permissions'}
            >
              {activeDoc.access_type === 'all' ? <Globe size={13} color="#6366F1" /> : <Lock size={13} color="#D97706" />}
              <span>
                {activeDoc.access_type === 'all'
                  ? 'All Team Access'
                  : `Restricted (${(activeDoc.allowed_user_ids?.length || 0) + (activeDoc.allowed_designation_ids?.length || 0)} Groups)`}
              </span>
              {isAdmin && <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600 }}>[Manage]</span>}
            </button>

            {/* Read / Edit Mode Switcher */}
            {isAdmin && (
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: 2, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: !isEditing ? '#FFFFFF' : 'transparent',
                    color: !isEditing ? '#4338CA' : '#64748B',
                    boxShadow: !isEditing ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Eye size={13} />
                  <span>Reader View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: isEditing ? '#FFFFFF' : 'transparent',
                    color: isEditing ? '#4338CA' : '#64748B',
                    boxShadow: isEditing ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Edit3 size={13} />
                  <span>Word Editor</span>
                </button>
              </div>
            )}

            {/* Non-Admin: Read-Only Shield Badge */}
            {!isAdmin && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                <Shield size={13} color="#6366F1" />
                <span>Protected View (Read-Only)</span>
              </div>
            )}

            {/* Copy Button (All Users) */}
            <button
              onClick={handleCopyContent}
              className="btn-secondary btn-sm"
              style={{ padding: '6px 12px', gap: 5 }}
              title="Copy full document text"
            >
              <Copy size={13} color="#4338CA" />
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>Copy Document</span>
            </button>

            {/* Print - ADMIN ONLY */}
            {isAdmin && (
              <button
                onClick={handlePrint}
                className="btn-secondary btn-sm"
                style={{ padding: '6px 10px' }}
                title="Print document (Admin Only)"
              >
                <Printer size={13} />
              </button>
            )}

            {/* Save Button (when editing, admin only) */}
            {isAdmin && isEditing && (
              <button
                onClick={handleSaveActiveDoc}
                className="btn-primary btn-sm"
                disabled={saving}
                style={{ gap: 6 }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Document</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Word Document Canvas Container */}
        <div
          style={{
            maxWidth: 960,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Document Header Card */}
          <div
            className="card-clean"
            style={{
              padding: '24px 28px',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
            }}
          >
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Document Title / File Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ fontSize: 16, fontWeight: 700 }}
                    placeholder="e.g. How to Build Software & Release SOP"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Category / Domain</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      list="categories-list"
                    />
                    <datalist id="categories-list">
                      {DEFAULT_CATEGORIES.slice(1).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="form-label">ChatGPT Import Format</label>
                    <div style={{ fontSize: 12, color: '#059669', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={14} color="#059669" />
                      <span>Ready to paste tables, bold fonts, & lists directly</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      backgroundColor: '#EEF2FF',
                      color: '#4338CA',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {activeDoc.category}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>•</span>
                  <span style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    <span>Last updated: {formatDate(activeDoc.updated_at)}</span>
                  </span>
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {activeDoc.title}
                </h1>

                {/* Audit & Update History Bar */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: 12,
                    color: '#64748B',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit3 size={13} color="#6366F1" />
                    <span>
                      Edited by <strong style={{ color: '#1E293B' }}>{updaterInfo}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span>Created by: {creatorInfo}</span>
                    <span>Created: {formatDate(activeDoc.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Word-style Document Body */}
          <div
            style={{
              boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
              borderRadius: 12,
            }}
          >
            {isEditing ? (
              <RichDocumentEditor
                value={editContent}
                onChange={(html) => setEditContent(html)}
                minHeight={620}
              />
            ) : (
              <div
                className="card-clean"
                style={{
                  padding: '36px 48px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  minHeight: 580,
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: '#1E293B',
                  overflowX: 'hidden',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: activeDoc.content }}
                  className={isAdmin ? 'document-content-view' : 'document-content-view team-guidance-print-locked'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Access Control Modal */}
        {isAccessModalOpen && renderAccessModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW: 2. EXPLORER / DIRECTORY LIST VIEW
  // ==========================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner */}
      {bannerMsg && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: bannerMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderRadius: 8,
            border: `1px solid ${bannerMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: bannerMsg.type === 'success' ? '#065F46' : '#DC2626',
            fontSize: 12.5,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {bannerMsg.type === 'success' ? <Check size={16} color="#059669" /> : <AlertCircle size={16} />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        className="card-clean"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Agency Team Guidance & Knowledge Base</span>
            <span
              style={{
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {visibleDocs.length} Documents
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>
            Word-like SOPs, ChatGPT research imports, and team-specific access files
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            <Plus size={14} />
            <span>Create Guidance File</span>
          </button>
        )}
      </div>

      {/* Filters & Search Row */}
      <div
        className="card-clean"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  border: isSelected ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                  color: isSelected ? '#4338CA' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search
            size={14}
            color="#94A3B8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search documents, topics, or SOPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 12.5 }}
          />
        </div>
      </div>

      {/* Guidance Documents Grid */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 280,
            gap: 12,
            color: '#64748B',
          }}
        >
          <RefreshCw size={24} className="animate-spin" color="#6366F1" />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Loading guidance library...</div>
        </div>
      ) : visibleDocs.length === 0 ? (
        <div
          className="card-clean"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: 12,
            border: '1px dashed #CBD5E1',
            color: '#64748B',
          }}
        >
          <FolderOpen size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
            No guidance documents found
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, maxWidth: 420, margin: '4px auto 16px' }}>
            {searchQuery
              ? 'No documents matched your search term. Try adjusting your query or category filter.'
              : 'Create step-by-step SOPs, copy-paste ChatGPT prompts & tables, and assign access to specific teams.'}
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary btn-sm"
              style={{ margin: '0 auto', gap: 6 }}
            >
              <Plus size={14} />
              <span>Create First Guidance File</span>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {visibleDocs.map((doc) => {
            // Strip HTML for brief preview
            const plainSnippet = doc.content
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 140);

            const isRestricted = doc.access_type === 'restricted';
            const allowedUsersCount = doc.allowed_user_ids?.length || 0;
            const allowedDesigsCount = doc.allowed_designation_ids?.length || 0;

            return (
              <div
                key={doc.id}
                className="card-clean"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleOpenDoc(doc, false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#818CF8';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  {/* Top Badge Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <span
                      style={{
                        backgroundColor: '#EEF2FF',
                        color: '#4338CA',
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #E0E7FF',
                      }}
                    >
                      {doc.category}
                    </span>

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 500,
                        padding: '2px 7px',
                        borderRadius: 4,
                        backgroundColor: isRestricted ? '#FEF3C7' : '#F1F5F9',
                        color: isRestricted ? '#92400E' : '#475569',
                      }}
                    >
                      {isRestricted ? <Lock size={11} color="#D97706" /> : <Globe size={11} color="#64748B" />}
                      <span>
                        {isRestricted
                          ? `${allowedUsersCount + allowedDesigsCount} Assigned`
                          : 'All Team'}
                      </span>
                    </span>
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0F172A',
                      lineHeight: 1.35,
                      marginBottom: 8,
                    }}
                  >
                    {doc.title}
                  </div>

                  {/* Content Preview */}
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748B',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {plainSnippet}...
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div
                  style={{
                    paddingTop: 12,
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    <span>{formatDate(doc.updated_at)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenDoc(doc, false)}
                      className="btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}
                      title="Read Document"
                    >
                      <Eye size={12} color="#6366F1" />
                      <span>View</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(doc, true)}
                          className="btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}
                          title="Edit Document"
                        >
                          <Edit3 size={12} color="#4338CA" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAccessModal(doc)}
                          className="btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: 11 }}
                          title="Manage Access"
                        >
                          <ShieldCheck size={12} color="#D97706" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc)}
                          className="btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: 11, color: '#DC2626' }}
                          title="Delete Document"
                        >
                          <Trash2 size={12} color="#DC2626" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: CREATE GUIDANCE FILE               */}
      {/* ========================================== */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: 840, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} color="#4F46E5" />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Create Guidance Document
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateDoc} style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {createError && (
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
                  <span>{createError}</span>
                </div>
              )}

              {/* Title & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Document Title / Topic *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. How to Conduct Client Market Research"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    list="new-categories-list"
                  />
                  <datalist id="new-categories-list">
                    {DEFAULT_CATEGORIES.slice(1).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Access Permission Control */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color="#6366F1" />
                    <span>Who can access this guidance file?</span>
                  </div>

                  <div style={{ display: 'flex', backgroundColor: '#E2E8F0', padding: 2, borderRadius: 6 }}>
                    <button
                      type="button"
                      onClick={() => setNewAccessType('all')}
                      style={{
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: newAccessType === 'all' ? '#FFFFFF' : 'transparent',
                        color: newAccessType === 'all' ? '#4338CA' : '#64748B',
                      }}
                    >
                      All Agency Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAccessType('restricted')}
                      style={{
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: newAccessType === 'restricted' ? '#FFFFFF' : 'transparent',
                        color: newAccessType === 'restricted' ? '#4338CA' : '#64748B',
                      }}
                    >
                      Specific Teams & Members
                    </button>
                  </div>
                </div>

                {newAccessType === 'restricted' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                    {/* Select By Designation */}
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Grant Access by Designation:
                      </div>
                      <div
                        style={{
                          maxHeight: 120,
                          overflowY: 'auto',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          padding: 6,
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {designations.filter((d) => !d.is_deleted).map((d) => {
                          const checked = newAllowedDesigIds.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#1E293B',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 4,
                                backgroundColor: checked ? '#EEF2FF' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewAllowedDesigIds([...newAllowedDesigIds, d.id]);
                                  } else {
                                    setNewAllowedDesigIds(newAllowedDesigIds.filter((id) => id !== d.id));
                                  }
                                }}
                              />
                              <span>{d.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Select Specific Team Members */}
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Grant Access to Specific Members:
                      </div>
                      <div
                        style={{
                          maxHeight: 120,
                          overflowY: 'auto',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          padding: 6,
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {profiles.map((p) => {
                          const checked = newAllowedUserIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#1E293B',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 4,
                                backgroundColor: checked ? '#EEF2FF' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewAllowedUserIds([...newAllowedUserIds, p.id]);
                                  } else {
                                    setNewAllowedUserIds(newAllowedUserIds.filter((id) => id !== p.id));
                                  }
                                }}
                              />
                              <span>{p.name} ({p.designation || p.role})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rich Document Editor */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Document Content (Word-like Canvas)</span>
                  <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 500 }}>
                    Directly copy ChatGPT content and paste here
                  </span>
                </label>
                <RichDocumentEditor
                  value={newContent}
                  onChange={(html) => setNewContent(html)}
                  minHeight={260}
                  placeholder="Paste ChatGPT tables, bold headings, lists, or start typing SOP..."
                />
              </div>

              {/* Submit Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  paddingTop: 12,
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                  style={{ gap: 6 }}
                >
                  {creating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Create File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: ACCESS PERMISSIONS MANAGER         */}
      {/* ========================================== */}
      {isAccessModalOpen && renderAccessModal()}
    </div>
  );

  // Render Access Modal
  function renderAccessModal() {
    if (!accessDoc) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: 560 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="#D97706" />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                  Manage File Access Permissions
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>
                  {accessDoc.title}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAccessModalOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mode selection */}
            <div>
              <label className="form-label">Access Mode</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 8,
                    border: targetAccessType === 'all' ? '2px solid #6366F1' : '1px solid #E2E8F0',
                    backgroundColor: targetAccessType === 'all' ? '#EEF2FF' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                    <input
                      type="radio"
                      name="accessMode"
                      checked={targetAccessType === 'all'}
                      onChange={() => setTargetAccessType('all')}
                    />
                    <span>All Agency Team</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', paddingLeft: 20 }}>
                    Every registered staff member can read this guidance.
                  </div>
                </label>

                <label
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 8,
                    border: targetAccessType === 'restricted' ? '2px solid #6366F1' : '1px solid #E2E8F0',
                    backgroundColor: targetAccessType === 'restricted' ? '#EEF2FF' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                    <input
                      type="radio"
                      name="accessMode"
                      checked={targetAccessType === 'restricted'}
                      onChange={() => setTargetAccessType('restricted')}
                    />
                    <span>Restricted Access</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', paddingLeft: 20 }}>
                    Only chosen designations or individual staff members.
                  </div>
                </label>
              </div>
            </div>

            {targetAccessType === 'restricted' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Designation Access */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Briefcase size={13} color="#4F46E5" />
                    <span>Grant Access by Designation / Role:</span>
                  </div>
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: 'auto',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {designations.filter((d) => !d.is_deleted).map((d) => {
                      const checked = targetAllowedDesigIds.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: 6,
                            backgroundColor: checked ? '#EEF2FF' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetAllowedDesigIds([...targetAllowedDesigIds, d.id]);
                                } else {
                                  setTargetAllowedDesigIds(targetAllowedDesigIds.filter((id) => id !== d.id));
                                }
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.title}</span>
                          </div>
                          {d.department && (
                            <span style={{ fontSize: 10, color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>
                              {d.department}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Staff Access */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} color="#059669" />
                    <span>Grant Access to Specific Team Members:</span>
                  </div>
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: 'auto',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {profiles.map((p) => {
                      const checked = targetAllowedUserIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: 6,
                            backgroundColor: checked ? '#ECFDF5' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetAllowedUserIds([...targetAllowedUserIds, p.id]);
                                } else {
                                  setTargetAllowedUserIds(targetAllowedUserIds.filter((id) => id !== p.id));
                                }
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#64748B' }}>
                            {p.designation || p.role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 6,
                paddingTop: 14,
                borderTop: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAccessModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAccess}
                disabled={savingAccess}
                style={{ gap: 6 }}
              >
                {savingAccess ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
