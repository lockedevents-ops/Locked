/**
 * SUPPORT SYSTEM DATABASE SERVICE
 * =====================================================
 * Handles all database operations for the support system
 * Replaces localStorage implementation
 * =====================================================
 */

import { createClient } from '@/lib/supabase/client/client';

// Type Definitions
export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  responseTime?: number; // in minutes
  resolutionTime?: number; // in minutes
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  sender: 'user' | 'support';
  senderName: string;
  attachments?: string[];
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueTemplate {
  id: string;
  title: string;
  description: string;
  suggestedResponse: string;
  category: string;
  createdAt?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgResponseTime?: number;
  avgResolutionTime?: number;
}

// =====================================================
// SUPPORT TICKETS OPERATIONS
// =====================================================

/**
 * Get all support tickets (admin view)
 */
export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      messages:ticket_messages(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching support tickets:', error);
    throw error;
  }
  
  return (data || []).map(mapTicketFromDB);
}

/**
 * Get tickets for a specific user
 */
export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      messages:ticket_messages(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
  
  return (data || []).map(mapTicketFromDB);
}

/**
 * Get single ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      messages:ticket_messages(*)
    `)
    .eq('id', ticketId)
    .single();
  
  if (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
  
  return data ? mapTicketFromDB(data) : null;
}

/**
 * Create new support ticket
 */
export async function createSupportTicket(ticket: {
  subject: string;
  description: string;
  priority: string;
  category: string;
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<SupportTicket> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .insert([{
      subject: ticket.subject,
      description: ticket.description,
      status: 'open',
      priority: ticket.priority,
      category: ticket.category,
      user_id: ticket.userId,
      user_name: ticket.userName,
      user_email: ticket.userEmail
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
  
  return mapTicketFromDB(data);
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(
  ticketId: string,
  updates: Partial<{
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    assignedTo: string | null;
    responseTime: number;
    resolutionTime: number;
  }>
): Promise<SupportTicket> {
  const supabase = createClient();
  
  // Map camelCase to snake_case
  const dbUpdates: any = {};
  if (updates.subject) dbUpdates.subject = updates.subject;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.priority) dbUpdates.priority = updates.priority;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
  if (updates.responseTime !== undefined) dbUpdates.response_time = updates.responseTime;
  if (updates.resolutionTime !== undefined) dbUpdates.resolution_time = updates.resolutionTime;
  
  const { data, error } = await supabase
    .from('support_tickets')
    .update(dbUpdates)
    .eq('id', ticketId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating support ticket:', error);
    throw error;
  }
  
  return mapTicketFromDB(data);
}

/**
 * Delete support ticket
 */
export async function deleteSupportTicket(ticketId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId);
  
  if (error) {
    console.error('Error deleting support ticket:', error);
    throw error;
  }
}

// =====================================================
// TICKET MESSAGES OPERATIONS
// =====================================================

/**
 * Add message to ticket
 */
export async function addTicketMessage(message: {
  ticketId: string;
  content: string;
  sender: 'user' | 'support';
  senderName: string;
  attachments?: string[];
}): Promise<TicketMessage> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert([{
      ticket_id: message.ticketId,
      content: message.content,
      sender: message.sender,
      sender_name: message.senderName,
      attachments: message.attachments || []
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding ticket message:', error);
    throw error;
  }
  
  return mapMessageFromDB(data);
}

/**
 * Get messages for a ticket
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching ticket messages:', error);
    throw error;
  }
  
  return (data || []).map(mapMessageFromDB);
}

// =====================================================
// KNOWLEDGE BASE OPERATIONS
// =====================================================

/**
 * Get all KB articles
 */
export async function getAllKBArticles(): Promise<KBArticle[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching KB articles:', error);
    throw error;
  }
  
  return (data || []).map(mapArticleFromDB);
}

/**
 * Get KB article by ID
 */
export async function getKBArticleById(articleId: string): Promise<KBArticle | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*')
    .eq('id', articleId)
    .single();
  
  if (error) {
    console.error('Error fetching KB article:', error);
    return null;
  }
  
  return data ? mapArticleFromDB(data) : null;
}

/**
 * Create KB article
 */
export async function createKBArticle(article: {
  title: string;
  content: string;
  category: string;
  tags: string[];
}): Promise<KBArticle> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('kb_articles')
    .insert([article])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating KB article:', error);
    throw error;
  }
  
  return mapArticleFromDB(data);
}

/**
 * Update KB article
 */
export async function updateKBArticle(
  articleId: string,
  updates: Partial<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    views: number;
    helpfulCount: number;
    notHelpfulCount: number;
  }>
): Promise<KBArticle> {
  const supabase = createClient();
  
  // Map camelCase to snake_case
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.category) dbUpdates.category = updates.category;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.views !== undefined) dbUpdates.views = updates.views;
  if (updates.helpfulCount !== undefined) dbUpdates.helpful_count = updates.helpfulCount;
  if (updates.notHelpfulCount !== undefined) dbUpdates.not_helpful_count = updates.notHelpfulCount;
  
  const { data, error } = await supabase
    .from('kb_articles')
    .update(dbUpdates)
    .eq('id', articleId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating KB article:', error);
    throw error;
  }
  
  return mapArticleFromDB(data);
}

/**
 * Delete KB article
 */
export async function deleteKBArticle(articleId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('kb_articles')
    .delete()
    .eq('id', articleId);
  
  if (error) {
    console.error('Error deleting KB article:', error);
    throw error;
  }
}

/**
 * Increment article views
 */
export async function incrementArticleViews(articleId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase.rpc('increment_article_views', {
    article_id: articleId
  });
  
  if (error) {
    // Fallback to manual increment if RPC doesn't exist
    const { data: article } = await supabase
      .from('kb_articles')
      .select('views')
      .eq('id', articleId)
      .single();
    
    if (article) {
      await supabase
        .from('kb_articles')
        .update({ views: article.views + 1 })
        .eq('id', articleId);
    }
  }
}

// =====================================================
// ISSUE TEMPLATES OPERATIONS
// =====================================================

/**
 * Get all issue templates
 */
export async function getAllIssueTemplates(): Promise<IssueTemplate[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('issue_templates')
    .select('*')
    .order('category', { ascending: true });
  
  if (error) {
    console.error('Error fetching issue templates:', error);
    throw error;
  }
  
  return (data || []).map(mapTemplateFromDB);
}

/**
 * Create issue template
 */
export async function createIssueTemplate(template: {
  title: string;
  description: string;
  suggestedResponse: string;
  category: string;
}): Promise<IssueTemplate> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('issue_templates')
    .insert([{
      title: template.title,
      description: template.description,
      suggested_response: template.suggestedResponse,
      category: template.category
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating issue template:', error);
    throw error;
  }
  
  return mapTemplateFromDB(data);
}

/**
 * Update issue template
 */
export async function updateIssueTemplate(
  templateId: string,
  updates: Partial<{
    title: string;
    description: string;
    suggestedResponse: string;
    category: string;
  }>
): Promise<IssueTemplate> {
  const supabase = createClient();
  
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.suggestedResponse) dbUpdates.suggested_response = updates.suggestedResponse;
  if (updates.category) dbUpdates.category = updates.category;
  
  const { data, error } = await supabase
    .from('issue_templates')
    .update(dbUpdates)
    .eq('id', templateId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating issue template:', error);
    throw error;
  }
  
  return mapTemplateFromDB(data);
}

/**
 * Delete issue template
 */
export async function deleteIssueTemplate(templateId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('issue_templates')
    .delete()
    .eq('id', templateId);
  
  if (error) {
    console.error('Error deleting issue template:', error);
    throw error;
  }
}

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * Get ticket statistics
 */
export async function getTicketStats(): Promise<TicketStats> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select('status, response_time, resolution_time');
  
  if (error) {
    console.error('Error fetching ticket stats:', error);
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0
    };
  }
  
  const stats: TicketStats = {
    total: data.length,
    open: data.filter((t: any) => t.status === 'open').length,
    inProgress: data.filter((t: any) => t.status === 'in_progress').length,
    resolved: data.filter((t: any) => t.status === 'resolved').length,
    closed: data.filter((t: any) => t.status === 'closed').length
  };
  
  // Calculate averages
  const responseTimes = data.filter((t: any) => t.response_time != null).map((t: any) => t.response_time);
  const resolutionTimes = data.filter((t: any) => t.resolution_time != null).map((t: any) => t.resolution_time);
  
  if (responseTimes.length > 0) {
    stats.avgResponseTime = responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length;
  }
  
  if (resolutionTimes.length > 0) {
    stats.avgResolutionTime = resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length;
  }
  
  return stats;
}

// =====================================================
// MAPPER FUNCTIONS (DB to App format)
// =====================================================

function mapTicketFromDB(dbTicket: any): SupportTicket {
  return {
    id: dbTicket.id,
    subject: dbTicket.subject,
    description: dbTicket.description,
    status: dbTicket.status,
    priority: dbTicket.priority,
    category: dbTicket.category,
    userId: dbTicket.user_id,
    userName: dbTicket.user_name,
    userEmail: dbTicket.user_email,
    assignedTo: dbTicket.assigned_to || undefined,
    responseTime: dbTicket.response_time || undefined,
    resolutionTime: dbTicket.resolution_time || undefined,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at,
    messages: dbTicket.messages ? dbTicket.messages.map(mapMessageFromDB) : []
  };
}

function mapMessageFromDB(dbMessage: any): TicketMessage {
  return {
    id: dbMessage.id,
    ticketId: dbMessage.ticket_id,
    content: dbMessage.content,
    sender: dbMessage.sender,
    senderName: dbMessage.sender_name,
    attachments: dbMessage.attachments || [],
    createdAt: dbMessage.created_at
  };
}

function mapArticleFromDB(dbArticle: any): KBArticle {
  return {
    id: dbArticle.id,
    title: dbArticle.title,
    content: dbArticle.content,
    category: dbArticle.category,
    tags: dbArticle.tags || [],
    views: dbArticle.views || 0,
    helpfulCount: dbArticle.helpful_count || 0,
    notHelpfulCount: dbArticle.not_helpful_count || 0,
    createdAt: dbArticle.created_at,
    updatedAt: dbArticle.updated_at
  };
}

function mapTemplateFromDB(dbTemplate: any): IssueTemplate {
  return {
    id: dbTemplate.id,
    title: dbTemplate.title,
    description: dbTemplate.description,
    suggestedResponse: dbTemplate.suggested_response,
    category: dbTemplate.category,
    createdAt: dbTemplate.created_at
  };
}

// Export service instance
const supportDatabaseService = {
  // Ticket operations
  getAllSupportTickets,
  getUserTickets,
  getTicketById,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  addTicketMessage,
  getTicketMessages,
  
  // KB Article operations
  getAllKBArticles,
  getKBArticleById,
  createKBArticle,
  updateKBArticle,
  deleteKBArticle,
  incrementArticleViews,
  
  // Issue Template operations
  getAllIssueTemplates,
  createIssueTemplate,
  updateIssueTemplate,
  deleteIssueTemplate,
  
  // Stats
  getTicketStats
};

export default supportDatabaseService;
