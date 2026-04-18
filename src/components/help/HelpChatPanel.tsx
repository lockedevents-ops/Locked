"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ChevronRight, Search, HelpCircle, Plus, Trash2, MessageSquare, MapPin, Calendar, ExternalLink, Ticket, Lock, User, Key } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { chatbotHistoryService, ChatConversation, ChatMessage as DBChatMessage } from '@/services/chatbotHistoryService';
import { generateResponse, ChatAction, detectOrderQuery } from '@/data/chatbotKnowledge';
import { chatbotEventService, EventSearchResult } from '@/services/chatbotEventService';
import { chatbotUserContextService, detectContextQuery, UserContextData, ContextQueryResult } from '@/services/chatbotUserContextService';
import { chatbotOrderService, OrderData, TicketData } from '@/services/chatbotOrderService';
import { conversationContextService, ConversationContext, isFollowUpQuestion } from '@/services/chatbotConversationContext';
import { EventData } from '@/services/sharedEventService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  suggestions?: string[];
  events?: EventData[];  // Phase 1.1: Event search results
  actions?: ChatAction[]; // Phase 1.3: Navigation actions
  contextType?: 'tickets' | 'locked_events' | 'role' | 'keys' | 'organizer_stats' | 'account_info'; // Phase 1.2: User context response type
  userContext?: UserContextData; // Phase 1.2: User context data for rendering
  orders?: OrderData[]; // Phase 2.2: Order data
  tickets?: TicketData[]; // Phase 2.2: Ticket data
}

interface HelpChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorSide?: 'left' | 'right';
}

export function HelpChatPanel({ isOpen, onClose, anchorSide = 'right' }: HelpChatPanelProps) {
  const { user, roles } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'quicklinks' | 'chat'>('quicklinks');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat history state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  
  // Phase 1.2: User context state
  const [userContext, setUserContext] = useState<UserContextData | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // Phase 2.1: Organizer state
  const isOrganizer = roles?.includes('organizer') ?? false;

  // Reliable unique id generator to avoid duplicate React keys (even on rapid sends)
  const uid = () => {
    // Prefer crypto.randomUUID when available for guaranteed uniqueness
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      try { return crypto.randomUUID(); } catch { /* fallthrough */ }
    }
    // Fallback: timestamp + random segment
    return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  };

  // Handle navigation action clicks
  const handleActionClick = (action: ChatAction) => {
    if (action.type === 'navigate') {
      onClose();
      router.push(action.target);
    } else if (action.type === 'external_link') {
      window.open(action.target, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'copy') {
      navigator.clipboard.writeText(action.target);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations for authenticated users
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const convs = await chatbotHistoryService.getConversations(user.id);
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Load messages for a specific conversation
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const msgs = await chatbotHistoryService.loadMessages(user.id, conversationId);
      const formattedMessages: Message[] = msgs.map(m => ({
        id: m.id,
        text: m.message_text,
        sender: m.sender as 'user' | 'support',
        timestamp: new Date(m.created_at),
        suggestions: m.metadata?.suggestions
      }));
      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setShowConversationList(false);
      setHasGreeted(true); // Skip greeting for existing conversations
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Create a new conversation
  const createNewConversation = useCallback(async () => {
    if (!user?.id) {
      // For unauthenticated users, just reset messages
      setMessages([]);
      setHasGreeted(false);
      setCurrentConversationId(null);
      return;
    }
    
    try {
      const canCreate = await chatbotHistoryService.canCreateConversation(user.id);
      if (!canCreate) {
        // Show error - max 5 conversations
        setMessages(prev => [...prev, {
          id: uid(),
          text: "You've reached the maximum of 5 conversations. Please delete an existing one to start a new chat.",
          sender: 'support',
          timestamp: new Date()
        }]);
        return;
      }
      
      const newConvId = await chatbotHistoryService.createConversation(user.id);
      if (newConvId) {
        // Phase 1.4: Clear conversation context for new conversation
        if (currentConversationId) {
          conversationContextService.clearContext(currentConversationId);
        }
        
        setCurrentConversationId(newConvId);
        setMessages([]);
        setHasGreeted(false);
        setShowConversationList(false);
        await loadConversations();
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, [user?.id, loadConversations, currentConversationId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    try {
      const success = await chatbotHistoryService.deleteConversation(user.id, conversationId);
      if (success) {
        // Phase 1.4: Clear conversation context
        conversationContextService.clearContext(conversationId);
        
        await loadConversations();
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
          setHasGreeted(false);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [user?.id, currentConversationId, loadConversations]);

  // Phase 1.2: Load user context when panel opens for authenticated users
  const loadUserContext = useCallback(async () => {
    if (!user?.id) {
      setUserContext(null);
      return;
    }
    setIsLoadingContext(true);
    try {
      const context = await chatbotUserContextService.getUserContext(user.id);
      setUserContext(context);
    } catch (err) {
      console.error('Failed to load user context:', err);
    } finally {
      setIsLoadingContext(false);
    }
  }, [user?.id]);

  // Load conversations when panel opens for authenticated users
  useEffect(() => {
    if (isOpen && user?.id) {
      loadConversations();
      loadUserContext(); // Phase 1.2: Also load user context
    }
  }, [isOpen, user?.id, loadConversations]);

  // On first open, stage greeting sequence and create conversation for authenticated users
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      
      // Auto-create conversation for authenticated users
      const initConversation = async () => {
        if (user?.id && !currentConversationId) {
          const newConvId = await chatbotHistoryService.createConversation(user.id);
          if (newConvId) {
            setCurrentConversationId(newConvId);
          }
        }
      };
      initConversation();
      
      // Load user context first, then show greeting with name
      const showGreeting = async () => {
        let name: string | undefined;
        
        // For authenticated users, fetch context to get name
        if (user?.id) {
          try {
            const context = await chatbotUserContextService.getUserContext(user.id);
            setUserContext(context);
            name = context?.userName;
          } catch (err) {
            console.error('Failed to load user context for greeting:', err);
          }
        }
        
        // Step 1: waving intro with personalization if we have name
        const greetingText = name 
          ? `👋 Hi ${name}! I'm Lockey — your personal assistant on the Locked platform.`
          : "👋 Hi! I'm Lockey — your personal assistant on the Locked platform.";
        
        setMessages([
          { id: uid(), text: greetingText, sender: 'support', timestamp: new Date() }
        ]);
        
        // Step 2: follow-up prompt
        setTimeout(() => {
          setMessages(prev => [...prev, { id: uid(), text: 'How can I help you today?', sender: 'support', timestamp: new Date() }]);
        }, 1200);
      };
      
      showGreeting();
    }
  }, [isOpen, hasGreeted, user?.id, currentConversationId]);

  // Prevent background scroll while panel is open (locks page even when mobile keyboard is visible)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const prevBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.position = prevBodyStyle.position;
      document.body.style.top = prevBodyStyle.top;
      document.body.style.width = prevBodyStyle.width;
      document.body.style.overflow = prevBodyStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when chat tab opens
  useEffect(() => {
    if (isOpen && activeTab === 'chat' && typeof window !== 'undefined' && window.innerWidth >= 768) {
      inputRef.current?.focus();
    }
  }, [isOpen, activeTab]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessageText = input.trim();
    
    // Phase 1.4: Get conversation context ID (use currentConversationId or generate temporary one)
    const contextId = currentConversationId || `temp-${user?.id || 'anon'}-${Date.now()}`;
    
    // Phase 1.4: Add user message to conversation context and get expanded query
    const { expandedQuery, context: convContext } = conversationContextService.expandQuery(contextId, userMessageText);
    conversationContextService.addMessage(contextId, {
      id: uid(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    });
    
    // Add user message
    const userMessage: Message = {
      id: uid(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Save user message to database if authenticated
    if (user?.id && currentConversationId) {
      await chatbotHistoryService.saveMessage({
        userId: user.id,
        conversationId: currentConversationId,
        messageText: userMessageText,
        sender: 'user'
      });
    }
    
    // Phase 1.4: Use expanded query for detection if it's a follow-up
    const queryForDetection = isFollowUpQuestion(userMessageText) ? expandedQuery : userMessageText;
    
    // Phase 2.2: Check for order/ticket status queries
    const orderQuery = detectOrderQuery(queryForDetection);
    
    if (orderQuery.isOrderQuery) {
      // Handle order/ticket queries
      if (!user?.id) {
        // User not authenticated - prompt to sign in
        const supportMessage: Message = {
          id: uid(),
          text: "I'd love to help you check your orders and tickets! Please sign in to access this information.",
          sender: 'support',
          timestamp: new Date(),
          suggestions: ['How do I sign in?', 'Create an account'],
          actions: [
            { type: 'navigate', label: 'Sign In', target: '/auth/login', icon: '🔐' },
            { type: 'navigate', label: 'Create Account', target: '/auth/signup', icon: '✨' }
          ]
        };
        
        setMessages(prev => [...prev, supportMessage]);
        setIsTyping(false);
        
        if (currentConversationId) {
          await chatbotHistoryService.saveMessage({
            userId: user?.id || '',
            conversationId: currentConversationId,
            messageText: supportMessage.text,
            sender: 'support'
          });
        }
        return;
      }

      // User is authenticated - fetch order data
      try {
        let orders: OrderData[] = [];
        let tickets: TicketData[] = [];
        let responseText = '';

        switch (orderQuery.queryType) {
          case 'last_order':
            const lastOrder = await chatbotOrderService.getLastOrder(user.id);
            if (lastOrder) {
              orders = [lastOrder];
              responseText = `Here's your most recent order:`;
            } else {
              responseText = `You don't have any orders yet. Start by finding and booking an event!`;
            }
            break;

          case 'check_order':
            const orderResult = await chatbotOrderService.getUserOrders(user.id, orderQuery.eventName);
            if (orderResult.found) {
              orders = orderResult.orders;
              responseText = orderResult.message;
            } else {
              responseText = orderResult.message || 'No orders found. Check an event to purchase tickets!';
            }
            break;

          case 'check_ticket':
            const ticketResult = await chatbotOrderService.getUserOrders(user.id, orderQuery.eventName);
            if (ticketResult.found) {
              tickets = ticketResult.tickets;
              orders = ticketResult.orders;
              responseText = ticketResult.message;
            } else {
              responseText = ticketResult.message || 'No tickets found.';
            }
            break;

          case 'payment_status':
            const paymentOrders = await chatbotOrderService.getUserOrders(user.id);
            orders = paymentOrders.orders.slice(0, 5); // Show recent orders
            if (orders.length > 0) {
              responseText = `Here's your recent payment status:`;
            } else {
              responseText = `You haven't made any purchases yet.`;
            }
            break;

          case 'upcoming_tickets':
            tickets = await chatbotOrderService.getUpcomingTickets(user.id);
            if (tickets.length > 0) {
              responseText = `Here are your upcoming tickets:`;
            } else {
              responseText = `You don't have any upcoming tickets. Browse events and get tickets for your next experience!`;
            }
            break;
        }

        // Build action buttons
        const actions: ChatAction[] = [
          { type: 'navigate', label: 'View All Tickets', target: '/dashboards/user/tickets', icon: '🎫' },
          { type: 'navigate', label: 'Browse Events', target: '/pages/discover', icon: '🔍' }
        ];

        // Phase 1.4: Get follow-up suggestions
        const contextSuggestions = conversationContextService.getSuggestedFollowUps(contextId);

        const supportMessage: Message = {
          id: uid(),
          text: responseText,
          sender: 'support',
          timestamp: new Date(),
          suggestions: contextSuggestions.slice(0, 2),
          actions,
          orders: orders.length > 0 ? orders : undefined,
          tickets: tickets.length > 0 ? tickets : undefined
        };

        // Add to context
        conversationContextService.addMessage(contextId, {
          id: supportMessage.id,
          text: responseText,
          sender: 'support',
          timestamp: supportMessage.timestamp
        });

        setMessages(prev => [...prev, supportMessage]);
        setIsTyping(false);

        if (currentConversationId) {
          await chatbotHistoryService.saveMessage({
            userId: user.id,
            conversationId: currentConversationId,
            messageText: responseText,
            sender: 'support'
          });
        }
        return;
      } catch (error) {
        console.error('Error fetching order data:', error);
        const errorMessage: Message = {
          id: uid(),
          text: 'Sorry, I had trouble fetching your order information. Please try again or contact support.',
          sender: 'support',
          timestamp: new Date(),
          suggestions: ['Contact support', 'Check back later'],
          actions: [{ type: 'navigate', label: 'Contact Support', target: '/pages/help/contact', icon: '💬' }]
        };

        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
        return;
      }
    }
    
    // Phase 1.2: Check for user context queries (requires authentication)
    // Phase 1.4: Use expanded query for better follow-up detection
    const contextQuery = detectContextQuery(queryForDetection);
    
    if (contextQuery.isContextQuery && contextQuery.type !== 'none') {
      // Handle user context queries
      if (!user?.id) {
        // User not authenticated - prompt to sign in
        const supportMessage: Message = {
          id: uid(),
          text: "I'd love to help you with that! To access your personal information like tickets, locked events, or account details, please sign in first.",
          sender: 'support',
          timestamp: new Date(),
          suggestions: ['How do I sign in?', 'Create an account'],
          actions: [
            { type: 'navigate', label: 'Sign In', target: '/auth/login', icon: '🔐' },
            { type: 'navigate', label: 'Create Account', target: '/auth/signup', icon: '✨' }
          ]
        };
        
        setMessages(prev => [...prev, supportMessage]);
        setIsTyping(false);
        
        // Save bot response
        if (currentConversationId) {
          await chatbotHistoryService.saveMessage({
            userId: user?.id || '',
            conversationId: currentConversationId,
            messageText: supportMessage.text,
            sender: 'support'
          });
        }
        return;
      }
      
      // User is authenticated - fetch context and generate response
      try {
        // Refresh context if needed
        let ctx = userContext;
        if (!ctx) {
          ctx = await chatbotUserContextService.getUserContext(user.id);
          setUserContext(ctx);
        }
        
        if (ctx) {
          const contextResponse = chatbotUserContextService.generateContextResponse(contextQuery.type, ctx);
          
          // Build actions based on query type
          const actions: ChatAction[] = [];
          if (contextQuery.type === 'tickets') {
            actions.push({ type: 'navigate', label: 'View All Tickets', target: '/dashboard/tickets', icon: '🎫' });
          } else if (contextQuery.type === 'locked_events') {
            actions.push({ type: 'navigate', label: 'View Locked Events', target: '/dashboard/locks', icon: '🔐' });
          } else if (contextQuery.type === 'organizer_stats') {
            actions.push({ type: 'navigate', label: 'Organizer Dashboard', target: '/organizers/dashboard', icon: '📊' });
          } else if (contextQuery.type === 'account_info' || contextQuery.type === 'role') {
            actions.push({ type: 'navigate', label: 'My Profile', target: '/profile', icon: '👤' });
          } else if (contextQuery.type === 'keys') {
            actions.push({ type: 'navigate', label: 'KEYS Dashboard', target: '/dashboard/keys', icon: '🔑' });
          }
          
          // Phase 1.4: Get context-aware follow-up suggestions
          const contextSuggestions = conversationContextService.getSuggestedFollowUps(contextId);
          
          const supportMessage: Message = {
            id: uid(),
            text: contextResponse.response,
            sender: 'support',
            timestamp: new Date(),
            suggestions: contextSuggestions.slice(0, 3),
            actions,
            contextType: contextQuery.type,
            userContext: ctx
          };
          
          // Phase 1.4: Add bot response to context
          conversationContextService.addMessage(contextId, {
            id: supportMessage.id,
            text: contextResponse.response,
            sender: 'support',
            timestamp: supportMessage.timestamp
          });
          
          setMessages(prev => [...prev, supportMessage]);
          setIsTyping(false);
          
          // Save bot response
          if (currentConversationId) {
            await chatbotHistoryService.saveMessage({
              userId: user.id,
              conversationId: currentConversationId,
              messageText: contextResponse.response,
              sender: 'support',
              metadata: { 
                suggestions: supportMessage.suggestions,
                contextType: contextQuery.type,
                isContextQuery: true
              }
            });
          }
          return;
        }
      } catch (error) {
        console.error('User context query error:', error);
      }
    }
    
    // Check for event search intent
    // Phase 1.4: Use expanded query for better follow-up detection
    const intent = chatbotEventService.parseIntent(queryForDetection);
    
    if (intent.isEventSearch && intent.confidence >= 0.2) {
      // Handle event search
      try {
        const searchResult = await chatbotEventService.search(intent.searchParams);
        
        let responseText = searchResult.searchDescription;
        if (searchResult.events.length > 0) {
          responseText += ' Here are some options:';
        } else {
          responseText += ' Try browsing our discover page for more events.';
        }
        
        // Phase 1.4: Get context-aware suggestions
        const contextSuggestions = conversationContextService.getSuggestedFollowUps(contextId);
        
        const supportMessage: Message = {
          id: uid(),
          text: responseText,
          sender: 'support',
          timestamp: new Date(),
          suggestions: (searchResult.suggestions && searchResult.suggestions.length > 0) ? searchResult.suggestions : contextSuggestions.slice(0, 3),
          events: searchResult.events.length > 0 ? searchResult.events : undefined,
          actions: searchResult.events.length === 0 
            ? [{ type: 'navigate', label: 'Browse All Events', target: '/pages/discover', icon: '🔍' }]
            : [{ type: 'navigate', label: 'See More Events', target: '/pages/discover', icon: '🔍' }]
        };
        
        // Phase 1.4: Add bot response to context
        conversationContextService.addMessage(contextId, {
          id: supportMessage.id,
          text: responseText,
          sender: 'support',
          timestamp: supportMessage.timestamp
        });
        
        setMessages(prev => [...prev, supportMessage]);
        setIsTyping(false);
        
        // Save bot response to database
        if (user?.id && currentConversationId) {
          await chatbotHistoryService.saveMessage({
            userId: user.id,
            conversationId: currentConversationId,
            messageText: responseText,
            sender: 'support',
            metadata: { 
              suggestions: searchResult.suggestions,
              events: searchResult.events,
              isEventSearch: true
            }
          });
        }
        return;
      } catch (error) {
        console.error('Event search error:', error);
      }
    }
    
    // Generate intelligent response using knowledge base
    setTimeout(async () => {
      // Phase 1.4: Use expanded query for knowledge base lookup
      // Phase 2.1: Pass organizer status for organizer-specific help
      // Phase 2.2: Pass user name for personalization
      const response = generateResponse(queryForDetection, isOrganizer, userContext?.userName);
      
      // Handle event search flag from knowledge base (backup check)
      if (response.isEventSearch) {
        try {
          const searchResult = await chatbotEventService.search({ query: queryForDetection, limit: 5 });
          
          const supportMessage: Message = {
            id: uid(),
            text: searchResult.searchDescription + (searchResult.events.length > 0 ? ' Here are some options:' : ''),
            sender: 'support',
            timestamp: new Date(),
            suggestions: searchResult.suggestions,
            events: searchResult.events.length > 0 ? searchResult.events : undefined,
            actions: [{ type: 'navigate', label: 'Browse All Events', target: '/pages/discover', icon: '🔍' }]
          };
          
          // Phase 1.4: Add bot response to context
          conversationContextService.addMessage(contextId, {
            id: supportMessage.id,
            text: searchResult.searchDescription,
            sender: 'support',
            timestamp: supportMessage.timestamp
          });
          
          setMessages(prev => [...prev, supportMessage]);
          setIsTyping(false);
          return;
        } catch (error) {
          console.error('Event search error:', error);
        }
      }
      
      // Phase 1.4: Get context-aware suggestions if response has none
      const contextSuggestions = conversationContextService.getSuggestedFollowUps(contextId);
      const finalSuggestions = response.suggestions && response.suggestions.length > 0 
        ? response.suggestions 
        : contextSuggestions.slice(0, 3);
      
      const supportMessage: Message = {
        id: uid(),
        text: response.answer,
        sender: 'support',
        timestamp: new Date(),
        suggestions: finalSuggestions,
        actions: response.actions
      };
      
      // Phase 1.4: Add bot response to context
      conversationContextService.addMessage(contextId, {
        id: supportMessage.id,
        text: response.answer,
        sender: 'support',
        timestamp: supportMessage.timestamp
      });
      
      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
      
      // Save bot response to database if authenticated
      if (user?.id && currentConversationId) {
        await chatbotHistoryService.saveMessage({
          userId: user.id,
          conversationId: currentConversationId,
          messageText: response.answer,
          sender: 'support',
          metadata: { suggestions: finalSuggestions }
        });
      }
    }, 1200);
  };

  // Handle clicking a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Help categories
  const helpCategories = [
    { 
      name: "Account Help", 
      path: "/pages/help/account",
      description: "Manage your profile, security settings, and account access",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      name: "Event Booking", 
      path: "/pages/guides/booking", 
      description: "Learn how to find and book events",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) 
    },
    { 
      name: "Event Hosting", 
      path: "/pages/guides/hosting", 
      description: "Tips for creating and managing your events",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) 
    },
    { 
      name: "Voting Guide", 
      path: "/pages/guides/voting", 
      description: "How to vote in events and competitions",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) 
    },
    { 
      name: "FAQs", 
      path: "/pages/help/faqs", 
      description: "Find answers to commonly asked questions",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) 
    },
    { 
      name: "Contact Us", 
      path: "/pages/help/contact", 
      description: "Get in touch with our support team",
      icon: (
        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ) 
    },
  ];

  // Common questions
  const commonQuestions = [
    "How do I reset my password?",
    "Where can I find my tickets?",
    "How do I become an event organizer?",
    "How do I get a refund?",
    "Where can I see my purchase history?"
  ];

  // Filtered help categories
  const filteredCategories = helpCategories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="help-chat-root">
          <motion.div
            key="help-chat-overlay"
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            key="help-chat-panel"
            className={`fixed inset-y-0 ${anchorSide === 'left' ? 'left-0' : 'right-0'} z-[101] w-full sm:w-[24rem] md:w-[28rem] lg:w-[30rem]`}
            initial={{ x: anchorSide === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: anchorSide === 'left' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="h-full backdrop-blur-md bg-gradient-to-b from-white/95 to-white/85 dark:from-neutral-900/95 dark:to-neutral-900/85 border-l border-neutral-200/70 dark:border-neutral-800/50 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="relative flex items-center justify-between p-6 border-b border-neutral-100 bg-white text-neutral-900">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm ring-1 ring-neutral-200">
                      <Image src="/avatars/avatar-3.png" alt="Locked" width={40} height={40} className="object-cover" />
                    </div>
                    <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Lockey</h3>
                      <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">Online</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">Your virtual assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="hidden sm:inline">Powered by Locked</span>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
                    aria-label="Close help panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-5 pt-3">
                <div
                  className="relative grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white text-xs font-semibold shadow-sm"
                  role="tablist"
                  aria-label="Help panel tabs"
                >
                  <motion.div
                    layout
                    className="absolute inset-y-0 left-0 w-1/2 rounded-lg bg-neutral-900"
                    animate={{ x: activeTab === 'quicklinks' ? '0%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    aria-hidden
                  />
                  <button
                    role="tab"
                    aria-selected={activeTab === 'quicklinks'}
                    className={`relative z-10 py-2.5 px-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 ${activeTab === 'quicklinks' ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                    onClick={() => setActiveTab('quicklinks')}
                  >Guide</button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'chat'}
                    className={`relative z-10 py-2.5 px-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 ${activeTab === 'chat' ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                    onClick={() => setActiveTab('chat')}
                  >Live Chat</button>
                </div>
              </div>

              {activeTab === 'quicklinks' ? (
                <div className="overflow-y-auto flex-1 px-5 pb-6 pt-4 custom-scrollbar space-y-6">
                  <div className="space-y-3">
                    <label className="relative block group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search how-tos, billing, hosting, voting"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border border-neutral-200/70 focus:outline-none focus:ring-0 focus:border-primary/40 text-base md:text-sm placeholder:text-neutral-400 shadow-sm"
                      />
                    </label>
                    {searchQuery && (
                      <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                        <span>{filteredCategories.length} result{filteredCategories.length !== 1 && 's'}</span>
                        <button onClick={() => setSearchQuery('')} className="text-primary hover:underline cursor-pointer">Clear</button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-neutral-200/80 bg-white/90 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">Popular right now</p>
                        <p className="text-sm text-neutral-700">Quick answers to frequent questions</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {commonQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setActiveTab('chat'); setInput(q); }}
                          className="text-left text-xs px-3 py-2 rounded-full bg-neutral-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-neutral-200"
                        >{q}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold tracking-wide text-neutral-600">Browse help guides</h4>
                      <Link href="/pages/help/faqs" onClick={onClose} className="text-xs text-primary hover:underline cursor-pointer">View all</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredCategories.map(cat => (
                        <Link
                          key={cat.path}
                          href={cat.path}
                          onClick={onClose}
                          className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer p-3 flex gap-3"
                        >
                          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                            {cat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-neutral-800 truncate">{cat.name}</div>
                            <div className="text-[12px] text-neutral-500 line-clamp-2">{cat.description}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-colors self-center" />
                        </Link>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="col-span-full p-4 text-xs bg-white/80 border border-neutral-200 rounded-lg text-neutral-500">No help guides match your search.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-primary/5 to-accent/5 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Need a human?</p>
                      <p className="text-xs text-neutral-600">Message support or book a 15-min onboarding call.</p>
                    </div>
                    <Link
                      href="/pages/help/contact"
                      onClick={onClose}
                      className="text-xs font-semibold text-white bg-primary px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                    >Contact</Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Conversation History Bar for Authenticated Users */}
                  {user && (
                    <div className="px-5 py-2 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                      <button
                        onClick={() => setShowConversationList(!showConversationList)}
                        className="text-xs text-neutral-600 hover:text-primary flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {conversations.length} chat{conversations.length !== 1 ? 's' : ''} saved
                      </button>
                      <button
                        onClick={createNewConversation}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New chat
                      </button>
                    </div>
                  )}
                  
                  {/* Conversation List Dropdown */}
                  {showConversationList && user && (
                    <div className="px-5 py-3 border-b border-neutral-100 bg-white max-h-48 overflow-y-auto">
                      {isLoadingHistory ? (
                        <div className="text-xs text-neutral-500 text-center py-2">Loading...</div>
                      ) : conversations.length === 0 ? (
                        <div className="text-xs text-neutral-500 text-center py-2">No saved conversations yet</div>
                      ) : (
                        <div className="space-y-1">
                          {conversations.map(conv => (
                            <div
                              key={conv.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                currentConversationId === conv.id 
                                  ? 'bg-primary/10 border border-primary/20' 
                                  : 'hover:bg-neutral-100'
                              }`}
                              onClick={() => loadConversationMessages(conv.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-neutral-800 truncate">{conv.title}</p>
                                <p className="text-[10px] text-neutral-500">{conv.message_count} messages</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this conversation?')) {
                                    deleteConversation(conv.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-100 rounded text-neutral-400 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1 px-5 py-4 overflow-y-auto space-y-4 custom-scrollbar">
                    {messages.length === 0 && !isTyping && (
                      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-4 text-sm text-neutral-600">
                        Say hi to get started or pick a quick question above.
                      </div>
                    )}
                    {messages.map(m => (
                      <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.sender === 'user' ? 'bg-black text-white rounded-br-sm' : 'bg-white/95 backdrop-blur border border-neutral-200 rounded-bl-sm text-neutral-900'}`}>
                          {m.sender === 'support' && (
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-primary">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                              Lockey
                            </div>
                          )}
                          <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                          <span className={`mt-2 block text-[10px] tracking-wide ${m.sender === 'user' ? 'text-white/70' : 'text-neutral-500'}`}>{formatTime(m.timestamp)}</span>
                        </div>
                        
                        {/* Event Cards - Phase 1.1 */}
                        {m.sender === 'support' && m.events && m.events.length > 0 && (
                          <div className="mt-2 space-y-2 max-w-[90%]">
                            {m.events.slice(0, 3).map((event) => (
                              <Link
                                key={event.id}
                                href={`/events/${event.slug || event.id}`}
                                onClick={onClose}
                                className="block rounded-xl border border-neutral-200 bg-white hover:border-primary/30 hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                              >
                                <div className="flex gap-3 p-2.5">
                                  {/* Event Image */}
                                  {event.imageUrl && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                                      <Image
                                        src={event.imageUrl}
                                        alt={event.title}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-semibold text-neutral-900 truncate group-hover:text-primary transition-colors">
                                      {event.title}
                                    </h4>
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                                      <Calendar className="w-3 h-3" />
                                      <span>{new Date(event.startDate || event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                      {event.time && <span>• {event.time}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-neutral-500">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate">{event.venue || event.location || 'Online'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-semibold text-primary">{event.price || 'Free'}</span>
                                      {event.hasVoting && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">🗳️ Voting</span>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary self-center flex-shrink-0" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        
                        {/* User Context Cards - Phase 1.2 */}
                        {m.sender === 'support' && m.contextType && m.userContext && (
                          <div className="mt-2 max-w-[90%]">
                            {/* Tickets Context */}
                            {m.contextType === 'tickets' && m.userContext.upcomingTickets.length > 0 && (
                              <div className="space-y-2">
                                {m.userContext.upcomingTickets.slice(0, 3).map((ticket) => (
                                  <Link
                                    key={ticket.eventId}
                                    href={`/events/${ticket.eventId}`}
                                    onClick={onClose}
                                    className="block rounded-xl border border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                                  >
                                    <div className="flex gap-3 p-2.5">
                                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <Ticket className="w-5 h-5 text-emerald-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-semibold text-neutral-900 truncate group-hover:text-emerald-600 transition-colors">
                                          {ticket.eventTitle}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                                          <Calendar className="w-3 h-3" />
                                          <span>{new Date(ticket.eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                            {ticket.ticketType}
                                          </span>
                                          <span className="text-[10px] text-neutral-500">×{ticket.quantity}</span>
                                        </div>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-emerald-600 self-center flex-shrink-0" />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                            
                            {/* Locked Events Context */}
                            {m.contextType === 'locked_events' && m.userContext.lockedEvents.length > 0 && (
                              <div className="space-y-2">
                                {m.userContext.lockedEvents.slice(0, 3).map((lock) => (
                                  <Link
                                    key={lock.id}
                                    href={`/events/${lock.id}`}
                                    onClick={onClose}
                                    className="block rounded-xl border border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                                  >
                                    <div className="flex gap-3 p-2.5">
                                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <Lock className="w-5 h-5 text-amber-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-semibold text-neutral-900 truncate group-hover:text-amber-600 transition-colors">
                                          {lock.title}
                                        </h4>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                                          <Calendar className="w-3 h-3" />
                                          <span>{new Date(lock.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <span className={`text-[10px] font-medium mt-1 inline-block ${
                                          lock.status === 'live' ? 'text-red-600' : 
                                          lock.status === 'upcoming' ? 'text-amber-600' : 'text-neutral-500'
                                        }`}>
                                          {lock.status === 'live' ? '🔴 Live Now' : 
                                           lock.status === 'upcoming' ? '🔐 Spot Reserved' : '✓ Completed'}
                                        </span>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-amber-600 self-center flex-shrink-0" />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                            
                            {/* Role Context */}
                            {m.contextType === 'role' && (
                              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                                <div className="flex gap-3 items-center">
                                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-xs font-semibold text-neutral-900">Your Roles</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {m.userContext.roles.map((role, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium capitalize">
                                          {role}
                                        </span>
                                      ))}
                                      {m.userContext.isOrganizer && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                          ✨ Organizer
                                        </span>
                                      )}
                                      {m.userContext.isAdmin && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                          👑 Admin
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Keys Context */}
                            {m.contextType === 'keys' && m.userContext.keysBalance !== undefined && (
                              <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3">
                                <div className="flex gap-3 items-center">
                                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <Key className="w-5 h-5 text-yellow-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-xs font-semibold text-neutral-900">KEYS Balance</h4>
                                    <p className="text-xl font-bold text-yellow-600 mt-0.5">
                                      {m.userContext.keysBalance.toLocaleString()} 🔑
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Organizer Stats Context */}
                            {m.contextType === 'organizer_stats' && m.userContext.isOrganizer && (
                              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
                                <div className="flex gap-3 items-start">
                                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg">📊</span>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-xs font-semibold text-neutral-900">Organizer Stats</h4>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <div className="text-center p-2 rounded bg-white/80">
                                        <p className="text-lg font-bold text-purple-600">{m.userContext.organizerEventCount || 0}</p>
                                        <p className="text-[9px] text-neutral-500">Published Events</p>
                                      </div>
                                      <div className="text-center p-2 rounded bg-white/80">
                                        <p className="text-lg font-bold text-purple-600">{m.userContext.organizerDraftCount || 0}</p>
                                        <p className="text-[9px] text-neutral-500">Drafts</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Account Info Context */}
                            {m.contextType === 'account_info' && (
                              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                                <div className="flex gap-3 items-center">
                                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-xs font-semibold text-neutral-900">{m.userContext.userName || 'User'}</h4>
                                    <p className="text-[10px] text-neutral-500 truncate">{m.userContext.userEmail}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-blue-600">🎫 {m.userContext.ticketCount} tickets</span>
                                      <span className="text-[10px] text-amber-600">🔐 {m.userContext.lockedEventCount} locks</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Order Cards - Phase 2.2 */}
                        {m.sender === 'support' && m.orders && m.orders.length > 0 && (
                          <div className="mt-2 space-y-2 max-w-[90%]">
                            {m.orders.slice(0, 3).map((order) => {
                              const statusColors: Record<string, string> = {
                                'completed': 'border-emerald-200 bg-emerald-50/50',
                                'pending': 'border-yellow-200 bg-yellow-50/50',
                                'processing': 'border-blue-200 bg-blue-50/50',
                                'failed': 'border-red-200 bg-red-50/50',
                                'refunded': 'border-orange-200 bg-orange-50/50',
                                'cancelled': 'border-gray-200 bg-gray-50/50'
                              };
                              const statusBadgeColors: Record<string, string> = {
                                'completed': 'bg-emerald-100 text-emerald-700',
                                'pending': 'bg-yellow-100 text-yellow-700',
                                'processing': 'bg-blue-100 text-blue-700',
                                'failed': 'bg-red-100 text-red-700',
                                'refunded': 'bg-orange-100 text-orange-700',
                                'cancelled': 'bg-gray-100 text-gray-700'
                              };
                              
                              return (
                                <div
                                  key={order.id}
                                  className={`rounded-xl border p-3 ${statusColors[order.status] || 'border-neutral-200 bg-white'}`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-xs font-semibold text-neutral-900">{order.orderNumber}</h4>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${statusBadgeColors[order.status] || 'bg-neutral-100 text-neutral-700'}`}>
                                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </span>
                                      </div>
                                      {order.eventTitle && (
                                        <p className="text-[10px] text-neutral-600 mb-2">{order.eventTitle}</p>
                                      )}
                                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div>
                                          <span className="text-neutral-500">Amount:</span>
                                          <p className="font-semibold text-neutral-900">GHS {order.totalAmount.toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <span className="text-neutral-500">Method:</span>
                                          <p className="font-semibold text-neutral-900 capitalize">{order.paymentMethod}</p>
                                        </div>
                                        {order.ticketQuantity && (
                                          <div>
                                            <span className="text-neutral-500">Tickets:</span>
                                            <p className="font-semibold text-neutral-900">×{order.ticketQuantity}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-neutral-500">Date:</span>
                                          <p className="font-semibold text-neutral-900">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Ticket Cards - Phase 2.2 */}
                        {m.sender === 'support' && m.tickets && m.tickets.length > 0 && (
                          <div className="mt-2 space-y-2 max-w-[90%]">
                            {m.tickets.slice(0, 3).map((ticket) => {
                              const statusColors: Record<string, string> = {
                                'registered': 'border-emerald-200 bg-emerald-50/50',
                                'checked_in': 'border-blue-200 bg-blue-50/50',
                                'pending_approval': 'border-yellow-200 bg-yellow-50/50',
                                'cancelled': 'border-red-200 bg-red-50/50',
                                'refunded': 'border-orange-200 bg-orange-50/50',
                                'no_show': 'border-gray-200 bg-gray-50/50'
                              };
                              const statusBadgeColors: Record<string, string> = {
                                'registered': 'bg-emerald-100 text-emerald-700',
                                'checked_in': 'bg-blue-100 text-blue-700',
                                'pending_approval': 'bg-yellow-100 text-yellow-700',
                                'cancelled': 'bg-red-100 text-red-700',
                                'refunded': 'bg-orange-100 text-orange-700',
                                'no_show': 'bg-gray-100 text-gray-700'
                              };
                              
                              const eventDate = ticket.eventStartDate ? new Date(ticket.eventStartDate) : null;
                              const isUpcoming = eventDate && eventDate > new Date();
                              
                              return (
                                <Link
                                  key={ticket.id}
                                  href={`/events/${ticket.eventId}`}
                                  onClick={onClose}
                                  className={`block rounded-xl border p-3 hover:shadow-md transition-all ${statusColors[ticket.status] || 'border-neutral-200 bg-white'}`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-xs font-semibold text-neutral-900 truncate">{ticket.eventTitle}</h4>
                                        {isUpcoming && (
                                          <span className="text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium flex-shrink-0">
                                            🎫 Upcoming
                                          </span>
                                        )}
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${statusBadgeColors[ticket.status] || 'bg-neutral-100 text-neutral-700'}`}>
                                          {ticket.status.replace(/_/g, ' ').charAt(0).toUpperCase() + ticket.status.replace(/_/g, ' ').slice(1)}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div>
                                          <span className="text-neutral-500">Type:</span>
                                          <p className="font-semibold text-neutral-900">{ticket.ticketType}</p>
                                        </div>
                                        <div>
                                          <span className="text-neutral-500">Quantity:</span>
                                          <p className="font-semibold text-neutral-900">×{ticket.quantity}</p>
                                        </div>
                                        {eventDate && (
                                          <div className="col-span-2">
                                            <span className="text-neutral-500">Date:</span>
                                            <p className="font-semibold text-neutral-900">{eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-300 self-center flex-shrink-0" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Action Buttons - Phase 1.3 */}
                        {m.sender === 'support' && m.actions && m.actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                            {m.actions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleActionClick(action)}
                                className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary hover:text-white transition-colors cursor-pointer border border-primary/20 text-primary font-medium flex items-center gap-1.5"
                              >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                                {action.type === 'external_link' && <ExternalLink className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Suggestions after bot response */}
                        {m.sender === 'support' && m.suggestions && m.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                            {m.suggestions.slice(0, 3).map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="text-[11px] px-2.5 py-1.5 rounded-full bg-neutral-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-neutral-200 text-neutral-600 truncate max-w-[200px]"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="max-w-[78%] rounded-2xl px-4 py-3 text-sm bg-white/95 backdrop-blur border border-neutral-200 rounded-bl-sm text-neutral-900 shadow-sm">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-primary">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                            Lockey
                          </div>
                          <div className="typing-indicator gap-1">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-neutral-100 bg-white/90 backdrop-blur">
                    <div className="relative w-full">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask anything about Locked…"
                        className="w-full h-11 text-[16px] md:text-sm bg-neutral-100/70 focus:bg-white rounded-full pl-4 pr-14 border border-neutral-200/70 focus:border-primary/40 focus:outline-none focus:ring-0 transition-all shadow-sm"
                        inputMode="text"
                        aria-label="Chat message"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!input.trim()}
                        className={`absolute inset-y-1 right-1 h-9 w-9 flex items-center justify-center rounded-full cursor-pointer ${input.trim() ? 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                        aria-label="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* CSS for typing indicator */}
      <style jsx global>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 6px;
          width: 6px;
          margin: 0 2px;
          background-color: #6366F1;
          border-radius: 50%;
          display: inline-block;
          opacity: 0.6;
        }
        
        .typing-indicator span:nth-child(1) {
          animation: bounce 1.5s infinite 0.2s;
        }
        .typing-indicator span:nth-child(2) {
          animation: bounce 1.5s infinite 0.4s;
        }
        .typing-indicator span:nth-child(3) {
          animation: bounce 1.5s infinite 0.6s;
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </AnimatePresence>
  );
}