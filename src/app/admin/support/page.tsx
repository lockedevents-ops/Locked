"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import supportDatabaseService from '@/services/supabase/supportDatabaseService';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  LifeBuoy, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Plus,
  Tag,
  Flag,
  Calendar,
  Users,
  Book,
  FileText,
  HelpCircle,
  PieChart,
  X,
  Send,
  BookOpen,
  Eye,
  PlusCircle,
  Save,
  RefreshCw,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { PageLoader } from '@/components/loaders/PageLoader';
import { motion, AnimatePresence } from 'framer-motion';
import type { SupportTicket, TicketMessage, KBArticle, IssueTemplate } from '@/services/supabase/supportDatabaseService';

// Type alias for easier usage
type Ticket = SupportTicket;

// Generic confirmation modal -------------------------------------------------
const ConfirmationModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold mb-2 flex items-start gap-2">
            {destructive && <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />}
            {title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="px-5 pb-5 pt-2 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white cursor-pointer transition-colors ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// Template modal (create / edit)
const TemplateModal = ({
  template,
  isNew = false,
  onClose,
  onSave
}: {
  template?: IssueTemplate;
  isNew?: boolean;
  onClose: () => void;
  onSave: (template: IssueTemplate) => void;
}) => {
  const [data, setData] = useState<IssueTemplate>(
    template || {
      id: `tpl_${Date.now()}`,
      title: '',
      description: '',
      suggestedResponse: '',
      category: 'general'
    }
  );
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...data, id: data.id });
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-xl animate-in fade-in slide-in-from-top-4 duration-200 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isNew ? 'Create Template' : 'Edit Template'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Title</label>
            <input
              type="text"
              required
              value={data.title}
              onChange={e => setData({ ...data, title: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Description</label>
            <textarea
              required
              rows={3}
              value={data.description}
              onChange={e => setData({ ...data, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
            <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Suggested Response</label>
            <textarea
              required
              rows={5}
              value={data.suggestedResponse}
              onChange={e => setData({ ...data, suggestedResponse: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Category</label>
            <input
              type="text"
              value={data.category}
              onChange={e => setData({ ...data, category: e.target.value.toLowerCase() })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-gray-50 cursor-pointer"
            >Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 cursor-pointer"
            >{saving ? 'Saving...' : (isNew ? 'Create' : 'Save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket detail modal component -------------------------------------------
const TicketDetailModal = ({
  ticket,
  onClose,
  onUpdateTicket,
  staffMembers,
  onDeleteTicket
}: {
  ticket: Ticket;
  onClose: () => void;
  onUpdateTicket: (ticketId: string, data: Partial<Ticket>) => void;
  staffMembers: { id: string; name: string }[];
  onDeleteTicket: (ticketId: string) => void;
}) => {
  const [message, setMessage] = useState('');
  const [ticketData, setTicketData] = useState(ticket);
  const [activeTab, setActiveTab] = useState<'conversation' | 'details' | 'history'>('conversation');
  const [isEditing, setIsEditing] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<IssueTemplate[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (activeTab === 'conversation' && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket.messages, activeTab]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  // Fetch suggested responses based on ticket category
  useEffect(() => {
    // This would be an API call in a real application
    // For now, we'll just simulate it
    const fetchSuggestedResponses = () => {
      // Simulate API delay
      setTimeout(() => {
        const responses = [
          {
            id: '1',
            title: 'Account Access Issue',
            description: 'User having trouble logging in',
            suggestedResponse: 'I understand you\'re having trouble accessing your account. Let me help you troubleshoot this issue. Could you please try clearing your browser cookies and cache, then attempt to log in again? If that doesn\'t work, we can try resetting your password.',
            category: 'account'
          },
          {
            id: '2',
            title: 'Payment Processing Error',
            description: 'User encountering payment failure',
            suggestedResponse: 'I\'m sorry to hear you\'re experiencing issues with payment processing. To help resolve this, could you confirm which payment method you\'re using? Also, please check if your card details are up to date and that your bank hasn\'t blocked the transaction for security reasons.',
            category: 'billing'
          },
          {
            id: '3',
            title: 'Event Booking Confirmation',
            description: 'User hasn\'t received booking confirmation',
            suggestedResponse: 'I understand you haven\'t received your booking confirmation. Let me look into this for you right away. I\'ve checked our system and can confirm that your booking for [Event Name] is successfully registered. I\'ll resend the confirmation email immediately. Please also check your spam folder just in case.',
            category: 'events'
          }
        ];
        
        const filteredResponses = responses.filter(
          r => r.category.toLowerCase() === ticket.category.toLowerCase()
        );
        
        setSuggestedResponses(filteredResponses.length > 0 ? filteredResponses : responses);
      }, 500);
    };
    
    fetchSuggestedResponses();
  }, [ticket.category]);
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      content: message,
      createdAt: new Date().toISOString(),
      sender: 'support' as const,
      senderName: 'Support Staff',
    };
    
    // Update local state
    const updatedMessages = [...(ticketData.messages || []), newMessage];
    setTicketData({
      ...ticketData,
      messages: updatedMessages,
      status: ticketData.status === 'open' ? 'in_progress' : ticketData.status,
      updatedAt: new Date().toISOString()
    });
    
    // Send update to parent component
    onUpdateTicket(ticket.id, {
      messages: updatedMessages,
      status: ticketData.status === 'open' ? 'in_progress' : ticketData.status,
      updatedAt: new Date().toISOString()
    });
    
    // Clear message input
    setMessage('');
  };
  
  const handleStatusChange = (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    const updatedTicket = {
      ...ticketData,
      status,
      updatedAt: new Date().toISOString()
    };
    
    setTicketData(updatedTicket);
    onUpdateTicket(ticket.id, { status, updatedAt: new Date().toISOString() });
  };
  
  const handlePriorityChange = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const updatedTicket = {
      ...ticketData,
      priority,
      updatedAt: new Date().toISOString()
    };
    
    setTicketData(updatedTicket);
    onUpdateTicket(ticket.id, { priority, updatedAt: new Date().toISOString() });
  };
  
  const handleAssigneeChange = (assignedTo: string) => {
    const updatedTicket = {
      ...ticketData,
      assignedTo,
      updatedAt: new Date().toISOString()
    };
    
    setTicketData(updatedTicket);
    onUpdateTicket(ticket.id, { assignedTo, updatedAt: new Date().toISOString() });
  };
  
  const handleSave = () => {
    onUpdateTicket(ticket.id, ticketData);
    setIsEditing(false);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <X className="w-3 h-3 mr-1" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Low
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Medium
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            High
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-5xl w-full max-h-[80vh] h-[80vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 pr-4">
            <h2 className="text-xl font-bold truncate max-w-xl" title={ticketData.subject}>{ticketData.subject}</h2>
            {getStatusBadge(ticketData.status)}
            <div className="hidden md:flex items-center gap-2 ml-4">
              {(ticketData.status === 'resolved' || ticketData.status === 'closed') && (
                <button
                  onClick={() => onDeleteTicket(ticket.id)}
                  className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium cursor-pointer"
                >Delete</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(ticketData.status === 'resolved' || ticketData.status === 'closed') && (
              <button
                onClick={() => onDeleteTicket(ticket.id)}
                className="md:hidden text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium cursor-pointer"
              >Delete</button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-1 shadow-sm flex space-x-2">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'conversation'
                  ? 'bg-black text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <LifeBuoy className="w-4 h-4 mr-2" />
              Conversation
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-black text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-black text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              History
            </button>
          </div>
        </div>
        
        {/* Animated tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 flex-1 overflow-hidden"
          >
            {/* Tab content - Keep your existing tab content here but remove the wrapping divs with className="space-y-6" */}
            {activeTab === 'conversation' && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Messages area */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4 pr-4">
                  {/* Initial ticket description */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-medium">
                          {ticketData.userName?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-blue-700">{ticketData.userName}</div>
                          <div className="text-xs text-blue-600">{formatDate(ticketData.createdAt)}</div>
                        </div>
                        <div className="mt-1 text-blue-800 whitespace-pre-wrap">
                          {ticketData.description}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversation messages */}
                  {(ticketData.messages || []).map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-4 rounded-lg ${
                        message.sender === 'support' 
                          ? 'bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800' 
                          : 'bg-blue-50 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div 
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-medium ${
                              message.sender === 'support'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-blue-200 text-blue-700'
                            }`}
                          >
                            {message.senderName.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{message.senderName}</div>
                            <div className="text-xs text-gray-500">{formatDate(message.createdAt)}</div>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>
                
                {/* Suggested responses */}
                {suggestedResponses.length > 0 && (
                  <div className="px-6 py-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Suggested Responses:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedResponses.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setMessage(template.suggestedResponse)}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors cursor-pointer"
                        >
                          {template.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Reply form */}
                <div className="border-t border-gray-200 p-4">
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) {
                          handleSendMessage();
                        }
                      }}
                    ></textarea>
                    <div className="absolute bottom-3 right-3">
                      <button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className={`p-2 rounded-full ${
                          message.trim()
                            ? 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Press ⌘+Enter to send</p>
                </div>
              </div>
            )}
            
            {activeTab === 'details' && (
              <div className="h-full overflow-y-auto p-6">
                {isEditing ? (
                  <div className="space-y-6">
                    {/* Ticket info in edit mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          id="subject"
                          type="text"
                          value={ticketData.subject}
                          onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          id="category"
                          value={ticketData.category}
                          onChange={(e) => setTicketData({...ticketData, category: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="account">Account</option>
                          <option value="billing">Billing</option>
                          <option value="events">Events</option>
                          <option value="technical">Technical</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          id="status"
                          value={ticketData.status}
                          onChange={(e) => setTicketData({
                            ...ticketData, 
                            status: e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed'
                          })}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          id="priority"
                          value={ticketData.priority}
                          onChange={(e) => setTicketData({
                            ...ticketData, 
                            priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                          })}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned To
                        </label>
                        <select
                          id="assignedTo"
                          value={ticketData.assignedTo || ''}
                          onChange={(e) => setTicketData({...ticketData, assignedTo: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="">Unassigned</option>
                          {staffMembers.map((staff) => (
                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          id="description"
                          value={ticketData.description}
                          onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                          rows={5}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                        ></textarea>
                      </div>
                    </div>
                    
                    {/* Save/Cancel buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Ticket info in view mode */}
                    <div className="flex justify-between">
                      <h3 className="text-lg font-bold">Ticket Information</h3>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-primary hover:text-primary-dark text-sm font-medium flex items-center cursor-pointer"
                      >
                        Edit Details
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket ID</h4>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{ticketData.id}</p>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Category</h4>
                        <p className="capitalize text-gray-900 dark:text-gray-100">{ticketData.category}</p>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</h4>
                        <div className="mt-1">{getStatusBadge(ticketData.status)}</div>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</h4>
                        <div className="mt-1">{getPriorityBadge(ticketData.priority)}</div>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</h4>
                        <p className="text-gray-900 dark:text-gray-100">{formatDate(ticketData.createdAt)}</p>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Updated</h4>
                        <p className="text-gray-900 dark:text-gray-100">{formatDate(ticketData.updatedAt)}</p>
                      </div>
                      
                      <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Assignee</h4>
                        <p className="text-gray-900 dark:text-gray-100">
                          {ticketData.assignedTo ? 
                            staffMembers.find(s => s.id === ticketData.assignedTo)?.name || 'Unknown Staff' 
                            : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                      <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">User Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Name</h4>
                          <p className="text-gray-900 dark:text-gray-100">{ticketData.userName}</p>
                        </div>
                        <div>
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</h4>
                          <p className="text-gray-900 dark:text-gray-100">{ticketData.userEmail}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">User ID</h4>
                          <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{ticketData.userId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                      <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Quick Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleStatusChange('open')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.status === 'open'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Mark as Open
                        </button>
                        <button
                          onClick={() => handleStatusChange('in_progress')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Mark as In Progress
                        </button>
                        <button
                          onClick={() => handleStatusChange('resolved')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.status === 'resolved'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => handleStatusChange('closed')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.status === 'closed'
                              ? 'bg-gray-100 text-gray-800 border border-gray-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Close Ticket
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                      <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Change Priority</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handlePriorityChange('low')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.priority === 'low'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Low
                        </button>
                        <button
                          onClick={() => handlePriorityChange('medium')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.priority === 'medium'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => handlePriorityChange('high')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.priority === 'high'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          High
                        </button>
                        <button
                          onClick={() => handlePriorityChange('urgent')}
                          className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                            ticketData.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Urgent
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* SLA Metrics */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">SLA Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">First Response Time</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {ticketData.responseTime ? `${ticketData.responseTime} mins` : 'N/A'}
                        </p>
                        <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              !ticketData.responseTime ? 'w-0' :
                              ticketData.responseTime < 30 ? 'bg-green-500 w-1/3' :
                              ticketData.responseTime < 60 ? 'bg-yellow-500 w-2/3' :
                              'bg-red-500 w-full'
                            }`} 
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Target: 30 mins
                        </p>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Resolution Time</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {ticketData.resolutionTime ? `${ticketData.resolutionTime} mins` : 'In Progress'}
                        </p>
                        <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              !ticketData.responseTime ? 'w-0' :
                              !ticketData.resolutionTime ? 'w-0' :
                              ticketData.resolutionTime < 240 ? 'bg-green-500 w-1/3' :
                              ticketData.resolutionTime < 480 ? 'bg-yellow-500 w-2/3' :
                              'bg-red-500 w-full'
                            }`} 
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Target: 4 hours
                        </p>
                      </div>
                      
                      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                        <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Messages</h4>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {(ticketData.messages || []).length}
                        </p>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="text-blue-500 font-medium">
                            {(ticketData.messages || []).filter((m: any) => m.sender === 'user').length} from user,{' '}
                          </span>
                          <span className="text-green-500 font-medium">
                            {(ticketData.messages || []).filter((m: any) => m.sender === 'support').length} from support
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ticket Timeline */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Ticket Timeline</h3>
                    <div className="border-l-2 border-gray-200 dark:border-neutral-800 ml-3">
                      {/* Ticket created event */}
                      <div className="relative mb-6">
                        <div className="absolute -left-3 mt-1.5 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="ml-6">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Ticket created</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ticketData.createdAt)}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {ticketData.userName} submitted a new ticket
                          </p>
                        </div>
                      </div>
                      
                      {/* Message events */}
                      {(ticketData.messages || []).map((message, index) => (
                        <div key={message.id} className="relative mb-6">
                          <div className={`absolute -left-3 mt-1.5 h-6 w-6 rounded-full ${
                            message.sender === 'support' ? 'bg-green-100' : 'bg-blue-100'
                          } flex items-center justify-center`}>
                            <MessageSquare className={`h-3 w-3 ${
                              message.sender === 'support' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="ml-6">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {message.sender === 'support' ? 'Support replied' : 'User replied'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.createdAt)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Status change events (simulated) */}
                      {ticketData.status !== 'open' && (
                        <div className="relative mb-6">
                          <div className="absolute -left-3 mt-1.5 h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                            <RefreshCw className="h-3 w-3 text-yellow-600" />
                          </div>
                                                  <div className="ml-6">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Status changed</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(new Date(new Date(ticketData.updatedAt).getTime() - 3600000).toISOString())}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Status changed to {ticketData.status.replace('_', ' ')}
                          </p>
                        </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Related Tickets (simulated) */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Related Tickets</h3>
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                      <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                        No related tickets found for this user
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
  </AnimatePresence>
  </div>
      </div>
    </div>
  );
};

// Create New Ticket modal component
const NewTicketModal = ({
  isOpen,
  onClose,
  onCreateTicket,
  staffMembers
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateTicket: (ticketData: Partial<Ticket>) => void;
  staffMembers: { id: string; name: string }[];
}) => {
  const [ticketData, setTicketData] = useState<Partial<Ticket>>({
    subject: '',
    description: '',
    category: 'account',
    priority: 'medium',
    assignedTo: '',
    status: 'open',
    messages: []
  });
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ✅ PHASE 2 OPTIMIZATION: Debounce user search to reduce database queries
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Load users from Supabase profiles table
  useEffect(() => {
    if (!isOpen) return;
    
    const loadUsers = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        // Map full_name to name for consistency with UI
        const mappedData = (data || []).map((user: any) => ({
          ...user,
          name: user.full_name
        }));
        setUsers(mappedData);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      }
    };
    
    loadUsers();
  }, [isOpen]);
  
  // Search for users with debounced query
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`)
          .order('full_name', { ascending: true })
          .limit(10);
        
        if (error) throw error;
        
        // Map full_name to name and filter out already selected users
        const mappedData = (data || []).map((user: any) => ({
          ...user,
          name: user.full_name
        }));
        const filtered = mappedData.filter(
          (user: any) => !selectedUsers.some(selected => selected.id === user.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    searchUsers();
  }, [debouncedSearchQuery, selectedUsers]);
  
  const handleSelectUser = (user: any) => {
    const newSelectedUsers = [...selectedUsers, user];
    setSelectedUsers(newSelectedUsers);
    
    // If first user, set as primary
    if (selectedUsers.length === 0) {
      setTicketData({
        ...ticketData,
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      });
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };
  
  const handleRemoveUser = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter(u => u.id !== userId);
    setSelectedUsers(newSelectedUsers);
    
    // If removing primary user, set next user as primary
    if (ticketData.userId === userId && newSelectedUsers.length > 0) {
      const nextUser = newSelectedUsers[0];
      setTicketData({
        ...ticketData,
        userId: nextUser.id,
        userName: nextUser.name,
        userEmail: nextUser.email
      });
    } else if (newSelectedUsers.length === 0) {
      setTicketData({
        ...ticketData,
        userId: undefined,
        userName: undefined,
        userEmail: undefined
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onCreateTicket({
        ...ticketData,
        id: `ticket_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
      
      // Reset form
      setSelectedUsers([]);
      setSearchQuery('');
      setTicketData({
        subject: '',
        description: '',
        category: 'account',
        priority: 'medium',
        assignedTo: '',
        status: 'open',
        messages: []
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-2xl w-full animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create New Support Ticket</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
              User(s) {selectedUsers.length > 1 && <span className="text-gray-500 text-xs">({selectedUsers.length} selected)</span>}
            </label>
            
            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map((user) => (
                  <span 
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Search Input */}
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                placeholder="Search users by name or email..."
              />
              
              {/* Search Results Dropdown */}
              {showResults && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-primary"></div>
                      <span className="ml-2">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <p className="mt-1 text-xs text-gray-500">
              Search and select one or more users for this ticket
            </p>
          </div>
          
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={ticketData.subject}
              onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
              placeholder="Brief description of the issue"
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={ticketData.category}
              onChange={(e) => setTicketData({...ticketData, category: e.target.value})}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
            >
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="events">Events</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={ticketData.priority}
              onChange={(e) => setTicketData({
                ...ticketData, 
                priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
              })}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assign To (Optional)
            </label>
            <select
              id="assignedTo"
              value={ticketData.assignedTo || ''}
              onChange={(e) => setTicketData({...ticketData, assignedTo: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={ticketData.description}
              onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
              required
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
              placeholder="Detailed description of the issue"
            ></textarea>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Knowledge Base Article Modal
const KBArticleModal = ({
  article,
  isNew = false,
  onClose,
  onSave,
  onDelete
}: {
  article?: KBArticle;
  isNew?: boolean;
  onClose: () => void;
  onSave: (article: KBArticle) => void;
  onDelete?: (id: string) => void;
}) => {
  const [articleData, setArticleData] = useState<KBArticle>(
    article || {
      id: `kb_${Date.now()}`,
      title: '',
      content: '',
      category: 'general',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      helpfulCount: 0,
      notHelpfulCount: 0
    }
  );
  const [tag, setTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  const handleAddTag = () => {
    if (!tag.trim()) return;
    if (!articleData.tags.includes(tag.trim())) {
      setArticleData({
        ...articleData,
        tags: [...articleData.tags, tag.trim()]
      });
    }
    setTag('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setArticleData({
      ...articleData,
      tags: articleData.tags.filter(t => t !== tagToRemove)
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave({
        ...articleData,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {isNew ? 'Create New Article' : 'Edit Article'}
            </h2>
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(articleData.id)}
                className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium cursor-pointer"
              >Delete</button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 max-h-[calc(90vh-8rem)]">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={articleData.title}
                onChange={(e) => setArticleData({...articleData, title: e.target.value})}
                required
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                placeholder="Article title"
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={articleData.category}
                onChange={(e) => setArticleData({...articleData, category: e.target.value})}
                required
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
              >
                <option value="general">General</option>
                <option value="account">Account Management</option>
                <option value="billing">Billing & Payments</option>
                <option value="events">Events</option>
                <option value="venues">Venues</option>
                <option value="technical">Technical Issues</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex items-center mb-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="ml-2 p-2 bg-black dark:bg-black text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {articleData.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="content"
                value={articleData.content}
                onChange={(e) => setArticleData({...articleData, content: e.target.value})}
                required
                rows={10}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary"
                placeholder="Write your article content here..."
              ></textarea>
              <p className="mt-2 text-xs text-gray-500">
                Supports plain text formatting. Use line breaks to separate paragraphs.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isNew ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? 'Create Article' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch(status) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Open
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Resolved
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <X className="w-3 h-3 mr-1" />
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
  }
};

// Priority badge component
const PriorityBadge = ({ priority }: { priority: string }) => {
  switch(priority) {
    case 'low':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Low
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Medium
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          High
        </span>
      );
    case 'urgent':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Urgent
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      );
  }
};

// Support Center Page component
export default function SupportCenterPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration
  useSessionManagement();
  
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'tickets' | 'knowledge' | 'templates'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ PHASE 2 OPTIMIZATION: Debounce ticket search to reduce unnecessary filtering
  const debouncedTicketSearchTerm = useDebounce(searchTerm, 300);
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [staffMembers, setStaffMembers] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load support agents from user_roles and profiles tables
  useEffect(() => {
    loadStaffMembers();
  }, []);

  const loadStaffMembers = async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Get users with support_agent or admin roles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'super_admin', 'support_agent']);
      
      if (error) throw error;
      
      const userIds = [...new Set(userRoles?.map((ur: any) => ur.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const agents = (profiles || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || p.email || p.id
        }));
        
        setStaffMembers(agents);
      }
    } catch (error) {
      console.error('Error loading staff members:', error);
    }
  };
  
  // Knowledge Base states
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KBArticle[]>([]);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCategoryFilter, setArticleCategoryFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  
  // Template states
  const [issueTemplates, setIssueTemplates] = useState<IssueTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<IssueTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<IssueTemplate | null>(null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  // Generic confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);
  
  // Load data on mount from Supabase
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTickets(),
        loadKnowledgeBase(),
        loadTemplates()
      ]);
    } catch (error) {
      console.error('Error loading support data:', error);
      toast.showError('Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      const data = await supportDatabaseService.getAllSupportTickets();
      // Ensure messages array exists
      const ticketsWithMessages = data.map(t => ({
        ...t,
        messages: t.messages || []
      }));
      setTickets(ticketsWithMessages);
      setFilteredTickets(ticketsWithMessages);
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.showError('Failed to load support tickets');
      setTickets([]);
      setFilteredTickets([]);
    }
  };
  
  const loadKnowledgeBase = async () => {
    try {
      const data = await supportDatabaseService.getAllKBArticles();
      setKbArticles(data);
      setFilteredArticles(data);
    } catch (error) {
      console.error("Error loading KB articles:", error);
      toast.showError('Failed to load knowledge base');
      setKbArticles([]);
      setFilteredArticles([]);
    }
  };
  
  const loadTemplates = async () => {
    try {
      const data = await supportDatabaseService.getAllIssueTemplates();
      setIssueTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.showError('Failed to load issue templates');
      setIssueTemplates([]);
      setFilteredTemplates([]);
    }
  };
  
  // Filter tickets when filters change
  useEffect(() => {
    let filtered = [...tickets];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }
    
    // Search term
    if (debouncedTicketSearchTerm) {
      const lowerCaseSearch = debouncedTicketSearchTerm.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.subject.toLowerCase().includes(lowerCaseSearch) ||
          ticket.description.toLowerCase().includes(lowerCaseSearch) ||
          ticket.userEmail.toLowerCase().includes(lowerCaseSearch) ||
          ticket.userName.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    // Sort by created date (newest first) and then by priority
    filtered.sort((a, b) => {
      // First sort by priority (urgent -> high -> medium -> low)
      const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const priorityComparison = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                               priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (priorityComparison !== 0) return priorityComparison;
      
      // Then sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    setFilteredTickets(filtered);
  }, [tickets, statusFilter, priorityFilter, categoryFilter, debouncedTicketSearchTerm]);
  
  // Filter KB articles when filters change
  useEffect(() => {
    let filtered = [...kbArticles];
    
    // Category filter
    if (articleCategoryFilter !== 'all') {
      filtered = filtered.filter(article => article.category === articleCategoryFilter);
    }
    
    // Search term
    if (articleSearch) {
      const lowerCaseSearch = articleSearch.toLowerCase();
      filtered = filtered.filter(
        article =>
          article.title.toLowerCase().includes(lowerCaseSearch) ||
          article.content.toLowerCase().includes(lowerCaseSearch) ||
          article.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Sort by most viewed and then by most recent
    filtered.sort((a, b) => {
      // First by views
      const viewsComparison = b.views - a.views;
      if (viewsComparison !== 0) return viewsComparison;
      
      // Then by date (newest first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    setFilteredArticles(filtered);
  }, [kbArticles, articleCategoryFilter, articleSearch]);
  
  // Filter templates when filters change
  useEffect(() => {
    let filtered = [...issueTemplates];
    
    // Category filter
    if (templateCategoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === templateCategoryFilter);
    }
    
    // Search term
    if (templateSearch) {
      const lowerCaseSearch = templateSearch.toLowerCase();
      filtered = filtered.filter(
        template =>
          template.title.toLowerCase().includes(lowerCaseSearch) ||
          template.description.toLowerCase().includes(lowerCaseSearch) ||
          template.suggestedResponse.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    // Sort alphabetically by title
    filtered.sort((a, b) => a.title.localeCompare(b.title));
    
    setFilteredTemplates(filtered);
  }, [issueTemplates, templateCategoryFilter, templateSearch]);
  
  // Update ticket in database and state
  const handleUpdateTicket = async (ticketId: string, updatedData: Partial<Ticket>) => {
    try {
      await supportDatabaseService.updateSupportTicket(ticketId, updatedData);
      
      // Update in state
      const updatedTickets = tickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, ...updatedData } : ticket
      );
      
      setTickets(updatedTickets);
      
      // If the selected ticket was updated, update it as well
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updatedData });
      }
      
      toast.showSuccess('Ticket updated successfully');
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.showError('Failed to update ticket');
    }
  };
  
  // Create a new ticket
  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      // Validate required fields
      if (!ticketData.subject || !ticketData.description || !ticketData.userId || 
          !ticketData.userName || !ticketData.userEmail || !ticketData.category) {
        toast.showError('Missing required ticket fields');
        return;
      }
      
      const newTicket = await supportDatabaseService.createSupportTicket({
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority || 'medium',
        category: ticketData.category,
        userId: ticketData.userId,
        userName: ticketData.userName,
        userEmail: ticketData.userEmail
      });
      
      // Add to state with messages array
      const ticketWithMessages = { ...newTicket, messages: [] };
      const updatedTickets = [ticketWithMessages, ...tickets];
      setTickets(updatedTickets);
      
      toast.showSuccess('Ticket created successfully');
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.showError('Failed to create ticket');
    }
  };
  
  // Save KB article
  const handleSaveKBArticle = async (article: KBArticle) => {
    const isNew = !kbArticles.some(a => a.id === article.id);
    
    try {
      if (isNew) {
        // Add new article - only pass required fields
        const newArticle = await supportDatabaseService.createKBArticle({
          title: article.title,
          content: article.content,
          category: article.category,
          tags: article.tags
        });
        const updatedArticles = [newArticle, ...kbArticles];
        setKbArticles(updatedArticles);
        toast.showSuccess('Knowledge base article created successfully');
      } else {
        // Update existing article - only pass updatable fields
        await supportDatabaseService.updateKBArticle(article.id, {
          title: article.title,
          content: article.content,
          category: article.category,
          tags: article.tags
        });
        const updatedArticles = kbArticles.map(a =>
          a.id === article.id ? { ...article } : a
        );
        setKbArticles(updatedArticles);
        toast.showSuccess('Knowledge base article updated successfully');
      }
    } catch (error) {
      console.error("Error saving KB article:", error);
      toast.showError('Failed to save knowledge base article');
    }
    
    // Close modal
    setShowNewArticleModal(false);
    setSelectedArticle(null);
  };
  
  // Delete KB article
  const handleDeleteKBArticle = async (articleId: string) => {
    try {
      await supportDatabaseService.deleteKBArticle(articleId);
      
      // Remove from state
      const updatedArticles = kbArticles.filter(a => a.id !== articleId);
      setKbArticles(updatedArticles);
      setSelectedArticle(null);
      
      toast.showSuccess('Knowledge base article deleted successfully');
    } catch (error) {
      console.error("Error deleting KB article:", error);
      toast.showError('Failed to delete knowledge base article');
    }
  };

  // Delete ticket (only allowed if closed/resolved)
  const handleDeleteTicket = async (ticketId: string) => {
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;
    if (!(target.status === 'closed' || target.status === 'resolved')) {
      toast.showError('Only resolved or closed tickets can be deleted');
      return;
    }
    
    try {
      await supportDatabaseService.deleteSupportTicket(ticketId);
      const updated = tickets.filter(t => t.id !== ticketId);
      setTickets(updated);
      setSelectedTicket(null);
      toast.showSuccess('Support ticket deleted successfully');
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.showError('Failed to delete ticket');
    }
  };
  
  // Get unique categories for filters
  const ticketCategories = Array.from(new Set(tickets.map(ticket => ticket.category)));
  const kbCategories = Array.from(new Set(kbArticles.map(article => article.category)));
  const templateCategories = Array.from(new Set(issueTemplates.map(template => template.category)));

  // Save / Delete templates ------------------------------------------------
  const handleSaveTemplate = async (template: IssueTemplate) => {
    const exists = issueTemplates.some(t => t.id === template.id);
    
    try {
      if (exists) {
        // Update existing template - only pass updatable fields
        await supportDatabaseService.updateIssueTemplate(template.id, {
          title: template.title,
          description: template.description,
          suggestedResponse: template.suggestedResponse,
          category: template.category
        });
        const updated = issueTemplates.map(t => t.id === template.id ? template : t);
        setIssueTemplates(updated);
        setFilteredTemplates(prev => prev.length ? prev.map(t => t.id === template.id ? template : t) : updated);
        toast.showSuccess('Template updated successfully');
      } else {
        // Create new template - only pass required fields
        const newTemplate = await supportDatabaseService.createIssueTemplate({
          title: template.title,
          description: template.description,
          suggestedResponse: template.suggestedResponse,
          category: template.category
        });
        const updated = [newTemplate, ...issueTemplates];
        setIssueTemplates(updated);
        setFilteredTemplates(updated);
        toast.showSuccess('Template created successfully');
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.showError('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await supportDatabaseService.deleteIssueTemplate(templateId);
      const updated = issueTemplates.filter(t => t.id !== templateId);
      setIssueTemplates(updated);
      setFilteredTemplates(updated);
      setSelectedTemplate(null);
      toast.showSuccess('Template deleted successfully');
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.showError('Failed to delete template');
    }
  };
  
  // Show loading spinner while fetching data
  if (loading) {
    return <PageLoader message="Loading support center..." fullHeight />;
  }
  
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support Center</h1>
        <RefreshButton 
          onRefresh={loadAllData}
          isLoading={loading}
          label="Refresh support data"
          className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
        />
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-1 shadow-sm flex space-x-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-black text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
            }`}
          >
            <LifeBuoy className="w-4 h-4 mr-2" />
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'knowledge'
                ? 'bg-black text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-black text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Response Templates
          </button>
        </div>
      </div>
      
      {/* Animated tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Tab content - Keep your existing tab content here but remove the wrapping divs with className="space-y-6" */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Filters and Actions */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:flex-grow">
                    {/* Status filter */}
                    <div className="relative">
                      <label htmlFor="statusFilter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        id="statusFilter"
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    
                    {/* Priority filter */}
                    <div className="relative">
                      <label htmlFor="priorityFilter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        id="priorityFilter"
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    {/* Category filter */}
                    <div className="relative">
                      <label htmlFor="categoryFilter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        id="categoryFilter"
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {ticketCategories.map((category) => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    </div>
                   
                  {/* Search input */}
                  <div className="relative md:max-w-xs w-full">
                    <label htmlFor="ticketSearch" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="ticketSearch"
                        placeholder="Search tickets..."
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Create new ticket button */}
                  <div className="mt-4 md:mt-0 flex gap-2">
                    <button
                      onClick={() => setShowNewTicketModal(true)}
                      className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center justify-center cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Create Ticket
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tickets table */}
              <div className="bg-white dark:bg-neutral-900 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
                {filteredTickets.length > 0 ? (
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                      <thead className="bg-gray-50 dark:bg-neutral-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Ticket
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Category
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Priority
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Created
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                        {filteredTickets.map((ticket) => (
                          <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{ticket.subject}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.userName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.userEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <PriorityBadge priority={ticket.priority} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={ticket.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {ticket.assignedTo ? 
                                staffMembers.find(s => s.id === ticket.assignedTo)?.name || ticket.assignedTo :
                                <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicket(ticket);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-800 transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/40"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">View</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <HelpCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-neutral-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tickets found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' ? 
                        'Try adjusting your search or filter parameters' : 
                        'Create a new ticket to get started'}
                    </p>
                    <div className="mt-6">
                        <button
                        onClick={() => setShowNewTicketModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black dark:bg-black hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none cursor-pointer"
                        >
                        <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                        Create Ticket
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              {/* Filters and Actions */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="relative md:flex-grow">
                    <label htmlFor="articleCategoryFilter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      id="articleCategoryFilter"
                      className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                      value={articleCategoryFilter}
                      onChange={(e) => setArticleCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {kbCategories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative md:w-1/3">
                    <label htmlFor="articleSearch" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="articleSearch"
                        placeholder="Search knowledge base..."
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={articleSearch}
                        onChange={(e) => setArticleSearch(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Create new article button */}
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={() => setShowNewArticleModal(true)}
                      className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center justify-center cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Create Article
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Knowledge Base Articles */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.length > 0 ? (
                  filteredArticles.map((article) => (
                    <div 
                      key={article.id} 
                      className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {article.category}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Eye className="h-3 w-3" />
                            {article.views}
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                          {article.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {article.tags.slice(0, 3).map((tag) => (
                              <span 
                                key={tag} 
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {article.tags.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 rounded-full">
                                +{article.tags.length - 3}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {article.helpfulCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <X className="h-3 w-3 text-red-500" />
                              {article.notHelpfulCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 lg:col-span-3 p-8 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-neutral-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No articles found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {articleSearch || articleCategoryFilter !== 'all' ? 
                        'Try adjusting your search or filter parameters' : 
                        'Create your first knowledge base article to get started'}
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowNewArticleModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black dark:bg-black hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none cursor-pointer"
                      >
                        <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                        Create Article
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Filters and Actions */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="relative md:flex-grow">
                    <label htmlFor="templateCategoryFilter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      id="templateCategoryFilter"
                      className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                      value={templateCategoryFilter}
                      onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {templateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative md:w-1/3">
                    <label htmlFor="templateSearch" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="templateSearch"
                        placeholder="Search templates..."
                        className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Create new template button */}
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={() => setShowNewTemplateModal(true)}
                      className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center justify-center cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Create Template
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Templates Table */}
              <div className="bg-white dark:bg-neutral-900 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
                {filteredTemplates.length > 0 ? (
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                      <thead className="bg-gray-50 dark:bg-neutral-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Category
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                        {filteredTemplates.map((template) => (
                          <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{template.title}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{template.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); }}
                                  className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
                                >Edit</button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(template.suggestedResponse);
                                    toast.showSuccess('Copied', 'Template copied to clipboard');
                                  }}
                                  className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400"
                                >Copy</button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmState({
                                      open: true,
                                      title: 'Delete Template',
                                      message: 'This template will be permanently removed.\nAre you sure you want to continue?',
                                      confirmLabel: 'Delete',
                                      destructive: true,
                                      onConfirm: () => { handleDeleteTemplate(template.id); setConfirmState(null); }
                                    });
                                  }}
                                  className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400"
                                >Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-neutral-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No templates found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {templateSearch || templateCategoryFilter !== 'all' ? 
                        'Try adjusting your search or filter parameters' : 
                        'Create a new template to get started'}
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowNewTemplateModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black dark:bg-black hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none cursor-pointer"
                      >
                        <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                        Create Template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showNewTicketModal && (
        <NewTicketModal
          isOpen={showNewTicketModal}
          onClose={() => setShowNewTicketModal(false)}
          onCreateTicket={handleCreateTicket}
          staffMembers={staffMembers}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateTicket={handleUpdateTicket}
          staffMembers={staffMembers}
          onDeleteTicket={(id) => setConfirmState({
            open: true,
            title: 'Delete Ticket',
            message: 'Deleting a ticket is irreversible.\nOnly closed or resolved tickets should be deleted. Continue?',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: () => { handleDeleteTicket(id); setConfirmState(null); }
          })}
        />
      )}

      {showNewArticleModal && (
        <KBArticleModal
          isNew
            onClose={() => setShowNewArticleModal(false)}
          onSave={handleSaveKBArticle}
        />
      )}

      {selectedArticle && (
        <KBArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onSave={handleSaveKBArticle}
          onDelete={(id) => setConfirmState({
            open: true,
            title: 'Delete Article',
            message: 'This knowledge base article will be permanently removed. Continue?',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: () => { handleDeleteKBArticle(id); setConfirmState(null); }
          })}
        />
      )}

      {showNewTemplateModal && (
        <TemplateModal
          isNew
          onClose={() => setShowNewTemplateModal(false)}
          onSave={handleSaveTemplate}
        />
      )}

      {selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Global confirmation modal */}
      <ConfirmationModal
        open={!!confirmState?.open}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={confirmState?.onConfirm || (() => {})}
        onCancel={() => setConfirmState(null)}
        destructive={confirmState?.destructive}
      />
    </div>
  );
}