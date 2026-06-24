import React, { useState, useRef, useEffect } from 'react';
import { Siren } from 'lucide-react';
import { getPriorityBadgeStyle } from '@/app/utils/taskUtils';

interface PriorityPickerProps {
  priority: number | null;
  maxPriority: number;
  availablePriorities: number[];
  onSelect: (priority: number | null) => void;
  size?: 'sm' | 'md';
}

const PriorityPicker: React.FC<PriorityPickerProps> = ({
  priority,
  maxPriority,
  availablePriorities,
  onSelect,
  size = 'md',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const style = getPriorityBadgeStyle(priority, maxPriority);
  const isSmall = size === 'sm';

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelect = (p: number | null) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={`chip font-bold flex items-center gap-1 transition-opacity hover:opacity-75 ${
          priority == null ? 'opacity-40' : ''
        }`}
        style={{
          backgroundColor: style.bg,
          color: style.text,
          padding: '0.1rem 0.45rem',
          borderRadius: '9px',
          fontSize: isSmall ? '9px' : '11px',
        }}
        title="Change priority"
        aria-label="Change priority"
      >
        <Siren className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
        {priority ?? '—'}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 right-0 card p-1.5 flex flex-col gap-1 shadow-lg min-w-[72px]">
          <div
            className={`flex flex-col gap-1 ${
              availablePriorities.length > 5
                ? 'max-h-40 overflow-y-auto scrollbar-custom pr-0.5'
                : ''
            }`}
          >
            {availablePriorities.map(p => {
              const s = getPriorityBadgeStyle(p, maxPriority);
              return (
                <button
                  key={p}
                  onClick={() => handleSelect(p)}
                  className="chip text-[10px] font-bold flex items-center gap-1 w-full justify-center hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: s.bg,
                    color: s.text,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  <Siren className="w-3 h-3" />
                  {p}
                </button>
              );
            })}
          </div>

          {priority != null && (
            <button
              onClick={() => handleSelect(null)}
              className="text-[10px] font-medium text-text-muted hover:text-text-primary transition-colors text-center pt-0.5"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PriorityPicker;
