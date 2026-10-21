import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export interface PlatformConfig {
  id: string;
  name: string;
  match: (url: string) => boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
  icon: (size?: number) => React.ReactNode;
}

export const POPULAR_PLATFORMS: PlatformConfig[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    match: (url) => /docs\.google\.com\/spreadsheets|sheets\.google\.com/i.test(url),
    color: '#0F9D58',
    bgColor: '#E6F4EA',
    borderColor: '#A8DAB5',
    hoverBg: '#CEEAD6',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H5v-2h4v2zm0-4H5v-2h4v2zm0-4H5V7h4v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2zm4 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" />
      </svg>
    ),
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    match: (url) => /docs\.google\.com\/document/i.test(url),
    color: '#1A73E8',
    bgColor: '#E8F0FE',
    borderColor: '#AECBFA',
    hoverBg: '#D2E3FC',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
  },
  {
    id: 'google-slides',
    name: 'Google Slides',
    match: (url) => /docs\.google\.com\/presentation/i.test(url),
    color: '#E37400',
    bgColor: '#FEF7E0',
    borderColor: '#FDD663',
    hoverBg: '#FEEFC3',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM8 7h8v2H8zm0 4h8v2H8zm0 4h5v2H8z" />
      </svg>
    ),
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    match: (url) => /drive\.google\.com/i.test(url),
    color: '#0F9D58',
    bgColor: '#E6F4EA',
    borderColor: '#A8DAB5',
    hoverBg: '#CEEAD6',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm8.58 0H9.42l6.56 11.5h6.87L16.29 3.5zm-5.14 12L7.72 21h13.71l3.43-5.5H11.15z" />
      </svg>
    ),
  },
  {
    id: 'figma',
    name: 'Figma',
    match: (url) => /figma\.com/i.test(url),
    color: '#A259FF',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    hoverBg: '#EDE9FE',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 2h4v4H8a2 2 0 1 1 0-4zm4 4h4a2 2 0 1 1-2 2V6h-2zm0 4v4H8a2 2 0 0 1 0-4h4zm0 4h4a2 2 0 1 1-2 2v-2h-2zm-4 4a2 2 0 0 1 2-2v2a2 2 0 0 1-4 0 2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    match: (url) => /github\.com/i.test(url),
    color: '#181717',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    hoverBg: '#E5E7EB',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    match: (url) => /youtube\.com|youtu\.be/i.test(url),
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    hoverBg: '#FEE2E2',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    match: (url) => /adsmanager\.facebook\.com|business\.facebook\.com|facebook\.com\/ads/i.test(url),
    color: '#0081FB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    hoverBg: '#DBEAFE',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.48 2 12c0 4.99 3.657 9.13 8.438 9.88v-6.99H7.898v-2.89h2.54V9.8c0-2.51 1.493-3.89 3.777-3.89 1.094 0 2.238.2 2.238.2v2.46h-1.26c-1.243 0-1.63.77-1.63 1.56v1.87h2.773l-.443 2.89h-2.33v6.99C18.343 21.13 22 16.99 22 12c0-5.52-4.477-10-10-10z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    match: (url) => /facebook\.com/i.test(url),
    color: '#1877F2',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    hoverBg: '#DBEAFE',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    match: (url) => /instagram\.com/i.test(url),
    color: '#C13584',
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    hoverBg: '#FCE7F3',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    id: 'loom',
    name: 'Loom Video',
    match: (url) => /loom\.com/i.test(url),
    color: '#625DF5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    hoverBg: '#E0E7FF',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
  },
  {
    id: 'notion',
    name: 'Notion',
    match: (url) => /notion\.so|notion\.site/i.test(url),
    color: '#111827',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    hoverBg: '#E5E7EB',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.549c-.466-.373-.98-.606-2.008-.513L3.106 2.062c-.373.047-.466.28-.28.466l1.633 1.68zm.84 3.033v13.626c0 .793.42 1.073 1.353 1.026l14.288-.84c.887-.046.98-.606.98-1.26V6.167c0-.606-.28-.886-.793-.84l-15.034.887c-.607.046-.794.373-.794 1.027zm13.728 1.446c.093.373 0 .746-.373.793l-.84.14v8.399c-.42.233-.84.373-1.26.373-.653 0-.933-.28-1.493-.98l-4.573-7.14v7.094l1.354.28c.093.373 0 .746-.374.793l-3.36.187c-.093-.374 0-.747.373-.794l.84-.187V9.754l-1.12-.14c-.093-.373 0-.746.374-.793l3.5-.233 4.807 7.233V9.24l-1.073-.14c-.094-.373 0-.747.373-.794l3.22-.187z" />
      </svg>
    ),
  },
  {
    id: 'canva',
    name: 'Canva',
    match: (url) => /canva\.com/i.test(url),
    color: '#00C4CC',
    bgColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    hoverBg: '#CFFAFE',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.88c-2.3 0-3.8-1.5-3.8-3.7 0-2.4 1.6-4.1 4.1-4.1 1.7 0 3 1 3.2 2.5h-1.8c-.2-.7-.7-1.1-1.4-1.1-1.4 0-2.2 1.1-2.2 2.7 0 1.5.9 2.4 2.2 2.4.8 0 1.3-.4 1.5-1.1h1.8c-.3 1.6-1.7 2.4-3.6 2.4z" />
      </svg>
    ),
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    match: (url) => /dropbox\.com/i.test(url),
    color: '#0061FF',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    hoverBg: '#DBEAFE',
    icon: (size = 13) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.036 1.5L0 5.467l6.036 3.967 6.036-3.967L6.036 1.5zm11.928 0l-6.036 3.967 6.036 3.967L24 5.467 17.964 1.5zM0 13.4l6.036 3.967 6.036-3.967L6.036 9.433 0 13.4zm17.964-3.967l-6.036 3.967 6.036 3.967L24 13.4l-6.036-3.967zM6.036 18.867L12 14.9l5.964 3.967L12 22.5l-5.964-3.633z" />
      </svg>
    ),
  },
];

/**
 * Returns platform config matching a given URL, or null if custom/generic.
 */
export function getPlatformForUrl(url: string): PlatformConfig | null {
  for (const p of POPULAR_PLATFORMS) {
    if (p.match(url)) return p;
  }
  return null;
}

/**
 * Extracts a clean domain label from any URL for generic buttons.
 */
function getDomainFromUrl(url: string): string {
  try {
    const cleaned = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const parsed = new URL(cleaned);
    let host = parsed.hostname.replace(/^www\./i, '');
    if (parsed.pathname && parsed.pathname.length > 1 && parsed.pathname !== '/') {
      const seg = parsed.pathname.split('/').filter(Boolean)[0];
      if (seg && seg.length <= 15) {
        return `${host}/${seg}`;
      }
    }
    return host;
  } catch {
    return url.length > 25 ? `${url.slice(0, 22)}...` : url;
  }
}

/**
 * Renders an interactive, styled platform button or custom URL button for a link.
 */
export function renderLinkButton(url: string, key?: string | number): React.ReactElement {
  let cleanUrl = url.trim();
  let trailingPunctuation = '';
  const punctMatch = cleanUrl.match(/[.,;:!?)\]]+$/);
  if (punctMatch) {
    trailingPunctuation = punctMatch[0];
    cleanUrl = cleanUrl.slice(0, -trailingPunctuation.length);
  }

  const href = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
    ? cleanUrl
    : `https://${cleanUrl}`;

  const platform = getPlatformForUrl(cleanUrl);

  const buttonStyle: React.CSSProperties = platform
    ? {
        color: platform.color,
        backgroundColor: platform.bgColor,
        border: `1px solid ${platform.borderColor}`,
        padding: '3px 9px',
        borderRadius: 6,
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 11.5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        margin: '2px 3px',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
        verticalAlign: 'middle',
      }
    : {
        color: '#4338CA',
        backgroundColor: '#EEF2FF',
        border: '1px solid #C7D2FE',
        padding: '3px 8px',
        borderRadius: 6,
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: 11.5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        margin: '2px 3px',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'all 0.15s ease',
        verticalAlign: 'middle',
      };

  return (
    <React.Fragment key={key}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={buttonStyle}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-1px)';
          el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.08)';
          if (platform) {
            el.style.backgroundColor = platform.hoverBg;
          } else {
            el.style.backgroundColor = '#E0E7FF';
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'none';
          el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
          if (platform) {
            el.style.backgroundColor = platform.bgColor;
          } else {
            el.style.backgroundColor = '#EEF2FF';
          }
        }}
        title={`Open ${platform ? platform.name : 'Link'}: ${href}`}
      >
        {platform ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {platform.icon(13)}
            </span>
            <span>{platform.name}</span>
            <ExternalLink size={10} style={{ opacity: 0.7, flexShrink: 0 }} />
          </>
        ) : (
          <>
            <Globe size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
            <span>{getDomainFromUrl(cleanUrl)}</span>
            <ExternalLink size={10} style={{ opacity: 0.7, flexShrink: 0 }} />
          </>
        )}
      </a>
      {trailingPunctuation}
    </React.Fragment>
  );
}

/**
 * Parses text and converts all detected links into prominent platform buttons or clean link buttons.
 */
export function renderTextWithLinks(text?: string | null): React.ReactNode {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^(https?:\/\/|www\.)/i)) {
      return renderLinkButton(part, index);
    }
    return <span key={index}>{part}</span>;
  });
}
