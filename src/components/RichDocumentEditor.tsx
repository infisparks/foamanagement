'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Table, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  RemoveFormatting, 
  Undo, 
  Redo, 
  Clipboard, 
  Sparkles,
  Wand2
} from 'lucide-react';

interface RichDocumentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

/**
 * Detects if a line/block represents an Option or Step header
 * (e.g. "Option 1 — Build a CSV-only model first", "Option 2", "Step 1", "Phase 1")
 * Handles icons, emojis, bullets, and markdown asterisks.
 */
function isOptionHeader(text: string): boolean {
  if (!text) return false;
  const clean = text
    .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸(✓)(✔)]+/u, '')
    .trim();
  return /^(Option|Step|Approach|Method|Phase|Part)\s+(\d+|[A-Z])\b/i.test(clean);
}

/**
 * Detects if a line/block is a Badge pill (e.g. "Best starting point", "Recommended")
 */
function isBadgePill(text: string): boolean {
  if (!text) return false;
  const clean = text
    .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸(✓)(✔)]+/u, '')
    .replace(/[\s*`_~]+$/g, '')
    .trim();
  return /^(Best\s+starting\s+point|Recommended|Important|Note|Pro\s+Tip|Baseline|Alternative)$/i.test(clean);
}

/**
 * Detects if a line/block is a numbered section title (e.g. "3. But your datasets are not connected...")
 */
function isSectionHeader(text: string): boolean {
  if (!text) return false;
  const clean = text
    .replace(/^[\s*`_~#>•\-–—]+/u, '')
    .trim();
  return /^(\d+\.|\d{2}\b)\s+[A-Z]/i.test(clean);
}

/**
 * Intelligent parser that converts plain text, markdown, and tab-separated tables
 * (such as those copied from ChatGPT) into clean HTML with large readable paragraph font (18px)
 * and properly bold Option headers and badges.
 */
function convertPlainTextToCleanHtml(raw: string): string {
  if (!raw.trim()) return '';

  const lines = raw.split(/\r?\n/);
  const output: string[] = [];
  let inBulletList = false;
  let inNumberedList = false;
  let inTable = false;
  let tableRows: string[][] = [];

  function flushList() {
    if (inBulletList) {
      output.push('</ul>');
      inBulletList = false;
    }
    if (inNumberedList) {
      output.push('</ol>');
      inNumberedList = false;
    }
  }

  function flushTable() {
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px; border: 1px solid #CBD5E1;">';
      const [headerRow, ...bodyRows] = tableRows;
      tableHtml += '<thead><tr style="background-color: #F8FAFC;">';
      headerRow.forEach((col) => {
        tableHtml += `<th style="border: 1px solid #CBD5E1; padding: 12px 16px; text-align: left; font-weight: 700; color: #0F172A; background-color: #F8FAFC;">${formatInlineMarkdown(col)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      bodyRows.forEach((row, idx) => {
        const bg = idx % 2 === 1 ? ' style="background-color: #FAFAFA;"' : '';
        tableHtml += `<tr${bg}>`;
        row.forEach((col) => {
          tableHtml += `<td style="border: 1px solid #CBD5E1; padding: 10px 16px; font-weight: 400; color: #334155;">${formatInlineMarkdown(col)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table>';
      output.push(tableHtml);
      tableRows = [];
      inTable = false;
    }
  }

  function formatInlineMarkdown(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Check if line is part of a tab-separated table (e.g. copied table from ChatGPT/Excel)
    if (line.includes('\t')) {
      const cols = line.split('\t').map((c) => c.trim());
      if (cols.length >= 2) {
        flushList();
        inTable = true;
        tableRows.push(cols);
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // 2. Check if line is part of a markdown pipe table | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!trimmed.match(/^\|?[-:\s|]+\|?$/)) {
        const cols = trimmed.slice(1, -1).split('|').map((c) => c.trim());
        flushList();
        inTable = true;
        tableRows.push(cols);
        continue;
      } else {
        continue; // delimiter row
      }
    } else if (inTable) {
      flushTable();
    }

    // Empty line separates blocks
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // 3. Option / Step / Approach headers (e.g. "Option 1 — Build a CSV-only model first")
    if (isOptionHeader(trimmed)) {
      flushList();
      flushTable();
      const clean = trimmed
        .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸(✓)(✔)]+/u, '')
        .replace(/[\s*`_~]+$/g, '')
        .trim();
      output.push(`<h3 class="doc-option-header" style="font-size: 19px; font-weight: 700; color: #0F172A; margin-top: 22px; margin-bottom: 8px;"><strong>${formatInlineMarkdown(clean)}</strong></h3>`);
      continue;
    }

    // 4. Badge pills (e.g. "Best starting point", "Recommended")
    if (isBadgePill(trimmed)) {
      flushList();
      flushTable();
      const clean = trimmed
        .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸]+/u, '')
        .replace(/[\s*`_~]+$/g, '')
        .trim();
      output.push(`<div style="margin: 6px 0 10px;"><span class="chatgpt-badge">${formatInlineMarkdown(clean)}</span></div>`);
      continue;
    }

    // 5. Headings with markdown markers: #, ##, ###
    if (trimmed.startsWith('### ')) {
      flushList();
      flushTable();
      output.push(`<h3 style="font-size: 19px; font-weight: 700; color: #0F172A; margin-top: 22px; margin-bottom: 8px;"><strong>${formatInlineMarkdown(trimmed.slice(4))}</strong></h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      flushTable();
      output.push(`<h2 style="font-size: 22px; font-weight: 700; color: #0F172A; margin-top: 26px; margin-bottom: 12px;"><strong>${formatInlineMarkdown(trimmed.slice(3))}</strong></h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      flushTable();
      output.push(`<h1 style="font-size: 28px; font-weight: 800; color: #0F172A; margin-top: 28px; margin-bottom: 14px;"><strong>${formatInlineMarkdown(trimmed.slice(2))}</strong></h1>`);
      continue;
    }

    // 6. Numbered main section headers (e.g. "3. But your datasets are not connected. What should you do?")
    if (isSectionHeader(trimmed)) {
      flushList();
      flushTable();
      const clean = trimmed.replace(/^[\s*`_~#>•\-–—]+/u, '').trim();
      output.push(`<h2 style="font-size: 22px; font-weight: 700; color: #0F172A; margin-top: 26px; margin-bottom: 12px;"><strong>${formatInlineMarkdown(clean)}</strong></h2>`);
      continue;
    }

    // 7. Bullet list items (- item, * item, • item)
    if (/^[-*•]\s+/.test(trimmed)) {
      flushTable();
      if (!inBulletList) {
        flushList();
        inBulletList = true;
        output.push('<ul>');
      }
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      output.push(`<li style="font-size: 18px; line-height: 1.75; color: #334155;">${formatInlineMarkdown(itemText)}</li>`);
      continue;
    }

    // 8. Regular body paragraphs (18px font-size, line-height 1.75, margin-bottom 14px, font-weight: 400 normal text!)
    flushList();
    flushTable();
    output.push(`<p style="font-size: 18px; line-height: 1.75; margin-bottom: 14px; font-weight: 400; color: #334155;">${formatInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  flushTable();
  return output.join('');
}

export default function RichDocumentEditor({
  value,
  onChange,
  placeholder = 'Start writing or paste content directly from ChatGPT, Word, or Docs...',
  minHeight = 480,
  readOnly = false,
}: RichDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);

  // Initialize or update innerHTML when value changes from outside
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  function notifyPaste(msg: string) {
    setPasteToast(msg);
    setTimeout(() => setPasteToast(null), 3500);
  }

  // Execute standard formatting command
  const exec = useCallback((command: string, val: string | undefined = undefined) => {
    if (readOnly) return;
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, readOnly]);

  // Insert Table into editor
  const insertTable = useCallback(() => {
    if (readOnly) return;
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; border: 1px solid #CBD5E1;">
        <thead>
          <tr style="background-color: #F8FAFC;">
            <th style="border: 1px solid #CBD5E1; padding: 10px 14px; text-align: left; font-weight: 700; color: #0F172A;">Task / Phase</th>
            <th style="border: 1px solid #CBD5E1; padding: 10px 14px; text-align: left; font-weight: 700; color: #0F172A;">Main Responsibility</th>
            <th style="border: 1px solid #CBD5E1; padding: 10px 14px; text-align: left; font-weight: 700; color: #0F172A;">Expected Output</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;"><strong>Phase 1</strong></td>
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;">Data Analysis & Pipeline</td>
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;">Clean CSV Split</td>
          </tr>
          <tr style="background-color: #FAFAFA;">
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;"><strong>Phase 2</strong></td>
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;">Model Training</td>
            <td style="border: 1px solid #CBD5E1; padding: 9px 14px; font-weight: 400; color: #334155;">Trained Weights</td>
          </tr>
        </tbody>
      </table>
      <p style="font-weight: 400;"></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, readOnly]);

  // Fix / Normalize Bold Text and format ChatGPT content across document
  const normalizeBoldText = useCallback(() => {
    if (!editorRef.current || readOnly) return;

    const root = editorRef.current;
    let modified = false;

    // 1. Unwrap Google Docs/Chrome <b style="font-weight:normal"> or rogue <b> tags wrapping multiple elements
    const boldNodes = Array.from(root.querySelectorAll('b, span'));
    boldNodes.forEach((node) => {
      const el = node as HTMLElement;
      const id = el.getAttribute('id') || '';
      const style = el.getAttribute('style') || '';
      const isDocsWrapper = id.startsWith('docs-internal-guid');
      const isNormalWeight = 
        style.includes('font-weight:normal') || 
        style.includes('font-weight: normal') || 
        style.includes('font-weight:400') ||
        style.includes('font-weight: 400');

      if (isDocsWrapper || isNormalWeight) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          modified = true;
        }
      }
    });

    // 2. Scan paragraphs, divs, headings, and list items to format Option headers, Badges, and Paragraph sizes
    const blocks = Array.from(root.querySelectorAll('p, div, h1, h2, h3, h4, li'));
    blocks.forEach((node) => {
      const el = node as HTMLElement;
      const rawText = el.textContent || '';
      const trimmed = rawText.trim();

      // Check Option header (e.g. "Option 1 — Build a CSV-only model first", "Option 2", "Option 3")
      if (isOptionHeader(trimmed)) {
        const clean = trimmed
          .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸(✓)(✔)]+/u, '')
          .replace(/[\s*`_~]+$/g, '')
          .trim();
        const newEl = document.createElement('h3');
        newEl.className = 'doc-option-header';
        newEl.style.fontSize = '19px';
        newEl.style.fontWeight = '700';
        newEl.style.color = '#0F172A';
        newEl.style.marginTop = '22px';
        newEl.style.marginBottom = '8px';
        newEl.innerHTML = `<strong>${clean}</strong>`;
        el.replaceWith(newEl);
        modified = true;
        return;
      }

      // Check Badge pill (e.g. "Best starting point", "Recommended")
      if (isBadgePill(trimmed)) {
        const clean = trimmed
          .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸]+/u, '')
          .replace(/[\s*`_~]+$/g, '')
          .trim();
        const badgeDiv = document.createElement('div');
        badgeDiv.style.margin = '6px 0 10px';
        badgeDiv.innerHTML = `<span class="chatgpt-badge">${clean}</span>`;
        el.replaceWith(badgeDiv);
        modified = true;
        return;
      }

      // Check Section header (e.g. "3. But your datasets are not connected. What should you do?")
      if (isSectionHeader(trimmed) && el.tagName !== 'H1' && el.tagName !== 'H2') {
        const clean = trimmed.replace(/^[\s*`_~#>•\-–—]+/u, '').trim();
        const newH2 = document.createElement('h2');
        newH2.style.fontSize = '22px';
        newH2.style.fontWeight = '700';
        newH2.style.color = '#0F172A';
        newH2.style.marginTop = '26px';
        newH2.style.marginBottom = '12px';
        newH2.innerHTML = `<strong>${clean}</strong>`;
        el.replaceWith(newH2);
        modified = true;
        return;
      }

      // Regular body paragraph
      if (el.tagName === 'P') {
        el.style.fontSize = '18px';
        el.style.lineHeight = '1.75';
        el.style.marginBottom = '14px';
        el.style.color = '#334155';
        if (!el.querySelector('strong, b')) {
          el.style.fontWeight = '400';
        }
        modified = true;
      }
    });

    // 3. Curve and center all images
    const images = Array.from(root.querySelectorAll('img'));
    images.forEach((img) => {
      img.style.display = 'block';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.margin = '24px auto';
      img.style.borderRadius = '12px';
      img.style.border = '1px solid #E2E8F0';
      img.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)';
      img.style.boxSizing = 'border-box';
      modified = true;
    });

    if (modified) {
      onChange(root.innerHTML);
      notifyPaste('Updated! Images curved & centered, option headers bold, and 18px font size applied.');
    } else {
      notifyPaste('Text and images are already up to date.');
    }
  }, [onChange, readOnly]);

  // Handle direct paste from ChatGPT or Microsoft Word
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');

    e.preventDefault();

    if (htmlData) {
      // 1. Parse HTML using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');

      // 2. Remove Google Docs / Chrome wrapper: <b style="font-weight:normal" id="docs-internal-guid-...">
      const docsWrappers = Array.from(doc.querySelectorAll('b, span'));
      docsWrappers.forEach((el) => {
        const id = el.getAttribute('id') || '';
        const style = el.getAttribute('style') || '';
        const isDocsGuid = id.startsWith('docs-internal-guid');
        const isFontWeightNormal = 
          style.includes('font-weight:normal') || 
          style.includes('font-weight: normal') || 
          style.includes('font-weight:400') ||
          style.includes('font-weight: 400') ||
          (el as HTMLElement).style?.fontWeight === 'normal' ||
          (el as HTMLElement).style?.fontWeight === '400';

        if (isDocsGuid || (isFontWeightNormal && el.tagName.toLowerCase() === 'b')) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        }
      });

      // 3. Identify and preserve all Option headers, badges, section titles, and bold text
      const blocks = Array.from(doc.querySelectorAll('p, div, h1, h2, h3, h4, li'));
      blocks.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const rawText = htmlEl.textContent || '';
        const trimmed = rawText.trim();

        // Check if block is an Option header (e.g. Option 1 — Build a CSV-only model first, Option 2, Option 3)
        if (isOptionHeader(trimmed)) {
          const cleanText = trimmed
            .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸(✓)(✔)]+/u, '')
            .replace(/[\s*`_~]+$/g, '')
            .trim();
          
          const newH3 = doc.createElement('h3');
          newH3.className = 'doc-option-header';
          newH3.style.fontSize = '19px';
          newH3.style.fontWeight = '700';
          newH3.style.color = '#0F172A';
          newH3.style.marginTop = '22px';
          newH3.style.marginBottom = '8px';
          newH3.innerHTML = `<strong>${cleanText}</strong>`;
          htmlEl.replaceWith(newH3);
          return;
        }

        // Check if block is a Badge pill (e.g. "Best starting point", "Recommended")
        if (isBadgePill(trimmed)) {
          const cleanBadge = trimmed
            .replace(/^[\s*`_~#>•\-–—✓✔✅🔗📁💡📌🔹🔸]+/u, '')
            .replace(/[\s*`_~]+$/g, '')
            .trim();
          const badgeDiv = doc.createElement('div');
          badgeDiv.style.margin = '6px 0 10px';
          badgeDiv.innerHTML = `<span class="chatgpt-badge">${cleanBadge}</span>`;
          htmlEl.replaceWith(badgeDiv);
          return;
        }

        // Check if block is a numbered section header (e.g. "3. But your datasets are not connected...")
        if (isSectionHeader(trimmed) && htmlEl.tagName !== 'H1' && htmlEl.tagName !== 'H2') {
          const cleanHeader = trimmed.replace(/^[\s*`_~#>•\-–—]+/u, '').trim();
          const newH2 = doc.createElement('h2');
          newH2.style.fontSize = '22px';
          newH2.style.fontWeight = '700';
          newH2.style.color = '#0F172A';
          newH2.style.marginTop = '26px';
          newH2.style.marginBottom = '12px';
          newH2.innerHTML = `<strong>${cleanHeader}</strong>`;
          htmlEl.replaceWith(newH2);
          return;
        }

        // Preserve Tailwind or inline font-semibold / font-bold elements
        const className = htmlEl.className || '';
        const styleWeight = htmlEl.style?.fontWeight || '';
        const isSemibold = 
          className.includes('font-semibold') || 
          className.includes('font-bold') || 
          styleWeight === '600' || 
          styleWeight === '700' || 
          styleWeight === 'bold';

        if (isSemibold && htmlEl.tagName !== 'STRONG' && htmlEl.tagName !== 'B') {
          htmlEl.style.fontWeight = '700';
          htmlEl.style.color = '#0F172A';
        }
      });

      // 4. Regular body paragraphs get 18px font-size and clean readable line-height
      const paragraphs = Array.from(doc.querySelectorAll('p'));
      paragraphs.forEach((p) => {
        const el = p as HTMLElement;
        if (!el.classList.contains('doc-option-header')) {
          el.style.fontSize = '18px';
          el.style.lineHeight = '1.75';
          el.style.marginBottom = '14px';
          el.style.color = '#334155';
          if (!el.querySelector('strong, b')) {
            el.style.fontWeight = '400';
          }
        }
      });

      // 5. Ensure tables have standard clean borders and padding
      const tables = Array.from(doc.querySelectorAll('table'));
      tables.forEach((t) => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
        t.style.margin = '18px 0';
        t.style.border = '1px solid #CBD5E1';
      });
      const ths = Array.from(doc.querySelectorAll('th'));
      ths.forEach((th) => {
        th.style.border = '1px solid #CBD5E1';
        th.style.padding = '12px 16px';
        th.style.backgroundColor = '#F8FAFC';
        th.style.fontWeight = '700';
        th.style.textAlign = 'left';
        th.style.color = '#0F172A';
      });
      const tds = Array.from(doc.querySelectorAll('td'));
      tds.forEach((td) => {
        td.style.border = '1px solid #CBD5E1';
        td.style.padding = '10px 16px';
        td.style.fontWeight = '400';
        td.style.color = '#334155';
      });

      // 6. Ensure all pasted images are curved, centered, and contained inside page
      const images = Array.from(doc.querySelectorAll('img'));
      images.forEach((img) => {
        img.style.display = 'block';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.margin = '24px auto';
        img.style.borderRadius = '12px';
        img.style.border = '1px solid #E2E8F0';
        img.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)';
        img.style.boxSizing = 'border-box';
      });

      const sanitized = doc.body.innerHTML;
      document.execCommand('insertHTML', false, sanitized);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      notifyPaste('Pasted cleanly! Option 1 is bold, badge is styled, and paragraph font is 18px.');
    } else if (plainText) {
      // 2. Plain text / Markdown / Tab-separated table paste
      const cleanHtml = convertPlainTextToCleanHtml(plainText);
      document.execCommand('insertHTML', false, cleanHtml);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      notifyPaste('Text converted cleanly into paragraphs (18px) and bold option headers!');
    }
  }, [onChange]);

  // Handle direct ChatGPT paste from clipboard button
  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        notifyPaste('Clipboard is empty.');
        return;
      }
      const cleanHtml = convertPlainTextToCleanHtml(text);
      document.execCommand('insertHTML', false, cleanHtml);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      notifyPaste('Clipboard pasted! Option 1 is bold, badge is styled, and font size is 18px.');
    } catch (err) {
      notifyPaste('Press Ctrl+V / Cmd+V to paste your clipboard.');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        border: '1px solid #CBD5E1',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Word-like Editor Formatting Toolbar */}
      {!readOnly && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {/* Undo / Redo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 6 }}>
            <button
              type="button"
              onClick={() => exec('undo')}
              className="toolbar-btn"
              title="Undo (Ctrl+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              onClick={() => exec('redo')}
              className="toolbar-btn"
              title="Redo (Ctrl+Y)"
            >
              <Redo size={14} />
            </button>
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Heading Selectors */}
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h1>')}
            className="toolbar-btn"
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            className="toolbar-btn"
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h3>')}
            className="toolbar-btn"
            title="Heading 3"
          >
            <Heading3 size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<p>')}
            className="toolbar-btn"
            style={{ fontSize: 11, fontWeight: 600, padding: '3px 6px' }}
            title="Paragraph (Normal Text)"
          >
            Normal
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Font styles */}
          <button
            type="button"
            onClick={() => exec('bold')}
            className="toolbar-btn"
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            className="toolbar-btn"
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            className="toolbar-btn"
            title="Underline (Ctrl+U)"
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('strikeThrough')}
            className="toolbar-btn"
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            className="toolbar-btn"
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            className="toolbar-btn"
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<blockquote>')}
            className="toolbar-btn"
            title="Quote Block"
          >
            <Quote size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<pre>')}
            className="toolbar-btn"
            title="Code Block"
          >
            <Code size={14} />
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Table Insertion */}
          <button
            type="button"
            onClick={insertTable}
            className="toolbar-btn"
            style={{ gap: 4, padding: '3px 8px', color: '#4338CA', backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}
            title="Insert Table with headers & rows"
          >
            <Table size={14} color="#6366F1" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Insert Table</span>
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Alignments */}
          <button
            type="button"
            onClick={() => exec('justifyLeft')}
            className="toolbar-btn"
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyCenter')}
            className="toolbar-btn"
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyRight')}
            className="toolbar-btn"
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* Clean / Remove format */}
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            className="toolbar-btn"
            title="Clear Formatting on selection"
          >
            <RemoveFormatting size={14} />
          </button>

          {/* Fix Unwanted Bold Button */}
          <button
            type="button"
            onClick={normalizeBoldText}
            className="toolbar-btn"
            style={{
              fontSize: 11.5,
              padding: '3px 8px',
              backgroundColor: '#FAFAFF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              gap: 4,
              fontWeight: 600,
            }}
            title="Format Option headers as bold, create badges, and enlarge paragraph text to 18px"
          >
            <Wand2 size={12} color="#6366F1" />
            <span>Fix & Format Bold</span>
          </button>

          {/* ChatGPT Paste Helper Button */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="toolbar-btn"
              style={{
                fontSize: 11,
                padding: '3px 9px',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                border: '1px solid #C7D2FE',
                gap: 5,
                fontWeight: 600,
              }}
              title="Paste clipboard content cleanly without unwanted bold"
            >
              <Sparkles size={12} color="#6366F1" />
              <span>Paste ChatGPT Cleanly</span>
            </button>
          </div>
        </div>
      )}

      {/* Paste Notification Banner */}
      {pasteToast && (
        <div
          style={{
            padding: '7px 14px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontSize: 11.5,
            fontWeight: 500,
            borderBottom: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={13} color="#059669" />
          <span>{pasteToast}</span>
        </div>
      )}

      {/* Word-like Document Canvas */}
      <div
        style={{
          padding: '36px 52px',
          backgroundColor: '#FFFFFF',
          minHeight,
          outline: 'none',
          overflowY: 'auto',
          overflowX: 'hidden',
          fontSize: 18,
          lineHeight: 1.75,
          color: '#1E293B',
          fontWeight: 400,
        }}
        className="document-canvas-content"
      >
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onPaste={handlePaste}
          onInput={() => {
            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
          }}
          data-placeholder={placeholder}
          style={{
            minHeight: minHeight - 60,
            outline: 'none',
            wordBreak: 'break-word',
            fontWeight: 400,
            overflowX: 'hidden',
          }}
          className={readOnly ? 'document-reading-mode' : 'document-editing-mode'}
        />
      </div>

      <style jsx>{`
        .toolbar-btn {
          border: 1px solid transparent;
          background: transparent;
          border-radius: 5px;
          padding: 4px 6px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .toolbar-btn:hover {
          background-color: #E2E8F0;
          color: #0F172A;
          border-color: #CBD5E1;
        }
        .document-editing-mode:empty:before {
          content: attr(data-placeholder);
          color: #94A3B8;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
