/**
 * Chatbot Order Service
 * ============================================
 * Handles order and ticket status lookup for the chatbot.
 * Allows users to check order status, payment confirmation, and ticket details.
 *
 * Phase 2.2: Order/Ticket Status Lookup
 */

import { createClient } from '@/lib/supabase/client/client';

// ============================================
// TYPES
// ============================================

export interface OrderData {
  id: string;
  orderNumber: string;
  orderType: 'ticket' | 'merchandise' | 'combo';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  eventId?: string;
  eventTitle?: string;
  ticketName?: string;
  ticketQuantity?: number;
  ticketPrice?: number;
  createdAt: string;
  completedAt?: string;
}

export interface TicketData {
  id: string;
  eventId: string;
  eventTitle: string;
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  status: 'registered' | 'pending_approval' | 'cancelled' | 'checked_in' | 'no_show' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  registrationDate: string;
  checkedInAt?: string;
  qrCodeToken?: string;
  eventStartDate?: string;
  eventEndDate?: string;
}

export interface OrderSearchResult {
  found: boolean;
  orders: OrderData[];
  tickets: TicketData[];
  message: string;
}

export interface OrderStatusSummary {
  totalOrders: number;
  totalTickets: number;
  pendingOrders: number;
  completedOrders: number;
  upcomingTickets: number;
  pastTickets: number;
}

// ============================================
// CHATBOT ORDER SERVICE
// ============================================

class ChatbotOrderService {
  private supabaseInstance: ReturnType<typeof createClient> | null = null;

  /**
   * Lazy-load Supabase client to avoid initialization errors
   * when environment variables aren't yet available
   */
  private getSupabase() {
    if (!this.supabaseInstance) {
      this.supabaseInstance = createClient();
    }
    return this.supabaseInstance;
  }

  /**
   * Get order and ticket status for a user
   * Optionally filter by event name or order number
   */
  async getUserOrders(userId: string, eventName?: string): Promise<OrderSearchResult> {
    try {
      // Fetch recent orders
      const { data: ordersData, error: ordersError } = await this.getSupabase()
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          status,
          total_amount,
          payment_method,
          payment_reference,
          event_id,
          ticket_name,
          ticket_quantity,
          ticket_price,
          created_at,
          completed_at,
          events!left(title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch event registrations (tickets)
      const { data: ticketsData, error: ticketsError } = await this.getSupabase()
        .from('event_registrations')
        .select(`
          id,
          event_id,
          ticket_type,
          quantity_registered,
          price_at_registration,
          total_amount,
          status,
          payment_status,
          registration_date,
          checked_in_at,
          qr_code_token,
          events!left(title, start_date, end_date)
        `)
        .eq('user_id', userId)
        .order('registration_date', { ascending: false })
        .limit(20);

      if (ordersError || ticketsError) {
        return {
          found: false,
          orders: [],
          tickets: [],
          message: 'Unable to fetch order information.'
        };
      }

      // Transform orders
      const transformedOrders: OrderData[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_reference ? 'confirmed' : 'pending',
        eventId: order.event_id,
        eventTitle: order.events?.[0]?.title,
        ticketName: order.ticket_name,
        ticketQuantity: order.ticket_quantity,
        ticketPrice: order.ticket_price,
        createdAt: order.created_at,
        completedAt: order.completed_at
      }));

      // Transform tickets
      const transformedTickets: TicketData[] = (ticketsData || []).map((ticket: any) => ({
        id: ticket.id,
        eventId: ticket.event_id,
        eventTitle: ticket.events?.[0]?.title || 'Unknown Event',
        ticketType: ticket.ticket_type || 'General',
        quantity: ticket.quantity_registered,
        pricePerTicket: ticket.price_at_registration || 0,
        totalAmount: ticket.total_amount || 0,
        status: ticket.status,
        paymentStatus: ticket.payment_status,
        registrationDate: ticket.registration_date,
        checkedInAt: ticket.checked_in_at,
        qrCodeToken: ticket.qr_code_token,
        eventStartDate: ticket.events?.[0]?.start_date,
        eventEndDate: ticket.events?.[0]?.end_date
      }));

      // Filter by event name if provided
      let filteredOrders = transformedOrders;
      let filteredTickets = transformedTickets;

      if (eventName) {
        const eventNameLower = eventName.toLowerCase();
        filteredOrders = transformedOrders.filter(
          o => o.eventTitle?.toLowerCase().includes(eventNameLower)
        );
        filteredTickets = transformedTickets.filter(
          t => t.eventTitle.toLowerCase().includes(eventNameLower)
        );
      }

      const found = filteredOrders.length > 0 || filteredTickets.length > 0;
      const message = found
        ? `Found ${filteredOrders.length} orders and ${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 's' : ''}.`
        : eventName
          ? `No orders or tickets found for "${eventName}".`
          : 'No orders or tickets found.';

      return {
        found,
        orders: filteredOrders,
        tickets: filteredTickets,
        message
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        found: false,
        orders: [],
        tickets: [],
        message: 'An error occurred while fetching your orders.'
      };
    }
  }

  /**
   * Get the most recent order
   */
  async getLastOrder(userId: string): Promise<OrderData | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          status,
          total_amount,
          payment_method,
          payment_reference,
          event_id,
          ticket_name,
          ticket_quantity,
          ticket_price,
          created_at,
          completed_at,
          events!left(title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        orderNumber: data.order_number,
        orderType: data.order_type,
        status: data.status,
        totalAmount: data.total_amount,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_reference ? 'confirmed' : 'pending',
        eventId: data.event_id,
        eventTitle: data.events?.[0]?.title,
        ticketName: data.ticket_name,
        ticketQuantity: data.ticket_quantity,
        ticketPrice: data.ticket_price,
        createdAt: data.created_at,
        completedAt: data.completed_at
      };
    } catch (error) {
      console.error('Error fetching last order:', error);
      return null;
    }
  }

  /**
   * Get upcoming tickets (for events that haven't started yet)
   */
  async getUpcomingTickets(userId: string): Promise<TicketData[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.getSupabase()
        .from('event_registrations')
        .select(`
          id,
          event_id,
          ticket_type,
          quantity_registered,
          price_at_registration,
          total_amount,
          status,
          payment_status,
          registration_date,
          checked_in_at,
          qr_code_token,
          events!left(title, start_date, end_date)
        `)
        .eq('user_id', userId)
        .gt('events.start_date', now) // Future events only
        .order('events.start_date', { ascending: true });

      if (error || !data) return [];

      return data.map((ticket: any) => ({
        id: ticket.id,
        eventId: ticket.event_id,
        eventTitle: ticket.events?.[0]?.title || 'Unknown Event',
        ticketType: ticket.ticket_type || 'General',
        quantity: ticket.quantity_registered,
        pricePerTicket: ticket.price_at_registration || 0,
        totalAmount: ticket.total_amount || 0,
        status: ticket.status,
        paymentStatus: ticket.payment_status,
        registrationDate: ticket.registration_date,
        checkedInAt: ticket.checked_in_at,
        qrCodeToken: ticket.qr_code_token,
        eventStartDate: ticket.events?.[0]?.start_date,
        eventEndDate: ticket.events?.[0]?.end_date
      }));
    } catch (error) {
      console.error('Error fetching upcoming tickets:', error);
      return [];
    }
  }

  /**
   * Check if a user has any orders/tickets
   */
  async hasOrders(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.getSupabase()
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .limit(1);

      if (!error && data && data.length > 0) return true;

      const { data: tickets, error: ticketsError } = await this.getSupabase()
        .from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .limit(1);

      return !ticketsError && tickets && tickets.length > 0;
    } catch (error) {
      console.error('Error checking orders:', error);
      return false;
    }
  }

  /**
   * Get order summary for display
   */
  async getOrderSummary(userId: string): Promise<OrderStatusSummary> {
    try {
      const { data: orders } = await this.getSupabase()
        .from('orders')
        .select('status')
        .eq('user_id', userId);

      const { data: tickets } = await this.getSupabase()
        .from('event_registrations')
        .select('status, events!left(start_date)')
        .eq('user_id', userId);

      const now = new Date();
      const totalOrders = orders?.length || 0;
      const totalTickets = tickets?.length || 0;
      const pendingOrders = orders?.filter((o: { status: string }) => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter((o: { status: string }) => o.status === 'completed').length || 0;
      
      const upcomingTickets = tickets?.filter((t: { events: { start_date: string }[] | null }) => {
        const eventDate = t.events?.[0]?.start_date ? new Date(t.events[0].start_date) : null;
        return eventDate && eventDate > now;
      }).length || 0;

      const pastTickets = totalTickets - upcomingTickets;

      return {
        totalOrders,
        totalTickets,
        pendingOrders,
        completedOrders,
        upcomingTickets,
        pastTickets
      };
    } catch (error) {
      console.error('Error getting order summary:', error);
      return {
        totalOrders: 0,
        totalTickets: 0,
        pendingOrders: 0,
        completedOrders: 0,
        upcomingTickets: 0,
        pastTickets: 0
      };
    }
  }
}

// Export singleton
export const chatbotOrderService = new ChatbotOrderService();
