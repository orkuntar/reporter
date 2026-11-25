import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownWidthClass?: string;
  title?: string;
  emptyText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz...',
  searchPlaceholder = 'Ara...',
  className = '',
  triggerClassName = '',
  dropdownWidthClass = 'min-w-[240px]',
  title,
  emptyText = 'Sonuç bulunamadı',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find(o => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter(
      o =>
        o.label.toLocaleLowerCase('tr-TR').includes(q) ||
        (o.subLabel && o.subLabel.toLocaleLowerCase('tr-TR').includes(q)) ||
        o.value.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title={title || selectedOption?.label}
        className={`flex items-center justify-between space-x-2 text-left font-mono transition-colors focus:outline-none ${
          triggerClassName ||
          'w-full bg-[#181d2a] border border-white/[0.1] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 mt-1 z-[100] bg-[#0e121a] border border-white/[0.14] rounded-md shadow-2xl overflow-hidden flex flex-col ${dropdownWidthClass} w-full`}
        >
          {/* Search Input inside Selectbox */}
          <div className="p-1.5 border-b border-white/[0.08] bg-[#090b10] flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none py-0.5"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-white/[0.02]">
            {filteredOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/50 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <Check
                      className={`w-3 h-3 flex-shrink-0 ${
                        isSelected ? 'text-cyan-400 opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.subLabel && (
                    <span className="text-2xs text-slate-500 flex-shrink-0">
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-2xs font-mono text-slate-500">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
