"use client";

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Ticket as TicketIcon, AlertCircle, Calendar } from 'lucide-react';
import { LiveBadge } from '@/components/events/LiveBadge';
import { useAuth } from '@/contexts/AuthContext';
import { ViewTicketModal } from '@/components/events/ViewTicketModal';
import { createClient } from '@/lib/supabase/client/client';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { useUserTickets, type Ticket, type FilterStatus } from '@/hooks/useUserTickets';
import { isEventLive, isEventUpcoming, isPastEvent } from '@/services/sharedEventService';
import { PageLoader } from '@/components/loaders/PageLoader';

export default function TicketsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 12;

  // ✅ USE CACHED HOOK - This replaces the manual database queries!
  const { 
    tickets: filteredTickets, 
    allTickets, 
    isLoading: loading, 
    refresh, 
    clearCache 
  } = useUserTickets({
    userEmail: (user?.email || '').toLowerCase(), // Normalize to lowercase
    userId: user?.id || '',
    filterStatus
  });
  
  // Calculate pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const FilterButton = ({ status, label }: { status: FilterStatus; label: string }) => (
    <button
      onClick={() => setFilterStatus(status)}
  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
        filterStatus === status
          ? 'bg-primary text-white'
          : 'bg-white text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {label}
    </button>
  );

  // Modified to open confirmation modal
  const confirmDeleteTicket = (ticketId: string) => {
    setTicketToDelete(ticketId);
    setShowDeleteModal(true);
  };

  // Actual delete function that's called after confirmation
  const handleDeleteTicket = async () => {
    if (ticketToDelete && user) {
      try {
        const supabase = createClient();
        
        // Actually delete the registration record (not just cancel)
        // Use case-insensitive email matching with ilike
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('id', ticketToDelete)
          .ilike('attendee_email', (user.email || '').toLowerCase());
          
        if (error) {
          throw error;
        }
        
        // Clear cache and refresh
        clearCache();
        await refresh();
        
        toast.showSuccess('Ticket Deleted', 'Ticket deleted successfully');
      } catch (error) {
        console.error('Error deleting ticket:', error);
        toast.showError('Delete Failed', 'Failed to delete ticket');
      }
      
      setShowDeleteModal(false);
      setTicketToDelete(null);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTicketToDelete(null);
  };

  if (loading) {
    return <PageLoader message="Loading your tickets..." fullHeight />;
  }

  // Calculate counts using allTickets
  const getTicketStatus = (ticket: Ticket) => {
    const statusCheckEvent = {
      startDate: ticket.eventDate,
      time: ticket.eventTime,
      endDate: ticket.eventEndDate,
      end_time: ticket.eventEndTime,
    };

    if (isEventLive(statusCheckEvent)) return 'live';
    if (isPastEvent(statusCheckEvent)) return 'past';
    return 'upcoming';
  };

  const liveTicketsCount = allTickets.filter(t => getTicketStatus(t) === 'live').length;
  const upcomingTicketsCount = allTickets.filter(t => getTicketStatus(t) === 'upcoming').length;
  const pastTicketsCount = allTickets.filter(t => getTicketStatus(t) === 'past').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">My Tickets</h1>
          <p className="text-neutral-600 mt-2">View and manage all your event tickets in one place</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
        <FilterButton status="all" label={`All (${allTickets.length})`} />
        <FilterButton status="live" label={`Live (${liveTicketsCount})`} />
        <FilterButton status="upcoming" label={`Upcoming (${upcomingTicketsCount})`} />
        <FilterButton status="past" label={`Past (${pastTicketsCount})`} />
      </div>

      {/* Tickets Grid */}
            <div className="grid auto-rows-auto gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {currentTickets.map(ticket => {
          const eventDate = parseISO(ticket.eventDate);

          // Use shared helpers for consistent status detection
          const statusCheckEvent = {
            startDate: ticket.eventDate,
            time: ticket.eventTime,
            endDate: ticket.eventEndDate,
            end_time: ticket.eventEndTime,
          };

          const isLive = isEventLive(statusCheckEvent);
          const hasEnded = isPastEvent(statusCheckEvent);
          
          // Check if event is happening today
          const today = new Date();
          const isToday = eventDate.toDateString() === today.toDateString();

          return (
            <div 
              key={ticket.id}
              className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col w-full"
            >
              {/* Image and Status Badge */}
              <div 
                className="relative flex-shrink-0 h-48 cursor-pointer group"
                onClick={() => setSelectedTicket(ticket)}
              >
                <Image
                  src={ticket.eventImage}
                  alt={ticket.eventTitle}
                  width={400}
                  height={200}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Today Badge - Top Left */}
                {isToday && !isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-500 text-white shadow-md z-10">
                    <Calendar className="w-3 h-3" />
                    Today
                  </div>
                )}
                
                {/* Live Badge - Top Left (takes priority over Today) */}
                {isLive && (
                  <LiveBadge className="absolute top-4 left-4 z-10" />
                )}
                
                {/* Status Badge - Top Right */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium z-10 ${
                  !hasEnded && ticket.status === 'valid' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'used' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {!hasEnded && ticket.status === 'valid' ? 'Valid' :
                   ticket.status === 'used' ? 'Used' : 'Expired'}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 line-clamp-2">{ticket.eventTitle}</h3>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <p>{format(eventDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p>{ticket.eventTime ? format(new Date(`1970-01-01T${ticket.eventTime}`), 'h:mm a') : format(eventDate, 'h:mm a')}</p>
                    <p className="line-clamp-1">{ticket.venue}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-100 mt-auto">
                  <div>
                    <p className="text-sm text-neutral-500">{ticket.ticketType}</p>
                    <p className="font-bold text-primary">₵{ticket.price}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: <span className="font-mono font-bold text-blue-600">{ticket.ticketNumber}</span>
                    </p>
                  </div>
                  {!hasEnded && ticket.status === 'valid' ? (
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      <TicketIcon className="w-4 h-4" />
                      View
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-500">
                        {ticket.status === 'used' ? 'Event Attended' : 
                         ticket.status === 'expired' ? 'Ticket Expired' : 'Event Ended'}
                      </span>
                      {(hasEnded || ticket.status === 'used' || ticket.status === 'expired') && (
                        <button
                          onClick={() => confirmDeleteTicket(ticket.id)}
                          className="ml-2 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label="Delete ticket"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {filteredTickets.length > ticketsPerPage && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstTicket + 1}</span> to{" "}
              <span className="font-medium">{Math.min(indexOfLastTicket, filteredTickets.length)}</span> of{" "}
              <span className="font-medium">{filteredTickets.length}</span> tickets
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 || 
                             page === totalPages || 
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            currentPage === page
                              ? 'bg-primary text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="mb-4">
            <TicketIcon className="w-12 h-12 text-neutral-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No tickets found</h3>
          <p className="mt-2 text-neutral-600">
            {filterStatus === 'upcoming' 
              ? "You don't have any upcoming events"
              : filterStatus === 'live'
              ? "No events are currently live"
              : filterStatus === 'past'
              ? "You don't have any past events"
              : "You haven't purchased any tickets yet"}
          </p>
          <Link 
            href="/pages/discover"
            className="mt-6 inline-block bg-primary text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Explore Events
          </Link>
        </div>
      )}

      {/* View Ticket Modal */}
      {selectedTicket && (
        <ViewTicketModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={cancelDelete}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-full bg-red-100 p-3 flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Ticket?</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Are you sure you want to delete this ticket? This action cannot be undone and the ticket record will be permanently removed.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTicket}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                Delete Ticket
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
