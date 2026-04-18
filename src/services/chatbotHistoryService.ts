/**
 * Chatbot History Service
 * Handles persistence of chat conversations and messages for authenticated users
 * Supports multiple conversations per user (up to 5)
 */

import { createClient } from '@/lib/supabase/client/client';

// ============================================
// TYPES
// ============================================

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string | null;
}

export interface ChatMessage {
  id: string;
  message_text: string;
  sender: 'user' | 'support';
  metadata?: {
    suggestions?: string[];
    events?: any[];
    isEventSearch?: boolean;
    isContextQuery?: boolean;
    contextType?: string;
  } | null;
  created_at: string;
}

export interface SaveMessageParams {
  userId: string;
  conversationId: string;
  messageText: string;
  sender: 'user' | 'support';
  metadata?: {
    suggestions?: string[];
    events?: any[];
    isEventSearch?: boolean;
    isContextQuery?: boolean;
    contextType?: string;
  } | null;
}

// ============================================
// SERVICE
// ============================================

class ChatbotHistoryService {
  private supabase = createClient();

  // ------------------------------------------
  // CONVERSATIONS
  // ------------------------------------------

  /**
   * Get all conversations for a user
   * Returns conversations sorted by most recently updated
   */
  async getConversations(userId: string): Promise<ChatConversation[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_chatbot_conversations', {
          p_user_id: userId
        });

      if (error) {
        // Gracefully handle missing tables/functions (migration not run yet)
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created. Run the chatbot_history.sql migration.');
          return [];
        }
        console.error('Error loading conversations:', error.message || error);
        return [];
      }

      return (data || []) as ChatConversation[];
    } catch (err) {
      console.error('Failed to load conversations:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Create a new conversation
   * Returns the new conversation ID or null if limit reached
   */
  async createConversation(userId: string, title: string = 'New Chat'): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_chatbot_conversation', {
          p_user_id: userId,
          p_title: title
        });

      if (error) {
        // Gracefully handle missing tables/functions
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created. Run the chatbot_history.sql migration.');
          return null;
        }
        // Check if it's a limit error
        if (error.message?.includes('Maximum conversation limit')) {
          console.warn('Conversation limit reached');
          return null;
        }
        console.error('Error creating conversation:', error.message || error);
        return null;
      }

      return data as string;
    } catch (err) {
      console.error('Failed to create conversation:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Delete a specific conversation
   */
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('delete_chatbot_conversation', {
          p_user_id: userId,
          p_conversation_id: conversationId
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created.');
          return false;
        }
        console.error('Error deleting conversation:', error.message || error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Failed to delete conversation:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Delete all conversations for a user
   */
  async clearAllConversations(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('clear_all_chatbot_conversations', {
          p_user_id: userId
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created.');
          return false;
        }
        console.error('Error clearing conversations:', error.message || error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Failed to clear conversations:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(userId: string, conversationId: string, title: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('update_conversation_title', {
          p_user_id: userId,
          p_conversation_id: conversationId,
          p_title: title
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created.');
          return false;
        }
        console.error('Error updating conversation title:', error.message || error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Failed to update conversation title:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  // ------------------------------------------
  // MESSAGES
  // ------------------------------------------

  /**
   * Load messages for a specific conversation
   * Returns messages in chronological order (oldest first)
   */
  async loadMessages(userId: string, conversationId: string, limit: number = 100): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_conversation_messages', {
          p_user_id: userId,
          p_conversation_id: conversationId,
          p_limit: limit
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created.');
          return [];
        }
        console.error('Error loading messages:', error.message || error);
        return [];
      }

      return (data || []) as ChatMessage[];
    } catch (err) {
      console.error('Failed to load messages:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Save a single chat message to a conversation
   */
  async saveMessage(params: SaveMessageParams): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('save_chatbot_message', {
          p_user_id: params.userId,
          p_conversation_id: params.conversationId,
          p_message_text: params.messageText,
          p_sender: params.sender,
          p_metadata: params.metadata || null
        });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42883') {
          console.warn('Chatbot history tables not yet created.');
          return null;
        }
        console.error('Error saving chat message:', error.message || error);
        return null;
      }

      return data as string;
    } catch (err) {
      console.error('Failed to save chat message:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Save multiple messages at once (batch save)
   * Useful for saving both user message and bot response together
   */
  async saveMessages(messages: SaveMessageParams[]): Promise<boolean> {
    try {
      const promises = messages.map(msg => this.saveMessage(msg));
      const results = await Promise.all(promises);
      return results.every(id => id !== null);
    } catch (err) {
      console.error('Failed to batch save messages:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  // ------------------------------------------
  // HELPERS
  // ------------------------------------------

  /**
   * Get conversation count for a user
   */
  async getConversationCount(userId: string): Promise<number> {
    const conversations = await this.getConversations(userId);
    return conversations.length;
  }

  /**
   * Check if user can create more conversations
   */
  async canCreateConversation(userId: string): Promise<boolean> {
    const count = await this.getConversationCount(userId);
    return count < 5;
  }
}

// Export singleton instance
export const chatbotHistoryService = new ChatbotHistoryService();
