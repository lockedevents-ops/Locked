"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '../ui/SignInModal';
import { UnifiedCheckoutModal } from './UnifiedCheckoutModal';
import { usePathname } from 'next/navigation';
import { eventRegistrationService } from '@/services/eventRegistrationService';
import { Check, Plus, Minus } from 'lucide-react';

interface TicketCardProps {
  event: {
    id: string;
    title: string;
    tickets: any;
    saleEndsAt: string;
    remainingTickets: number;
    isPastEvent?: boolean;
  };
  onPurchase: (tickets: Array<{ ticket: any; quantity: number; subtotal: number }>, total: number) => void;
}

interface TicketSelection {
  ticket: any;
  quantity: number;
  ticketKey: string | number;
}

export function TicketCard({ event, onPurchase }: TicketCardProps) {
  // Map: ticket key => { ticket, quantity }
  const [selectedTickets, setSelectedTickets] = useState<Map<string | number, TicketSelection>>(new Map());
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const pathname = usePathname();

  const formatSaleEndDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const [registeredQuantity, setRegisteredQuantity] = useState(0); // Track specifically how many spots registered
  const [ticketStats, setTicketStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(true);

  // Determine if any selected ticket is free
  const hasAnyFreeTicket = Array.from(selectedTickets.values()).some(sel => sel.ticket.price === 0);
  
  // Check if user is already registered for free events AND fetch ticket stats
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Fetch Ticket Stats (Sold counts)
        const stats = await eventRegistrationService.getEventRegistrationStats(event.id);
        
        if (isMounted) {
          setTicketStats(stats.registrations_by_ticket_type || {});
          setLoadingStats(false);
        }

        // 2. Check User Registration (if applicable)
        if (user?.email && (Array.isArray(event.tickets) ? event.tickets.some((t: any) => t.price === 0) : false)) {
            const registration = await eventRegistrationService.getUserRegistration(event.id, user.email);
            if (isMounted) {
              setIsAlreadyRegistered(!!registration);
              setRegisteredQuantity(registration?.quantity_registered || 0);
            }
        } else if (isMounted) {
            setIsAlreadyRegistered(false);
            setRegisteredQuantity(0);
        }

      } catch (error) {
        console.error('Error loading ticket data:', error);
        if (isMounted) setLoadingStats(false);
      }
    };
    
    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.email, event.id, event.tickets]);
  
  // Helper: Update quantity for a specific ticket
  const updateTicketQuantity = (ticketKey: string | number, ticket: any, newQuantity: number) => {
    // If it's a free ticket, ensure we don't exceed the global limit of 5 including existing registrations
    if (ticket.price === 0) {
      const currentSelection = newQuantity;
      const totalFree = currentSelection + registeredQuantity; // Simple logic: assumption of 1 free ticket type for now
      
      // If we are trying to add more than allowed
      if (totalFree > 5) {
        return; // Do not update
      }
    }

    setSelectedTickets(prev => {
      const newMap = new Map(prev);
      if (newQuantity > 0) {
        newMap.set(ticketKey, { ticket, quantity: newQuantity, ticketKey });
      } else {
        newMap.delete(ticketKey);
      }
      return newMap;
    });
  };
  
  // Helper: Get quantity for a specific ticket
  const getTicketQuantity = (ticketKey: string | number): number => {
    return selectedTickets.get(ticketKey)?.quantity || 0;
  };
  
  // Calculate total cost
  const calculateTotal = (): number => {
    return Array.from(selectedTickets.values()).reduce((sum, sel) => {
      return sum + (sel.ticket.price * sel.quantity);
    }, 0);
  };
  
  const total = calculateTotal();
  const totalTicketCount = Array.from(selectedTickets.values()).reduce((sum, sel) => sum + sel.quantity, 0);

  const handlePurchase = () => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    
    // Prevent purchase if no tickets selected
    if (selectedTickets.size === 0) {
      return;
    }
    
    // Convert Map to array of ticket selections
    const ticketsArray = Array.from(selectedTickets.values()).map(sel => ({
      ticket: sel.ticket,
      quantity: sel.quantity,
      subtotal: sel.ticket.price * sel.quantity
    }));
    
    // Call onPurchase with tickets array and total
    onPurchase(ticketsArray, total);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Tickets</h2>
      
      {event.isPastEvent ? (
        // ... past event UI ...
        <div className="space-y-4">
          <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-200 rounded-full mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">Event Has Ended</h3>
            <p className="text-sm text-neutral-600">This event has already taken place. Ticket sales and registration are now closed.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
            <div className="space-y-4">
            {Array.isArray(event.tickets) && event.tickets.map((t, index) => {
                // Calculate dynamic stats
                const soldCount = ticketStats[t.name] || 0;
                const capacity = t.quantity || 100; // Default capacity if missing
                const remaining = Math.max(0, capacity - soldCount);
                const ticketSoldOut = remaining <= 0;
                
                const currentQty = getTicketQuantity(index);
                
                // Calculate max addable for free tickets
                const isFree = t.price === 0;
                // For free tickets: limited by (Personal Limit of 5 - Already Registered) AND (Global Remaining Spots)
                const personalRemaining = isFree ? Math.max(0, 5 - registeredQuantity) : 10;
                const maxAddable = Math.min(personalRemaining, remaining);
                
                const isMaxReached = isFree ? (currentQty >= maxAddable) : (currentQty >= remaining || currentQty >= 10);

                return (
                <div 
                  key={index} 
                  className={`border border-gray-200 rounded-lg p-4 transition-all ${
                    ticketSoldOut 
                      ? 'opacity-60 bg-neutral-50' 
                      : currentQty > 0
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-gray-300'
                  }`}
                >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    <span className="font-bold text-primary">{t.price === 0 ? "Free" : `₵${t.price}`}</span>
                </div>
                <p className="text-sm text-neutral-600 mb-3">{t.description || "Standard admission"}</p>
                
                {!ticketSoldOut && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 flex flex-col gap-0.5">
                      {/* Ticket Capacity Status */}
                      <span className={`${remaining <= 5 ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>
                        {!loadingStats && `${remaining} ${remaining === 1 ? 'spot' : 'spots'} remaining`}
                      </span>
                      
                      {/* Personal Limit Status for Free Events */}
                      {isFree && registeredQuantity > 0 && (
                        <span className="text-blue-600">
                           You have {registeredQuantity} reserved
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateTicketQuantity(index, t, Math.max(0, currentQty - 1))}
                        disabled={currentQty <= 0 || loadingStats}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{currentQty}</span>
                      <button 
                        onClick={() => updateTicketQuantity(index, t, Math.min(10, currentQty + 1))}
                        disabled={isMaxReached || loadingStats}
                        className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {ticketSoldOut && (
                  <span className="text-xs text-red-600 font-medium">
                    {t.price === 0 ? "No spots available" : "Sold Out"}
                  </span>
                )}
                </div>
                );
            })}
            
            {/* Same logic for Object based tickets loop if needed, though usually array */}
            
            </div>

            {total > 0 && (
            <div className="flex justify-between items-center py-4 border-t border-b">
                <div>
                  <span className="font-medium">Total:</span>
                  <span className="text-sm text-neutral-600 ml-2">({totalTicketCount} {totalTicketCount === 1 ? 'ticket' : 'tickets'})</span>
                </div>
                <span className="text-xl font-bold">₵{total.toFixed(2)}</span>
            </div>
            )}

            <button 
              onClick={handlePurchase} 
              disabled={selectedTickets.size === 0}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                selectedTickets.size === 0
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
              }`}
            >
              {selectedTickets.size === 0 ? (
                 isAlreadyRegistered && registeredQuantity >= 5 ? (
                  <a href="/dashboards/user/tickets" className="flex items-center justify-center gap-2 w-full pointer-events-auto">
                    <Check className="w-5 h-5" />
                    Registered - View Tickets
                  </a>
                ) : "Select Tickets"
              ) : (
                isAlreadyRegistered && hasAnyFreeTicket ? (
                  "Update Registration"
                ) : hasAnyFreeTicket ? (
                   total > 0 ? "Checkout" : "Register for Free"
                ) : (
                  totalTicketCount > 1 ? `Get ${totalTicketCount} Tickets` : "Get Ticket"
                )
              )}
            </button>
            <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} action={hasAnyFreeTicket ? "register" : "ticket"} returnUrl={pathname} />

            <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <span>Sales end on {formatSaleEndDate(event.saleEndsAt)}</span>
            </div>
            
            {/* Removed Global Remaining Count - moved to per-ticket */}
            
            </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TicketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}
