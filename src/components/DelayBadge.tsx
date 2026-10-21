'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Hourglass } from 'lucide-react';

interface DelayBadgeProps {
  deadline: string;
  completedAt?: string | null;
  status: 'pending' | 'completed';
}

export function calculateDelayInfo(
  deadline: string,
  completedAt?: string | null,
  status?: 'pending' | 'completed',
  currentTime?: number
) {
  const deadlineDate = new Date(deadline).getTime();
  const now = currentTime || Date.now();

  if (status === 'completed' && completedAt) {
    const compDate = new Date(completedAt).getTime();
    if (compDate > deadlineDate) {
      const diffMs = compDate - deadlineDate;
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        isDelayed: true,
        days,
        label: `${days}d late delay`,
        type: 'completed_delayed' as const,
      };
    }
    return {
      isDelayed: false,
      days: 0,
      label: 'Completed on time',
      type: 'completed_on_time' as const,
    };
  }

  // Pending task countdown logic
  if (now > deadlineDate) {
    const diffMs = now - deadlineDate;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const label = days > 0 ? `Overdue by ${days}d ${hours}h` : `Overdue by ${Math.max(1, hours)}h`;
    return {
      isDelayed: true,
      days: Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))),
      label,
      type: 'overdue' as const,
    };
  }

  // Active countdown until deadline
  const remainingMs = deadlineDate - now;
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  let countdownText = '';
  if (days > 0) {
    countdownText = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    countdownText = `${hours}h ${minutes}m left`;
  } else if (minutes > 0) {
    countdownText = `${minutes}m left`;
  } else {
    countdownText = '< 1m left';
  }

  return {
    isDelayed: false,
    days: 0,
    label: countdownText,
    type: days === 0 && hours < 6 ? ('urgent' as const) : ('on_track' as const),
  };
}

export default function DelayBadge({ deadline, completedAt, status }: DelayBadgeProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    // Live countdown update every 30 seconds
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const info = calculateDelayInfo(deadline, completedAt, status, now);

  if (info.isDelayed) {
    return (
      <span
        className="badge badge-delayed"
        title={`Target Deadline: ${new Date(deadline).toLocaleString()}`}
      >
        <AlertCircle size={11} />
        <span>{info.label}</span>
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span className="badge badge-completed">
        <CheckCircle2 size={11} />
        <span>Completed on time</span>
      </span>
    );
  }

  if (info.type === 'urgent') {
    return (
      <span
        className="badge"
        style={{
          backgroundColor: '#FFFBEB',
          color: '#B45309',
          border: '1px solid #FDE68A',
          fontWeight: 600,
        }}
        title={`Target Deadline: ${new Date(deadline).toLocaleString()}`}
      >
        <Hourglass size={11} color="#D97706" />
        <span>⏳ {info.label}</span>
      </span>
    );
  }

  return (
    <span
      className="badge"
      style={{
        backgroundColor: '#EFF6FF',
        color: '#1D4ED8',
        border: '1px solid #BFDBFE',
        fontWeight: 500,
      }}
      title={`Target Deadline: ${new Date(deadline).toLocaleString()}`}
    >
      <Clock size={11} color="#3B82F6" />
      <span>⏳ {info.label}</span>
    </span>
  );
}
