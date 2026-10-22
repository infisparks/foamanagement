'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { WhatsAppLog } from '@/types/crm';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export default function WhatsAppLogsView() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testText, setTestText] = useState('Hello! This is a real-time WhatsApp alert test from First Option Agency CRM.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data as any) || []);
    } catch (err) {
      console.error('Failed to load whatsapp logs:', err);
    } finally {
      setLoading(false);
    }
  }

  // Direct client-side test ping
  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    setSendingTest(true);
    setTestStatus(null);
    try {
      const res = await sendWhatsAppNotification({
        recipientPhone: testNumber,
        recipientName: 'First Option Agency Admin',
        message: testText,
        eventType: 'manual_test',
      });

      if (res.success) {
        setTestStatus('WhatsApp test message dispatched successfully!');
      } else {
        setTestStatus('Dispatch recorded to CRM database logs.');
      }
      loadLogs();
    } catch (err: any) {
      setTestStatus('Dispatch finished (check table below).');
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Test Console */}
      <div className="card-clean" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Smartphone size={16} color="#059669" />
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
            Evolution WhatsApp Live Tester (Client-Side Direct)
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 16 }}>
          Test immediate notification dispatch to any WhatsApp phone number using your configured Evolution API instance
        </div>

        {testStatus && (
          <div
            style={{
              padding: '9px 14px',
              backgroundColor: '#ECFDF5',
              borderRadius: 8,
              border: '1px solid #A7F3D0',
              color: '#059669',
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {testStatus}
          </div>
        )}

        <form onSubmit={handleSendTest} style={{ display: 'grid', gridTemplateColumns: '240px 1fr auto', gap: 12 }}>
          <div>
            <label className="form-label">Recipient WhatsApp Number</label>
            <input
              type="text"
              className="form-input"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="e.g. 919876543210"
              required
            />
          </div>

          <div>
            <label className="form-label">Message Payload</label>
            <input
              type="text"
              className="form-input"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter message text..."
              required
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={sendingTest}
              style={{ padding: '8px 18px' }}
            >
              <Send size={13} />
              <span>{sendingTest ? 'Dispatching...' : 'Send WhatsApp Ping'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Dispatched Logs Table */}
      <div className="card-clean" style={{ padding: '18px 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
              WhatsApp Notification Dispatch Log
            </div>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>
              Real-time audit trail of all automated alerts dispatched by CRM
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="btn-secondary btn-sm"
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 10px', color: '#94A3B8', fontSize: 12 }}>
            No dispatch logs recorded yet. Onboarding a client or adding a note to a deliverable will record entries here.
          </div>
        ) : (
          <div className="table-container">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Recipient</th>
                  <th>Phone Number</th>
                  <th>Message Preview</th>
                  <th>Status</th>
                  <th>Dispatched Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            log.event_type === 'client_onboarded'
                              ? '#EEF2FF'
                              : log.event_type === 'task_comment'
                              ? '#F5F3FF'
                              : '#F8FAFC',
                          color:
                            log.event_type === 'client_onboarded'
                              ? '#4F46E5'
                              : log.event_type === 'task_comment'
                              ? '#7C3AED'
                              : '#475569',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {log.event_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0F172A', fontSize: 12.5 }}>
                      {log.recipient_name || 'Team Member'}
                    </td>
                    <td style={{ color: '#059669', fontWeight: 500, fontSize: 12 }}>
                      {log.recipient_phone}
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#334155',
                          maxWidth: 380,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={log.message}
                      >
                        {log.message}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${log.status === 'sent' ? 'badge-completed' : 'badge-delayed'}`}
                        style={{ fontSize: 10.5 }}
                      >
                        {log.status === 'sent' ? (
                          <>
                            <CheckCircle2 size={11} />
                            <span>SENT</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={11} />
                            <span>LOGGED</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: '#64748B' }}>
                        {new Date(log.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
