import React from 'react';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-white border border-neutral-200 rounded-md p-1">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded md:cursor-pointer ${
          currentView === 'grid' 
            ? 'bg-neutral-100 text-neutral-800' 
            : 'text-neutral-500 hover:text-neutral-700'
        }`}
        title="Grid View"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded md:cursor-pointer ${
          currentView === 'list' 
            ? 'bg-neutral-100 text-neutral-800' 
            : 'text-neutral-500 hover:text-neutral-700'
        }`}
        title="List View"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}