/**
 * Chatbot Conversation Context Service
 * -------------------------------------
 * Tracks conversation context to enable intelligent follow-up responses.
 * Maintains topic memory, entity references, and intent history.
 */

// ============================================
// TYPES
// ============================================

export type ConversationTopic = 
  | 'tickets'
  | 'refunds'
  | 'payments'
  | 'account'
  | 'events'
  | 'voting'
  | 'organizer'
  | 'security'
  | 'locks'
  | 'keys'
  | 'profile'
  | 'general';

export interface MessageContext {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  detectedTopic?: ConversationTopic;
  detectedEntities?: string[];
  detectedIntent?: string;
}

export interface ConversationContext {
  /** Current dominant topic of conversation */
  currentTopic: ConversationTopic;
  
  /** History of recent topics (for topic switching detection) */
  topicHistory: ConversationTopic[];
  
  /** Named entities mentioned (event names, ticket types, etc.) */
  entities: Map<string, string>;
  
  /** Last N messages for context */
  recentMessages: MessageContext[];
  
  /** Keywords from the conversation for reference resolution */
  keywords: string[];
  
  /** When the conversation context was last updated */
  lastUpdated: Date;
  
  /** Confidence in current topic (0-1) */
  topicConfidence: number;
}

// ============================================
// TOPIC DETECTION PATTERNS
// ============================================

const TOPIC_PATTERNS: Record<ConversationTopic, string[]> = {
  tickets: [
    'ticket', 'tickets', 'booking', 'booked', 'purchase', 'buy', 'bought',
    'registration', 'registered', 'attend', 'attending', 'entry', 'admission',
    'qr code', 'e-ticket', 'ticket type', 'vip', 'general admission', 'early bird'
  ],
  refunds: [
    'refund', 'refunded', 'money back', 'cancel', 'cancelled', 'cancellation',
    'return', 'returned', 'dispute', 'chargeback', 'get back', 'reimburse'
  ],
  payments: [
    'payment', 'pay', 'paid', 'price', 'cost', 'charge', 'charged', 'fee',
    'mobile money', 'momo', 'card', 'visa', 'mastercard', 'transaction',
    'checkout', 'billing', 'invoice', 'receipt'
  ],
  account: [
    'account', 'login', 'log in', 'sign in', 'sign up', 'register', 'password',
    'email', 'username', 'profile', 'settings', 'delete account', 'deactivate'
  ],
  events: [
    'event', 'events', 'happening', 'concert', 'party', 'festival', 'show',
    'conference', 'workshop', 'seminar', 'webinar', 'meetup', 'discover',
    'find events', 'search events', 'upcoming', 'trending', 'featured'
  ],
  voting: [
    'vote', 'voting', 'votes', 'voted', 'contestant', 'contestants', 'competition',
    'winner', 'poll', 'ballot', 'cast vote', 'vote cost', 'voting phase'
  ],
  organizer: [
    'organizer', 'organizers', 'host', 'hosting', 'create event', 'publish',
    'draft', 'manage event', 'event analytics', 'dashboard', 'organizer dashboard',
    'add contestants', 'ticket sales', 'attendee list'
  ],
  security: [
    'security', 'secure', '2fa', 'two-factor', 'authentication', 'mfa',
    'password', 'verify', 'verification', 'suspicious', 'hack', 'breach'
  ],
  locks: [
    'lock', 'locks', 'locked', 'locking', 'save', 'saved', 'bookmark',
    'bookmarked', 'favorite', 'favorites', 'interested', 'remind me'
  ],
  keys: [
    'keys', 'key', 'key balance', 'keys balance', 'earn keys', 'spend keys',
    'loyalty', 'points', 'rewards', 'credits'
  ],
  profile: [
    'profile', 'my info', 'my information', 'personal', 'bio', 'avatar',
    'picture', 'photo', 'display name', 'about me'
  ],
  general: []
};

// Follow-up indicators (vague references that need context)
const FOLLOW_UP_INDICATORS = [
  'it', 'that', 'this', 'them', 'those', 'these',
  'and', 'also', 'too', 'as well',
  'what about', 'how about', 'what if',
  'can i', 'can you', 'is it', 'are they',
  'more', 'another', 'other', 'else',
  'same', 'similar', 'like that'
];

// Topic transition phrases
const TOPIC_TRANSITION_PHRASES = [
  'actually', 'by the way', 'speaking of', 'on another note',
  'different question', 'new question', 'unrelated', 'also wanted to ask',
  'quick question', 'one more thing', 'before i forget'
];

// ============================================
// CONTEXT SERVICE
// ============================================

class ChatbotConversationContextService {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly MAX_MESSAGES = 10; // Keep last 10 messages for context
  private readonly MAX_TOPICS = 5; // Keep last 5 topics in history
  private readonly CONTEXT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create conversation context
   */
  getContext(conversationId: string): ConversationContext {
    let context = this.contexts.get(conversationId);
    
    // Check if context is stale
    if (context && Date.now() - context.lastUpdated.getTime() > this.CONTEXT_TIMEOUT) {
      this.contexts.delete(conversationId);
      context = undefined;
    }
    
    if (!context) {
      context = this.createEmptyContext();
      this.contexts.set(conversationId, context);
    }
    
    return context;
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): ConversationContext {
    return {
      currentTopic: 'general',
      topicHistory: [],
      entities: new Map(),
      recentMessages: [],
      keywords: [],
      lastUpdated: new Date(),
      topicConfidence: 0
    };
  }

  /**
   * Add a message to the conversation context and update understanding
   */
  addMessage(conversationId: string, message: Omit<MessageContext, 'detectedTopic' | 'detectedEntities' | 'detectedIntent'>): ConversationContext {
    const context = this.getContext(conversationId);
    
    // Detect topic and entities from the message
    const detectedTopic = this.detectTopic(message.text, context);
    const detectedEntities = this.extractEntities(message.text);
    const detectedIntent = this.detectIntent(message.text, context);
    
    // Create enriched message
    const enrichedMessage: MessageContext = {
      ...message,
      detectedTopic,
      detectedEntities,
      detectedIntent
    };
    
    // Add to recent messages (keep last N)
    context.recentMessages.push(enrichedMessage);
    if (context.recentMessages.length > this.MAX_MESSAGES) {
      context.recentMessages.shift();
    }
    
    // Update topic if detected with sufficient confidence
    if (detectedTopic !== 'general') {
      // Check if this is a topic change
      const isTopicChange = this.isTopicTransition(message.text);
      
      if (isTopicChange || context.currentTopic === 'general') {
        // Clear topic transition - update immediately
        context.topicHistory.push(context.currentTopic);
        if (context.topicHistory.length > this.MAX_TOPICS) {
          context.topicHistory.shift();
        }
        context.currentTopic = detectedTopic;
        context.topicConfidence = 0.9;
      } else if (detectedTopic === context.currentTopic) {
        // Same topic - increase confidence
        context.topicConfidence = Math.min(1, context.topicConfidence + 0.1);
      } else {
        // Different topic mentioned - might be follow-up or transition
        // Only switch if confidence is higher
        const isFollowUp = this.isFollowUpQuestion(message.text);
        if (!isFollowUp) {
          context.topicHistory.push(context.currentTopic);
          if (context.topicHistory.length > this.MAX_TOPICS) {
            context.topicHistory.shift();
          }
          context.currentTopic = detectedTopic;
          context.topicConfidence = 0.7;
        }
      }
    }
    
    // Update entities
    detectedEntities.forEach(entity => {
      // Simple entity classification
      if (entity.includes('event') || entity.length > 20) {
        context.entities.set('event_name', entity);
      } else if (entity.includes('ticket')) {
        context.entities.set('ticket_type', entity);
      } else {
        context.entities.set('last_entity', entity);
      }
    });
    
    // Extract and store keywords
    const newKeywords = this.extractKeywords(message.text);
    context.keywords = [...new Set([...context.keywords, ...newKeywords])].slice(-20);
    
    // Update timestamp
    context.lastUpdated = new Date();
    
    return context;
  }

  /**
   * Detect the topic of a message
   */
  private detectTopic(text: string, context: ConversationContext): ConversationTopic {
    const textLower = text.toLowerCase();
    let bestTopic: ConversationTopic = 'general';
    let bestScore = 0;
    
    for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS) as [ConversationTopic, string[]][]) {
      if (topic === 'general') continue;
      
      let score = 0;
      for (const pattern of patterns) {
        if (textLower.includes(pattern)) {
          // Longer patterns get higher scores
          score += pattern.length;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }
    
    // If no strong topic detected, check if it's a follow-up
    if (bestTopic === 'general' && this.isFollowUpQuestion(text)) {
      return context.currentTopic;
    }
    
    return bestTopic;
  }

  /**
   * Check if message is a follow-up question
   */
  isFollowUpQuestion(text: string): boolean {
    const textLower = text.toLowerCase().trim();
    
    // Short messages (4 words or less) are often follow-ups
    const wordCount = textLower.split(' ').length;
    if (wordCount <= 4) {
      // Check for follow-up indicators
      for (const indicator of FOLLOW_UP_INDICATORS) {
        if (textLower.includes(indicator)) {
          return true;
        }
      }
      
      // Short "how do I" questions are often follow-ups to previous topic
      if (textLower.startsWith('how do i') || textLower.startsWith('how can i')) {
        return true;
      }
    }
    
    // Questions starting with "and", "what about", etc.
    const followUpStarters = ['and ', 'what about', 'how about', 'what if', 'can i also', 'is that'];
    for (const starter of followUpStarters) {
      if (textLower.startsWith(starter)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if message indicates a topic transition
   */
  private isTopicTransition(text: string): boolean {
    const textLower = text.toLowerCase();
    
    for (const phrase of TOPIC_TRANSITION_PHRASES) {
      if (textLower.includes(phrase)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect the intent of a message
   */
  private detectIntent(text: string, context: ConversationContext): string {
    const textLower = text.toLowerCase();
    
    // Question intents
    if (textLower.startsWith('how')) return 'how_to';
    if (textLower.startsWith('what')) return 'what_is';
    if (textLower.startsWith('where')) return 'location';
    if (textLower.startsWith('when')) return 'timing';
    if (textLower.startsWith('why')) return 'reason';
    if (textLower.startsWith('can i') || textLower.startsWith('can you')) return 'capability';
    if (textLower.startsWith('is') || textLower.startsWith('are') || textLower.startsWith('do')) return 'confirmation';
    
    // Action intents
    if (textLower.includes('show me') || textLower.includes('find')) return 'search';
    if (textLower.includes('help me') || textLower.includes('help with')) return 'assistance';
    if (textLower.includes('take me') || textLower.includes('go to')) return 'navigation';
    
    return 'general';
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract quoted strings
    const quotedMatches = text.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        entities.push(match.replace(/['"]/g, ''));
      });
    }
    
    // Extract capitalized phrases (potential event names)
    const capitalizedMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
    if (capitalizedMatches) {
      capitalizedMatches.forEach(match => {
        if (match.length > 3) entities.push(match);
      });
    }
    
    return entities;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'i', 'me', 'my', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'this',
      'that', 'these', 'those', 'what', 'which', 'who', 'how', 'when', 'where', 'why',
      'if', 'then', 'so', 'but', 'and', 'or', 'not', 'no', 'yes', 'please', 'thanks'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Expand a query using conversation context
   * This is used to disambiguate vague follow-up questions
   */
  expandQuery(conversationId: string, query: string): { expandedQuery: string; context: ConversationContext } {
    const context = this.getContext(conversationId);
    let expandedQuery = query;
    const queryLower = query.toLowerCase();
    
    // If it's a follow-up question, add context
    if (this.isFollowUpQuestion(query)) {
      const topicContext = this.getTopicContext(context.currentTopic);
      
      // Check for pronoun references
      if (queryLower.includes(' it ') || queryLower.includes(' them ')) {
        // Try to resolve "it" or "them" to a recent entity or topic
        const lastEntity = context.entities.get('last_entity') || 
                          context.entities.get('event_name') || 
                          context.entities.get('ticket_type');
        
        if (lastEntity) {
          expandedQuery = query.replace(/\b(it|them)\b/gi, lastEntity);
        }
      }
      
      // Add topic context for short follow-up queries (5 words or less)
      // This helps "how do I pay?" in a tickets context become "regarding tickets: how do I pay?"
      const wordCount = query.split(' ').length;
      if (wordCount <= 5 && context.currentTopic !== 'general') {
        expandedQuery = `${topicContext}: ${expandedQuery}`;
      }
    }
    
    // Special handling: "how do I pay" type questions in tickets context
    // These are payment questions that should stay within the current topic context
    const isPaymentQuestion = queryLower.includes('pay') || queryLower.includes('payment');
    const isInRelatedContext = context.currentTopic === 'tickets' || context.currentTopic === 'events';
    
    if (isPaymentQuestion && isInRelatedContext && !expandedQuery.includes(':')) {
      expandedQuery = `for ${context.currentTopic}: ${expandedQuery}`;
    }
    
    return { expandedQuery, context };
  }

  /**
   * Get a human-readable context phrase for a topic
   */
  private getTopicContext(topic: ConversationTopic): string {
    const topicContexts: Record<ConversationTopic, string> = {
      tickets: 'regarding tickets',
      refunds: 'about refunds',
      payments: 'about payments',
      account: 'about your account',
      events: 'about events',
      voting: 'about voting',
      organizer: 'for organizers',
      security: 'about security',
      locks: 'about locked events',
      keys: 'about KEYS',
      profile: 'about your profile',
      general: ''
    };
    
    return topicContexts[topic];
  }

  /**
   * Get suggested follow-up questions based on current context
   */
  getSuggestedFollowUps(conversationId: string): string[] {
    const context = this.getContext(conversationId);
    
    const followUpsByTopic: Record<ConversationTopic, string[]> = {
      tickets: [
        'How do I access my ticket?',
        'Can I transfer my ticket?',
        'What if I lose my ticket?'
      ],
      refunds: [
        'How long do refunds take?',
        'What is the refund policy?',
        'Can I get a partial refund?'
      ],
      payments: [
        'What payment methods are accepted?',
        'Is my payment secure?',
        'Why was my payment declined?'
      ],
      account: [
        'How do I change my password?',
        'How do I update my email?',
        'Can I delete my account?'
      ],
      events: [
        'Show me trending events',
        'What events are happening this weekend?',
        'How do I search for events?'
      ],
      voting: [
        'How much does voting cost?',
        'How do I see voting results?',
        'When does voting end?'
      ],
      organizer: [
        'How do I create an event?',
        'How do I view my analytics?',
        'How do I manage ticket sales?'
      ],
      security: [
        'How do I enable 2FA?',
        'How do I change my password?',
        'Is my data secure?'
      ],
      locks: [
        'How do I unlock an event?',
        'What happens when I lock an event?',
        'Where are my locked events?'
      ],
      keys: [
        'How do I earn KEYS?',
        'What can I spend KEYS on?',
        'Where is my KEYS balance?'
      ],
      profile: [
        'How do I update my profile picture?',
        'Can I change my display name?',
        'How do I add a bio?'
      ],
      general: [
        'How can I find events?',
        'What is Locked?',
        'How do I get started?'
      ]
    };
    
    return followUpsByTopic[context.currentTopic] || followUpsByTopic.general;
  }

  /**
   * Clear context for a conversation
   */
  clearContext(conversationId: string): void {
    this.contexts.delete(conversationId);
  }

  /**
   * Get a summary of the current conversation context
   */
  getContextSummary(conversationId: string): string {
    const context = this.getContext(conversationId);
    
    if (context.recentMessages.length === 0) {
      return 'No conversation context yet.';
    }
    
    let summary = `Topic: ${context.currentTopic}`;
    
    if (context.entities.size > 0) {
      const entityList = Array.from(context.entities.entries())
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      summary += ` | Entities: ${entityList}`;
    }
    
    summary += ` | Messages: ${context.recentMessages.length}`;
    
    return summary;
  }
}

// Export singleton instance
export const conversationContextService = new ChatbotConversationContextService();

// Export helper function for checking follow-ups
export function isFollowUpQuestion(text: string): boolean {
  return conversationContextService.isFollowUpQuestion(text);
}
