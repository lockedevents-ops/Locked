"use client";

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  ChevronRight, 
  MessageSquare, 
  ShieldAlert, 
  UserMinus,
  BellOff,
  Search,
  Settings,
  Coins,
  MapPin,
  Check
} from 'lucide-react';

interface DeletionReason {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const DELETION_REASONS: DeletionReason[] = [
  {
    id: 'discovery',
    label: 'Found a better alternative',
    icon: <Search className="w-5 h-5 text-purple-600" />,
    description: "I found another platform that better suits my event discovery needs."
  },
  {
    id: 'management',
    label: 'Difficult to manage events/venues',
    icon: <Settings className="w-5 h-5 text-blue-600" />,
    description: "The dashboard or management tools are hard to use."
  },
  {
    id: 'fees',
    label: 'High commission fees',
    icon: <Coins className="w-5 h-5 text-emerald-600" />,
    description: "The fees for ticket sales or venue bookings are too high."
  },
  {
    id: 'privacy',
    label: 'Security or Privacy concerns',
    icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
    description: "I'm worried about my data or account security."
  },
  {
    id: 'location',
    label: 'Not enough local events',
    icon: <MapPin className="w-5 h-5 text-amber-600" />,
    description: "There aren't many events or venues in my specific area."
  },
  {
    id: 'other',
    label: 'Something else',
    icon: <MessageSquare className="w-5 h-5 text-gray-600" />,
    description: "I have a different reason for leaving."
  }
];

interface DeletionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isProcessing?: boolean;
}

export function DeletionReasonModal({ isOpen, onClose, onConfirm, isProcessing }: DeletionReasonModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const toggleReason = (id: string) => {
    setSelectedReasons(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedReasons.length === 0) return;
    
    const reasons = selectedReasons
      .map(id => {
        if (id === 'other') return `Other: ${customReason}`;
        return DELETION_REASONS.find(r => r.id === id)?.label;
      })
      .filter(Boolean)
      .join(', ');
    
    onConfirm(reasons || 'Not specified');
  };

  const isOtherSelected = selectedReasons.includes('other');
  const isContinueDisabled = selectedReasons.length === 0 || (isOtherSelected && !customReason.trim()) || isProcessing;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Why are you leaving?</h3>
              <p className="text-sm text-gray-500">Select all that apply. Your feedback helps us improve.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid gap-3">
            {DELETION_REASONS.map((reason) => {
              const isSelected = selectedReasons.includes(reason.id);
              return (
                <button
                  key={reason.id}
                  onClick={() => toggleReason(reason.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer group ${
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                  }`}
                  disabled={isProcessing}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-gray-300 bg-white group-hover:border-primary/50'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-white'}`}>
                    {reason.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold transition-colors ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                        {reason.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 leading-snug">{reason.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {isOtherSelected && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Please tell us more</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Share your thoughts with us..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-24 resize-none text-gray-900"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50 cursor-pointer"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isContinueDisabled}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? 'Processing...' : 'Continue to Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
