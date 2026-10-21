import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Task, Profile, Client } from '@/types/crm';

export interface TaskCommentWithUser {
  id: string;
  task_id: string;
  comment: string;
  created_at: string;
  user?: {
    name: string;
    designation?: string;
    role: string;
  };
}

export interface ExportReportOptions {
  filteredTasks: Task[];
  clients: Client[];
  profiles: Profile[];
  selectedProfile?: Profile;
  startDate?: string;
  endDate?: string;
  totalTasks: number;
  completedTasksCount: number;
  completionRate: number;
  pendingTasksCount: number;
  delayedTasksCount: number;
  totalDelayedDays: number;
  commentsByTaskId: Record<string, TaskCommentWithUser[]>;
}

// Convert array buffer to base64 safely in chunks to support Poppins TTF fonts
async function loadFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunk = 0x8000;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return window.btoa(binary);
}

export async function generateTeamReportPDF(options: ExportReportOptions) {
  const {
    filteredTasks,
    clients,
    profiles,
    selectedProfile,
    startDate,
    endDate,
    totalTasks,
    completedTasksCount,
    completionRate,
    pendingTasksCount,
    delayedTasksCount,
    totalDelayedDays,
    commentsByTaskId,
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load and register Poppins Fonts
  let fontName = 'helvetica';
  try {
    const [regBase64, boldBase64] = await Promise.all([
      loadFontAsBase64('/fonts/Poppins-Regular.ttf'),
      loadFontAsBase64('/fonts/Poppins-Bold.ttf'),
    ]);

    doc.addFileToVFS('Poppins-Regular.ttf', regBase64);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');

    doc.addFileToVFS('Poppins-Bold.ttf', boldBase64);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');

    doc.setFont('Poppins', 'normal');
    fontName = 'Poppins';
  } catch (err) {
    console.warn('Poppins font could not be loaded into jsPDF, falling back to standard font:', err);
    doc.setFont('helvetica', 'normal');
  }

  // 1. Executive Top Banner
  doc.setFillColor(49, 46, 129); // #312E81 Deep Indigo
  doc.rect(0, 0, pageWidth, 52, 'F');

  // Brand Sub-heading
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(199, 210, 254); // #C7D2FE
  doc.text('AGENCY AUDIT & DELIVERABLE PERFORMANCE REPORT', 24, 20);

  // Main Title
  doc.setFont(fontName, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('FIRST OPTION MANAGEMENT', 24, 38);

  // Date Meta (Right)
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255);
  const nowStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${nowStr}`, pageWidth - 24, 26, { align: 'right' });
  doc.text('Status: Official Audit Record', pageWidth - 24, 38, { align: 'right' });

  // 2. Filter & Scope Header Card
  const boxY = 62;
  const boxHeight = 56;
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.roundedRect(24, boxY, pageWidth - 48, boxHeight, 5, 5, 'FD');

  // Left: Audit Scope Info
  doc.setFont(fontName, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // #0F172A
  const auditTarget = selectedProfile
    ? `${selectedProfile.name} • ${selectedProfile.designation || selectedProfile.role.toUpperCase()}`
    : 'All Agency Members (Entire Agency Overview)';
  doc.text(`Audit Scope: ${auditTarget}`, 36, boxY + 22);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // #64748B
  const periodText = `Date Filter Range: ${
    startDate
      ? new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'All Time'
  }  to  ${
    endDate
      ? new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Current'
  }`;
  doc.text(periodText, 36, boxY + 40);

  // Right: 4 Styled KPI Summary Cards
  const kpiStartX = pageWidth - 420;
  const kpiY = boxY + 8;
  const kpiHeight = 40;
  const kpiWidth = 92;

  // Total
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(kpiStartX, kpiY, kpiWidth, kpiHeight, 4, 4, 'FD');
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TASKS', kpiStartX + 8, kpiY + 14);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(String(totalTasks), kpiStartX + 8, kpiY + 30);

  // Completed
  const kpi2X = kpiStartX + kpiWidth + 6;
  doc.setFillColor(236, 253, 245); // #ECFDF5
  doc.setDrawColor(167, 243, 208); // #A7F3D0
  doc.roundedRect(kpi2X, kpiY, kpiWidth, kpiHeight, 4, 4, 'FD');
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('COMPLETED', kpi2X + 8, kpiY + 14);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text(`${completedTasksCount} (${completionRate}%)`, kpi2X + 8, kpiY + 30);

  // Pending
  const kpi3X = kpi2X + kpiWidth + 6;
  doc.setFillColor(255, 251, 235); // #FFFBEB
  doc.setDrawColor(253, 230, 138); // #FDE68A
  doc.roundedRect(kpi3X, kpiY, kpiWidth, kpiHeight, 4, 4, 'FD');
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(217, 119, 6);
  doc.text('PENDING', kpi3X + 8, kpiY + 14);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(217, 119, 6);
  doc.text(String(pendingTasksCount), kpi3X + 8, kpiY + 30);

  // Delayed
  const kpi4X = kpi3X + kpiWidth + 6;
  doc.setFillColor(254, 242, 242); // #FEF2F2
  doc.setDrawColor(254, 202, 202); // #FECACA
  doc.roundedRect(kpi4X, kpiY, kpiWidth, kpiHeight, 4, 4, 'FD');
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 38, 38);
  doc.text('DELAY PENALTY', kpi4X + 8, kpiY + 14);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38);
  doc.text(`${delayedTasksCount} (${totalDelayedDays}d)`, kpi4X + 8, kpiY + 30);

  // 3. Build Table Rows with Comments
  const tableRows: any[] = [];

  filteredTasks.forEach((task) => {
    if (task.is_deleted) return;
    const client = clients.find((c) => c.id === task.client_id);
    const assignee = profiles.find((p) => p.id === task.assigned_to);

    const clientName = client?.name || 'Client';
    const taskTitle = task.title;
    const assigneeName = assignee ? `${assignee.name}\n${assignee.designation || assignee.role}` : 'Unassigned';
    const createdDate = task.created_at
      ? new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '-';
    const deadlineDate = task.deadline
      ? new Date(task.deadline).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';
    const completedDate = task.completed_at
      ? new Date(task.completed_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : task.status === 'completed'
      ? 'Completed'
      : 'In Progress';

    let statusText = task.status === 'completed' ? 'Completed (On Time)' : 'In Progress';
    if (task.is_delayed) {
      statusText = `Delayed (${task.delay_days || 1} day penalty)`;
    } else if (task.status === 'pending') {
      const isPast = new Date().getTime() > new Date(task.deadline).getTime();
      if (isPast) statusText = 'Overdue (Pending)';
    }

    // Main Task Row
    tableRows.push([
      clientName,
      taskTitle,
      assigneeName,
      createdDate,
      deadlineDate,
      completedDate,
      statusText,
    ]);

    // Attached Notes Row (in PDF below the task, latest notes on top)
    const rawComments = commentsByTaskId[task.id] || [];
    const taskComments = [...rawComments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (taskComments.length > 0) {
      const commentHeader = `📝 Collaboration & Audit Notes (${taskComments.length}):`;
      const commentLines = taskComments.map((c, i) => {
        const time = new Date(c.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        const author = c.user?.name || 'Team Member';
        const role = c.user?.designation || c.user?.role || 'Staff';
        return `  ${i + 1}. [${author} • ${role}] (${time}): "${c.comment}"`;
      });

      tableRows.push([
        {
          content: `${commentHeader}\n${commentLines.join('\n')}`,
          colSpan: 7,
          styles: {
            fillColor: [245, 243, 255], // Soft purple #F5F3FF
            textColor: [67, 56, 202],   // Deep Indigo #4338CA
            font: fontName,
            fontStyle: 'normal',
            fontSize: 8.5,
            cellPadding: { top: 7, bottom: 7, left: 14, right: 14 },
            lineColor: [221, 214, 254], // #DDD6FE
            lineWidth: 0.5,
          },
        },
      ]);
    }
  });

  // 4. Render Table via autoTable with Poppins styling
  autoTable(doc, {
    startY: 128,
    head: [[
      'Client Brand',
      'Deliverable Task Title',
      'Assigned Member',
      'Created',
      'Target Deadline',
      'Completed Date',
      'Delay & Audit Status',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 8.5,
      cellPadding: 7,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: 'middle',
    },
    headStyles: {
      font: fontName,
      fontStyle: 'bold',
      fillColor: [67, 56, 202], // #4338CA Indigo
      textColor: [255, 255, 255],
      fontSize: 9,
      cellPadding: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 105, fontStyle: 'bold' },
      1: { cellWidth: 185, fontStyle: 'bold' },
      2: { cellWidth: 115 },
      3: { cellWidth: 65, halign: 'center' },
      4: { cellWidth: 95, halign: 'center' },
      5: { cellWidth: 95, halign: 'center' },
      6: { cellWidth: 134 },
    },
    margin: { left: 24, right: 24, bottom: 32 },
    didDrawPage: (data) => {
      // Professional Footer
      const totalPages = doc.getNumberOfPages();
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      doc.setDrawColor(226, 232, 240);
      doc.line(24, pageHeight - 24, pageWidth - 24, pageHeight - 24);

      doc.text('First Option Management CRM • Confidential Internal Audit', 24, pageHeight - 12);
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - 24, pageHeight - 12, { align: 'right' });
    },
  });

  // Open in a new browser tab via blob URL (do not force download)
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const win = window.open(blobUrl, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
