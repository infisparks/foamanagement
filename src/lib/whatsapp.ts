import { supabase } from './supabase';

interface SendWhatsAppParams {
  recipientPhone: string;
  recipientName?: string;
  message: string;
  eventType: 'client_onboarded' | 'task_comment' | 'task_assigned' | 'task_delayed' | 'manual_test';
}

export async function sendWhatsAppNotification({
  recipientPhone,
  recipientName,
  message,
  eventType,
}: SendWhatsAppParams) {
  // Format phone number to numbers only
  let cleanNumber = (recipientPhone || '').replace(/\D/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  }

  if (!cleanNumber) {
    return { success: false, reason: 'Invalid phone number' };
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_API_URL ||
    'https://evo.infispark.in/message/sendText/medzeal';
  const apiKey =
    process.env.NEXT_PUBLIC_WHATSAPP_API_KEY ||
    'vR39h6avY69g7kAU3YQbS6V6XEvudson';

  let status: 'sent' | 'failed' = 'sent';
  let responseData: any = null;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    responseData = await res.json().catch(() => null);

    if (!res.ok || (responseData && responseData.error)) {
      status = 'failed';
      console.warn('[WhatsApp API Notice]:', responseData);
    }
  } catch (error: any) {
    status = 'failed';
    responseData = { error: error?.message || 'Network fetch failed' };
    console.error('[WhatsApp Network Exception]:', error);
  }

  // Record log directly into Supabase whatsapp_logs table from client
  try {
    await supabase.from('whatsapp_logs').insert({
      recipient_phone: cleanNumber,
      recipient_name: recipientName || 'Team Member',
      event_type: eventType,
      message,
      status,
      response_data: responseData,
    });
  } catch (dbErr) {
    console.error('[Failed to log whatsapp in Supabase]:', dbErr);
  }

  return { success: status === 'sent', status, responseData };
}

// Client-side helper: notify all team members when a client is onboarded
export async function notifyTeamNewClientOnboarded({
  clientName,
  clientPhone,
  clientIndustry,
  onboardedByName,
}: {
  clientName: string;
  clientPhone?: string;
  clientIndustry?: string;
  onboardedByName?: string;
}) {
  try {
    const { data: teamMembers, error } = await supabase
      .from('profiles')
      .select('name, phone, role')
      .not('phone', 'is', null);

    if (error || !teamMembers) return { success: false };

    const appUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const member of teamMembers) {
      if (!member.phone) continue;
      const message = `🚀 *New Client Onboarded!*
Hello ${member.name},

*${clientName}* (${clientIndustry || 'General'}) has just been onboarded by *${onboardedByName || 'Admin'}*.

📋 *Phone:* ${clientPhone || 'N/A'}
🔗 *Client Portal:* ${appUrl}

Please check the portal to begin adding your required deliverables.
— *First Option Agency*`;

      await sendWhatsAppNotification({
        recipientPhone: member.phone,
        recipientName: member.name,
        message,
        eventType: 'client_onboarded',
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to notify team of new client:', err);
    return { success: false };
  }
}

// Client-side helper: notify assignee when someone comments on their task
export async function notifyTaskAssigneeNewComment({
  taskTitle,
  clientName,
  commenterName,
  commenterDesignation,
  commentText,
  assigneePhone,
  assigneeName,
}: {
  taskTitle: string;
  clientName?: string;
  commenterName: string;
  commenterDesignation?: string;
  commentText: string;
  assigneePhone: string;
  assigneeName: string;
}) {
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const message = `💬 *New Comment on Your Task*
Hello ${assigneeName || 'Team Member'},

*${commenterName}* (${commenterDesignation || 'Team'}) commented on your task:
📌 *Task:* ${taskTitle} (Client: ${clientName || 'General'})

💬 *" ${commentText} "*

🔗 *Open Task Portal:* ${appUrl}
— *First Option Agency*`;

  return await sendWhatsAppNotification({
    recipientPhone: assigneePhone,
    recipientName: assigneeName,
    message,
    eventType: 'task_comment',
  });
}
