"use client";

import React from 'react';
import { X, CheckCircle, Ticket, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: (navigating?: boolean) => void;
  eventTitle: string;
  spots: number;
  attendeeEmail: string;
  isUpdate?: boolean;
  totalSpots?: number;
}

export function RegistrationSuccessModal({ 
  isOpen, 
  onClose, 
  eventTitle, 
  spots,
  attendeeEmail,
  isUpdate,
  totalSpots
}: RegistrationSuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleViewTickets = () => {
    router.push('/dashboards/user/tickets');
    // Close modal after navigation starts
    // Pass true to indicate we are navigating away, so parent shouldn't reload
    setTimeout(() => onClose(true), 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button 
            onClick={() => onClose()}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isUpdate ? "Registration Updated!" : "Registration Successful!"}
          </h2>
          <p className="text-gray-600 mb-6">
            You've successfully {isUpdate ? "updated your registration for" : "registered for"} <span className="font-semibold text-gray-900">{eventTitle}</span>
          </p>

          {/* Registration Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Ticket className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{isUpdate ? "Update Details" : "Registration Details"}</p>
                  <p className="text-sm text-gray-600">
                    {isUpdate 
                      ? `${spots} new ${spots === 1 ? 'spot' : 'spots'} added (Total: ${totalSpots || spots} spots)`
                      : `${spots} ${spots === 1 ? 'spot' : 'spots'} reserved`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Confirmation Sent</p>
                  <p className="text-sm text-gray-600 break-all">{attendeeEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-left">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">What's next?</span> Check your email for your registration confirmation and ticket details. You can also view your tickets anytime in your profile.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleViewTickets}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-5 h-5" />
              View My Tickets
            </button>
            <button
              onClick={() => onClose()}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
