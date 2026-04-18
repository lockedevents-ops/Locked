"use client";

import { useState } from 'react';
import { Lock, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RoleAccessModalProps {
  role: 'Organizer' | 'VenueOwner';
  isOpen: boolean;
  onClose: () => void;
  onRequestAccess: () => void;
}

export default function RoleAccessModal({ 
  role, 
  isOpen, 
  onClose,
  onRequestAccess
}: RoleAccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in-up">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto bg-amber-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-600">
            You're trying to access the <strong>{role}</strong> dashboard, but you don't currently have this role.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg flex items-start">
            <AlertTriangle className="text-blue-500 mt-0.5 mr-3 flex-shrink-0 h-5 w-5" />
            <p className="text-sm text-blue-700">
              To access this dashboard, you'll need to request the {role} role. 
              Your request will be reviewed by our team within 1-3 business days.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRequestAccess}
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Request {role} Access
          </button>
        </div>
      </div>
    </div>
  );
}