# Locked Chatbot Enhancement Documentation

## Overview

This document outlines the phased approach to transforming the Locked Help Chatbot from a basic FAQ responder into an intelligent, context-aware assistant.

**Current State:** Phase 2.2 Complete ✅ - Event search, user context awareness, navigation actions, conversation memory, organizer-specific help, and order/ticket status lookup all implemented.

**Target State:** Intelligent assistant capable of searching events, understanding user context, navigating the app, and providing personalized help.

**Completed Phases:**
- ✅ Phase 1.1 - Event Search Integration
- ✅ Phase 1.2 - User Context Awareness
- ✅ Phase 1.3 - Deep Linking / Navigation
- ✅ Phase 1.4 - Conversation Context Memory
- ✅ Phase 2.1 - Organizer-Specific Help
- ✅ Phase 2.2 - Order/Ticket Status Lookup

---

## Phase 1: Core Intelligence (High Impact) ✅ COMPLETE

### 1.1 Event Search Integration
**Status:** ✅ Completed

Enable users to search for events directly through the chatbot.

**Capabilities:**
- "Find music events this weekend"
- "Show me free events in Accra"
- "What events are happening today?"
- "Find events with voting"
- "Show me live events right now"

**Implementation:**
- ✅ Created `chatbotEventService.ts` - integrates with `sharedEventService`
- ✅ Parse natural language queries for: category, date, location, price, status
- ✅ Return event cards with links directly in chat
- ✅ Handle follow-up questions about search results

**Files created/modified:**
- `src/services/chatbotEventService.ts` (new)
- `src/data/chatbotKnowledge.ts` (update generateResponse)
- `src/components/help/HelpChatPanel.tsx` (render event cards)

---

### 1.2 User Context Awareness
**Status:** ✅ Completed

Make the chatbot aware of the user's data and personalize responses.

**Capabilities:**
- "Where are my tickets?" → Shows actual purchased tickets
- "What events have I locked?" → Shows locked events count/list
- "Am I an organizer?" → Shows role status
- "Show my KEYS balance" → Displays current balance

**Implementation:**
- ✅ Created `chatbotUserContextService.ts`
- ✅ Fetch user context on chat open (tickets, locks, role, keys)
- ✅ Context query detection with pattern matching
- ✅ Personalized responses based on user data
- ✅ Visual context cards for tickets, locked events, roles, keys, organizer stats
- ✅ 2-minute caching for performance

**Data Sources:**
- `user_event_locks` - locked events
- `event_registrations` - purchased tickets
- `user_roles` - organizer/admin status
- `keys_balances` - KEYS balance (if exists)
- `organizers` + `events` - organizer statistics

---

### 1.3 Deep Linking / Navigation
**Status:** ✅ Completed

Allow bot to navigate users to specific pages via action buttons.

**Capabilities:**
- "Take me to settings" → Button to /dashboards/settings
- "Go to discover page" → Button to /pages/discover
- "Show my tickets" → Button to /dashboards/user/tickets
- "Create an event" → Button to /dashboards/organizer/events/new

**Implementation:**
- ✅ Added `actions` field to Message interface
- ✅ Render action buttons in chat messages
- ✅ Handle navigation via Next.js router
- ✅ Navigation intent detection in knowledge base

**Action Types:**
```typescript
interface ChatAction {
  type: 'navigate' | 'external_link' | 'copy';
  label: string;
  target: string;
  icon?: string;
}
```

---

### 1.4 Conversation Context Memory
**Status:** ✅ Completed

Remember context within a conversation for follow-up questions.

**Capabilities:**
- User: "How do I buy tickets?" → Bot explains
- User: "What payment methods?" → Bot understands "for buying tickets"
- User: "And refunds?" → Bot understands "refunds for tickets"

**Implementation:**
- ✅ Created `chatbotConversationContext.ts` service
- ✅ Track conversation topic/intent with 12 topic categories
- ✅ Store last 10 messages in context
- ✅ Detect follow-up questions using indicator patterns
- ✅ Expand vague queries using conversation context
- ✅ Topic-aware suggestion system
- ✅ Entity extraction (event names, quoted strings)
- ✅ Keyword tracking for reference resolution
- ✅ Context clearing on new conversation creation

**Topic Categories:**
`tickets`, `refunds`, `payments`, `account`, `events`, `voting`, `organizer`, `security`, `locks`, `keys`, `profile`, `general`

---

## Phase 2: Enhanced Intelligence (Medium Impact)

### 2.1 Organizer-Specific Help
**Status:** ✅ Completed

Detect organizer role and provide specialized assistance.

**Capabilities:**
- "How do I publish my event?"
- "Where can I see my event analytics?"
- "How do I add voting to my event?"
- "How do I manage ticket sales?"

**Implementation:**
- ✅ Check `roles` for 'organizer' from AuthContext
- ✅ Added 6 new organizer-specific knowledge entries
- ✅ Load organizer-only knowledge entries based on user role
- ✅ Provide dashboard shortcuts for organizers
- ✅ Organizer-specific navigation shortcuts (analytics, payouts, voting, etc.)

**New Knowledge Entries:**
- `organizer-analytics` - View event analytics and reports
- `organizer-voting` - Add voting to events
- `organizer-tickets` - Manage ticket sales and attendees
- `organizer-publish` - Publish events to make them live
- `organizer-help` - Overview of organizer resources
- `organizer-manage` - (already existed) Manage events
- `organizer-payouts` - (already existed) Payout information

**New Navigation Shortcuts (organizer-only):**
- `organizerAnalytics` → /dashboards/organizer/analytics
- `organizerPayouts` → /dashboards/organizer/earnings
- `organizeVoting` → /dashboards/organizer/events

---

### 2.2 Order/Ticket Status Lookup
**Status:** ✅ Completed

Check order status and ticket information.

**Capabilities:**
- "Check my last order"
- "Is my payment confirmed?"
- "Show my ticket for [event name]"
- "When does my ticket expire?"

**Implementation:**
- ✅ Created `chatbotOrderService.ts` - query orders and event_registrations
- ✅ Detect 5 order query types: last_order, check_order, check_ticket, payment_status, upcoming_tickets
- ✅ Added `detectOrderQuery()` function in knowledge base with regex patterns
- ✅ Added 4 new FAQ knowledge entries (tickets-check-order, tickets-payment-confirm, tickets-view, tickets-when-expire)
- ✅ Extended Message interface with orders and tickets arrays
- ✅ Complete order detection logic in handleSendMessage
- ✅ Visual order cards with status colors and badges
- ✅ Visual ticket cards with event links and status indicators

**New Knowledge Entries:**
- `tickets-check-order` - How to check order status (priority 10)
- `tickets-payment-confirm` - Payment confirmation timeline (priority 10)
- `tickets-view` - Finding and viewing tickets (priority 9)
- `tickets-when-expire` - Ticket expiration info (priority 8)

**Query Types Detected:**
1. `last_order` - "Check my last order", "What was my recent purchase"
2. `check_order` - "Check order status", "Find my order [number]"
3. `check_ticket` - "Show my ticket", "Find ticket for [event]"
4. `payment_status` - "Is my payment confirmed", "Payment status"
5. `upcoming_tickets` - "Show my upcoming tickets", "What events do I have tickets for"

---

### 2.3 Human Handoff System
**Status:** ⏳ Pending

Escalate to human support when bot can't help.

**Capabilities:**
- After 3 "I don't understand" responses → Offer support ticket
- "I want to talk to a human"
- "Create a support ticket"

**Implementation:**
- Track failed response count per conversation
- Integration with support ticket system (or email)
- Preserve conversation history for support agent

---

## Phase 3: Advanced Features (Nice to Have)

### 3.1 Sentiment Analysis
**Status:** ⏳ Pending

Detect user frustration and adapt responses.

**Implementation:**
- Keyword detection for frustration indicators
- Faster escalation for upset users
- More empathetic response templates

---

### 3.2 FAQ Auto-Learning
**Status:** ⏳ Pending

Log unmatched queries for admin review.

**Implementation:**
- Store unmatched queries in database
- Admin dashboard to review and add to knowledge base
- Analytics on common unanswered questions

---

### 3.3 Multi-Language Support
**Status:** ⏳ Pending

Basic support for local languages.

**Implementation:**
- Detect language from query
- Translate common responses
- Support Twi/Ga phrases

---

## Technical Architecture

### Message Interface (Enhanced)
```typescript
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  suggestions?: string[];
  events?: EventData[];        // Phase 1.1
  actions?: ChatAction[];      // Phase 1.3
  context?: ConversationContext; // Phase 1.4
}
```

### Response Generator Flow
```
User Query
    ↓
[Intent Detection] → Event Search? → chatbotEventService
    ↓                     ↓
[Context Check] ← ─ ─ ─ ─ ┘
    ↓
[Knowledge Search] → searchKnowledge()
    ↓
[Response Assembly]
    ↓
[Action Generation] → Add navigation buttons
    ↓
Final Response
```

---

## Implementation Order

1. ✅ **Phase 1.1** - Event Search (most user value) - COMPLETED
2. ✅ **Phase 1.3** - Navigation Actions (quick win) - COMPLETED
3. ⏳ **Phase 1.2** - User Context (personalization)
4. ⏳ **Phase 1.4** - Conversation Memory (polish)
5. ⏳ **Phase 2.x** - As needed
6. ⏳ **Phase 3.x** - Future enhancements

---

## Success Metrics

- **Response Relevance:** % of queries matched to knowledge base
- **Event Search Usage:** # of event searches via chatbot
- **Navigation Clicks:** # of action button clicks
- **Escalation Rate:** % of conversations requiring human support
- **User Satisfaction:** Implicit (conversation length, return usage)

---

*Last Updated: December 15, 2025*
