"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { eventRegistrationService, EventRegistrationFormData } from '@/services/eventRegistrationService';
import { useToast } from '@/hooks/useToast';
import { CheckCircle2, Users, Mail, Phone, User, Ticket, Loader2 } from 'lucide-react';

interface EventRegistrationFormProps {
  eventId: string;
  eventTitle: string;
  onRegistrationSuccess?: () => void;
  isModal?: boolean;
}

export function EventRegistrationForm({ 
  eventId, 
  eventTitle, 
  onRegistrationSuccess,
  isModal = false
}: EventRegistrationFormProps) {
  const [formData, setFormData] = useState<EventRegistrationFormData>({
    attendee_name: '',
    attendee_email: '',
    attendee_phone: '',
    ticket_type: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [freeTickets, setFreeTickets] = useState<Array<{ id: number; name: string; description?: string; quantity: number }>>([]);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  const { user } = useAuth();
  const toast = useToast();

  // Load free tickets and check registration status
  useEffect(() => {
    const loadTicketsAndCheckStatus = async () => {
      setCheckingStatus(true);
      
      try {
        // Load free tickets
        const tickets = await eventRegistrationService.getFreeTickets(eventId);
        setFreeTickets(tickets);
        
        // If user is authenticated, pre-fill email and check if already registered
        if (user?.email) {
          // Try multiple sources for user name
          const userName = 
            user.user_metadata?.name || 
            user.user_metadata?.full_name || 
            user.user_metadata?.display_name ||
            user.user_metadata?.first_name && user.user_metadata?.last_name ? 
              `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : 
            user.email?.split('@')[0] || '';
          
          setFormData(prev => ({
            ...prev,
            attendee_email: user.email,
            attendee_name: userName,
            attendee_phone: user.user_metadata?.phone || user.user_metadata?.phone_number || ''
          }));
          
          // Check if already registered
          const isRegistered = await eventRegistrationService.isUserRegistered(eventId, user.email);
          setRegistered(isRegistered);
        }
        
        // Set default ticket if only one free ticket available
        if (tickets.length === 1) {
          setFormData(prev => ({
            ...prev,
            ticket_type: tickets[0].name
          }));
        }
      } catch (error) {
        console.error('Error loading tickets:', error);
        toast.showError('Loading Failed', 'Failed to load event information');
      } finally {
        setCheckingStatus(false);
      }
    };

    loadTicketsAndCheckStatus();
  }, [eventId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.attendee_name.trim()) {
      toast.showError('Name Required', 'Please enter your name');
      return;
    }
    
    if (!formData.attendee_email.trim()) {
      toast.showError('Email Required', 'Please enter your email');
      return;
    }
    
    if (!formData.ticket_type) {
      toast.showError('Ticket Required', 'Please select a ticket type');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await eventRegistrationService.registerForEvent(eventId, formData);
      
      if (result.success) {
        toast.showSuccess('Registration Successful', 'Successfully registered for the event!');
        setRegistered(true);
        // Delay the callback slightly to show the success state briefly
        setTimeout(() => {
          onRegistrationSuccess?.();
        }, isModal ? 1500 : 0);
      } else {
        toast.showError('Registration Failed', result.error || 'Failed to register for event');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.showError('Unexpected Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (checkingStatus) {
    return (
      <div className={isModal ? "p-5" : "bg-white rounded-xl border border-neutral-200 p-8"}>
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="ml-2 text-neutral-600 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // If no free tickets available, don't show the form
  if (freeTickets.length === 0) {
    return null;
  }

  // Show success state if already registered
  if (registered) {
    return (
      <div className={isModal ? "pb-4" : "bg-white rounded-xl border border-green-200 p-8"}>
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800 mb-1">
            You're Registered!
          </h3>
          <p className="text-green-700 mb-3 text-sm">
            Everything is set. We'll send you updates.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-xs">
            <p className="text-green-800">
              <strong>Event:</strong> {eventTitle}
            </p>
            {user?.email && (
              <p className="text-green-800 mt-1">
                <strong>Email:</strong> {user.email}
              </p>
            )}
          </div>
          
          {/* Link to My Tickets */}
          <div className="mt-2">
            <Link 
              href="/dashboards/user/tickets"
              className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-bold text-sm"
            >
              <Ticket className="w-4 h-4" />
              View My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "pb-4" : "bg-white rounded-xl shadow-sm p-6"}>
      {!isModal && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-full">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-neutral-900">
                Register for Free Event
              </h3>
              <p className="text-neutral-600 text-sm">
                This is a free event - just provide your details to register
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>Free Registration:</strong> No payment required for this event
            </p>
          </div>
        </div>
      )}
      
      {isModal && (
        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              <strong>Free Registration:</strong> No payment required.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={isModal ? "space-y-3" : "space-y-6"}>
        {/* Name Field */}
        <div>
          <label htmlFor="attendee_name" className="block text-xs font-bold text-neutral-700 mb-1.5">
            <User className="w-3.5 h-3.5 inline mr-1" />
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="attendee_name"
            name="attendee_name"
            value={formData.attendee_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your full name"
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="attendee_email" className="block text-xs font-bold text-neutral-700 mb-1.5">
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="attendee_email"
            name="attendee_email"
            value={formData.attendee_email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your email address"
          />
        </div>

        {/* Phone Field (Optional) */}
        <div>
          <label htmlFor="attendee_phone" className="block text-xs font-bold text-neutral-700 mb-1.5">
            <Phone className="w-3.5 h-3.5 inline mr-1" />
            Phone Number <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            type="tel"
            id="attendee_phone"
            name="attendee_phone"
            value={formData.attendee_phone}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your phone number"
          />
        </div>

        {/* Ticket Selection */}
        <div>
          <label htmlFor="ticket_type" className="block text-xs font-bold text-neutral-700 mb-1.5">
            <Ticket className="w-3.5 h-3.5 inline mr-1" />
            Ticket Type <span className="text-red-500">*</span>
          </label>
          <select
            id="ticket_type"
            name="ticket_type"
            value={formData.ticket_type}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Select a ticket type</option>
            {freeTickets.map((ticket) => (
              <option key={ticket.id} value={ticket.name}>
                {ticket.name} - Free
                {ticket.description && ` (${ticket.description})`}
              </option>
            ))}
          </select>
        </div>



        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2 cursor-pointer text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              Register for Free
            </>
          )}
        </button>
      </form>
    </div>
  );
}
