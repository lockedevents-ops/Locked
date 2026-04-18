/**
 * Order Service
 * --------------------------------------------------------------
 * Service for managing order operations and history
 */

import { createClient } from '@/lib/supabase/client/client';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  event_id: string | null;
  order_number: string;
  order_type: 'ticket' | 'merchandise' | 'combo';
  ticket_id?: string;
  ticket_name?: string;
  ticket_quantity?: number;
  ticket_price?: number;
  total_amount: number;
  payment_method: 'hubtel' | 'keys' | 'free';
  payment_reference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  order_items?: OrderItem[];
}

export interface CreateOrderParams {
  event_id?: string;
  order_type: 'ticket' | 'merchandise' | 'combo';
  ticket_id?: string;
  ticket_name?: string;
  ticket_quantity?: number;
  ticket_price?: number;
  merchandise_items?: Array<{
    product_id: string;
    product_name: string;
    product_price: number;
    product_image?: string;
    quantity: number;
  }>;
  total_amount: number;
  payment_method: 'hubtel' | 'keys' | 'free';
  payment_reference?: string;
}

class OrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `ORD-${year}${month}${day}-${random}`;
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderParams): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const orderNumber = this.generateOrderNumber();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          event_id: orderData.event_id,
          order_number: orderNumber,
          order_type: orderData.order_type,
          ticket_id: orderData.ticket_id,
          ticket_name: orderData.ticket_name,
          ticket_quantity: orderData.ticket_quantity,
          ticket_price: orderData.ticket_price,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          payment_reference: orderData.payment_reference,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Order creation error:', orderError);
        return { success: false, error: 'Failed to create order' };
      }

      // Add merchandise items if any
      if (orderData.merchandise_items && orderData.merchandise_items.length > 0) {
        const items = orderData.merchandise_items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          product_image: item.product_image,
          quantity: item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items);

        if (itemsError) {
          console.error('Order items error:', itemsError);
          // Don't fail the entire order if items fail
        }
      }

      return { success: true, orderId: order.id, orderNumber: orderNumber };
    } catch (error) {
      console.error('Order service error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(): Promise<Order[]> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      return (orders || []) as Order[];
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      return [];
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        return null;
      }

      return order as Order;
    } catch (error) {
      console.error('Error in getOrder:', error);
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    status: Order['status']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: 'Failed to update status' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return { success: false, error: 'An error occurred' };
    }
  }
}

export const orderService = new OrderService();
