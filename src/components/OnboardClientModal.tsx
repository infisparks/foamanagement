'use client';

import React, { useState } from 'react';
import { X, Building2, Phone, Mail, FileText, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/crm';
import { notifyTeamNewClientOnboarded } from '@/lib/whatsapp';

interface OnboardClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  onClientCreated: () => void;
}

export default function OnboardClientModal({
  isOpen,
  onClose,
  currentUser,
  onClientCreated,
}: OnboardClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('Clothing Brand');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || currentUser?.role !== 'admin') return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (currentUser?.role !== 'admin') {
      setErrorMsg('Unauthorized: Only administrators can onboard new clients.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Client name is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Insert Client directly into Supabase (Client-Side)
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          industry: industry.trim() || 'General',
          notes: notes.trim() || null,
          status: 'active',
          onboarded_by: currentUser?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Direct client-side WhatsApp broadcast to all team members
      notifyTeamNewClientOnboarded({
        clientName: name.trim(),
        clientPhone: phone.trim(),
        clientIndustry: industry.trim(),
        onboardedByName: currentUser?.name || 'Admin',
      }).catch((waErr) => {
        console.warn('Background WhatsApp broadcast warning:', waErr);
      });

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      onClientCreated();
      onClose();
    } catch (err: any) {
      console.error('Error onboarding client:', err);
      setErrorMsg(err.message || 'Failed to onboard client');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal Header */}
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
              <Building2 size={17} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                Onboard New Client
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Admin Onboarding • Auto WhatsApp alert broadcast to all team members
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', overflowY: 'auto' }}>
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
                marginBottom: 14,
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div>
              <label className="form-label">
                Client / Brand Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Aura Clothing Brand"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Phone / WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 919958399157"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Industry / Category</label>
                <select
                  className="form-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="Clothing Brand">Clothing / Fashion</option>
                  <option value="E-commerce">E-commerce / D2C</option>
                  <option value="Fintech">Fintech / B2B</option>
                  <option value="Healthcare">Healthcare & Wellness</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other Agency Client</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Client Email (Optional)</label>
              <input
                type="email"
                className="form-input"
                placeholder="client@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Onboarding Notes & Deliverables Scope</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Scaling Meta Ads ROAS to 4x. Monthly budget 2.5L. Team to sync Pixel and produce UGC creatives..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={14} color="#059669" />
            <span style={{ fontSize: 11.5, color: '#475569' }}>
              Submitting triggers direct client-side WhatsApp alert to all team members with portal link.
            </span>
          </div>

          {/* Modal Footer */}
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
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Onboarding...' : 'Onboard & Notify Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
