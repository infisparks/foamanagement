'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flame, Sparkles, ChevronDown, Check, Plus } from 'lucide-react';

export interface TemplateItem {
  title: string;
  count: number;
}

interface TaskTitleInputWithDropdownProps {
  value: string;
  onChange: (value: string) => void;
  templates: TemplateItem[];
  placeholder?: string;
  required?: boolean;
  onCreate?: (title: string) => void;
}

export default function TaskTitleInputWithDropdown({
  value,
  onChange,
  templates,
  placeholder = 'e.g. Research & Launch Meta Ads Campaign, Reel Script...',
  required = true,
  onCreate,
}: TaskTitleInputWithDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter & rank suggestions based on user input
  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!templates || templates.length === 0) return [];

    if (!query) {
      // If empty input, show top 5 most frequently used deliverables
      return templates.slice(0, 5);
    }

    // Filter matching templates
    const matches = templates.filter((t) => t.title.toLowerCase().includes(query));

    // Sort by best match:
    // 1. Starts with query has highest priority
    // 2. Word boundary match
    // 3. Frequency count
    matches.sort((a, b) => {
      const aLower = a.title.toLowerCase();
      const bLower = b.title.toLowerCase();

      const aStarts = aLower.startsWith(query);
      const bStarts = bLower.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Check word boundary (e.g. "Meta Ads" matches "Ads")
      const aWordMatch = aLower.split(/\s+/).some((w) => w.startsWith(query));
      const bWordMatch = bLower.split(/\s+/).some((w) => w.startsWith(query));
      if (aWordMatch && !bWordMatch) return -1;
      if (!aWordMatch && bWordMatch) return 1;

      // Higher usage count ranks higher
      return (b.count || 1) - (a.count || 1);
    });

    return matches.slice(0, 6);
  }, [value, templates]);

  // Handle selecting a template
  const handleSelect = (selectedTitle: string) => {
    onChange(selectedTitle);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle creating new custom deliverable task
  const handleCreateOption = (customTitle: string) => {
    const clean = customTitle.trim();
    if (!clean) return;
    onChange(clean);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onCreate) {
      onCreate(clean);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasCreate = value.trim().length > 0;

    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        setHighlightedIndex(hasCreate ? -2 : 0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hasCreate && highlightedIndex === -1) {
        setHighlightedIndex(-2);
      } else if (highlightedIndex === -2) {
        setHighlightedIndex(filteredSuggestions.length > 0 ? 0 : -2);
      } else {
        setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : (hasCreate ? -2 : 0)));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (highlightedIndex === 0 && hasCreate) {
        setHighlightedIndex(-2);
      } else if (highlightedIndex === -2) {
        setHighlightedIndex(filteredSuggestions.length > 0 ? filteredSuggestions.length - 1 : -2);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : (hasCreate ? -2 : filteredSuggestions.length - 1)));
      }
    } else if (e.key === 'Enter') {
      if (highlightedIndex === -2 && hasCreate) {
        e.preventDefault();
        handleCreateOption(value.trim());
      } else if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex].title);
      } else if (hasCreate && onCreate) {
        e.preventDefault();
        handleCreateOption(value.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Highlight matched substring
  const renderHighlightedText = (text: string, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return <span>{text}</span>;

    const index = text.toLowerCase().indexOf(q);
    if (index === -1) return <span>{text}</span>;

    const before = text.slice(0, index);
    const match = text.slice(index, index + q.length);
    const after = text.slice(index + q.length);

    return (
      <span>
        {before}
        <strong style={{ color: '#4F46E5', backgroundColor: '#EEF2FF', borderRadius: 2, padding: '0 2px' }}>
          {match}
        </strong>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input Field with Dropdown Toggle */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          required={required}
          style={{
            paddingRight: 36,
            fontSize: 13.5,
          }}
        />

        {/* Dropdown Chevron button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: isOpen ? '#4F46E5' : '#94A3B8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            transition: 'color 0.15s ease',
          }}
          title={isOpen ? 'Close suggestions' : 'Show suggestions'}
        >
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (filteredSuggestions.length > 0 || value.trim().length > 0) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 80,
            overflow: 'hidden',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {/* Quick Create Option for Typed Custom Title */}
          {value.trim().length > 0 && (
            <div
              onClick={() => handleCreateOption(value.trim())}
              onMouseEnter={() => setHighlightedIndex(-2)}
              style={{
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
                backgroundColor: highlightedIndex === -2 ? '#EEF2FF' : '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                transition: 'background-color 0.1s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                </div>
                <div style={{ fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 700, color: '#4F46E5' }}>Create:</span>{' '}
                  <span style={{ fontWeight: 600 }}>"{value.trim()}"</span>
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 5,
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                <Plus size={11} strokeWidth={2.5} />
                <span>Create Task</span>
              </div>
            </div>
          )}

          {/* Dropdown Suggestions Header (if suggestions exist) */}
          {filteredSuggestions.length > 0 && (
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#FAFAFA',
                borderBottom: '1px solid #F1F5F9',
                fontSize: 11,
                fontWeight: 600,
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={12} color="#D97706" />
                <span>Suggested Deliverables ({filteredSuggestions.length})</span>
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>
                Press Enter or click to pick
              </span>
            </div>
          )}

          {/* Suggestions List */}
          <div style={{ padding: '4px 0' }}>
            {filteredSuggestions.map((item, index) => {
              const isSelected = value.trim().toLowerCase() === item.title.toLowerCase();
              const isHighlighted = highlightedIndex === index;

              return (
                <div
                  key={item.title + index}
                  onClick={() => handleSelect(item.title)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    cursor: 'pointer',
                    backgroundColor: isHighlighted
                      ? '#EEF2FF'
                      : isSelected
                      ? '#F8FAFC'
                      : '#FFFFFF',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <Sparkles
                      size={13}
                      color={isHighlighted || isSelected ? '#4F46E5' : '#94A3B8'}
                      style={{ flexShrink: 0 }}
                    />
                    <div
                      style={{
                        fontSize: 12.5,
                        color: isHighlighted ? '#1E1B4B' : '#0F172A',
                        fontWeight: isSelected ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {renderHighlightedText(item.title, value)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {item.count > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: isHighlighted ? '#E0E7FF' : '#F1F5F9',
                          color: isHighlighted ? '#4338CA' : '#64748B',
                        }}
                        title={`Used ${item.count} times`}
                      >
                        {item.count}x
                      </span>
                    )}

                    {isSelected && <Check size={13} color="#4F46E5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
