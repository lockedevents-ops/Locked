/**
 * Cart Service
 * --------------------------------------------------------------
 * Service for managing shopping cart operations for event merchandise
 */

import { createClient } from '@/lib/supabase/client/client';

export interface CartItem {
  id: string;
  user_id: string;
  event_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartParams {
  eventId: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  productQuantity?: number;
  quantity?: number;
}

class CartService {
  /**
   * Add item to cart or update quantity if already exists
   */
  async addToCart(params: AddToCartParams): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Please sign in to add items to cart' };
      }

      const { eventId, productId, productName, productPrice, productImage, productQuantity, quantity = 1 } = params;

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingItem) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (updateError) {
          console.error('Error updating cart item:', updateError);
          return { success: false, error: 'Failed to update cart' };
        }
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            event_id: eventId,
            product_id: productId,
            product_name: productName,
            product_price: productPrice,
            product_image: productImage,
            product_quantity: productQuantity,
            quantity
          });

        if (insertError) {
          console.error('Error adding to cart:', insertError);
          return { success: false, error: 'Failed to add to cart' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Cart service error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Get all cart items for current user
   */
  async getCartItems(): Promise<CartItem[]> {
    try {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cart items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCartItems:', error);
      return [];
    }
  }

  /**
   * Update quantity of cart item
   */
  async updateQuantity(cartItemId: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      if (quantity < 1) {
        return { success: false, error: 'Quantity must be at least 1' };
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        console.error('Error updating quantity:', error);
        return { success: false, error: 'Failed to update quantity' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateQuantity:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        console.error('Error removing from cart:', error);
        return { success: false, error: 'Failed to remove item' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeFromCart:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Clear all cart items for current user
   */
  async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        return { success: false, error: 'Failed to clear cart' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in clearCart:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  /**
   * Get cart total
   */
  getCartTotal(items: CartItem[]): number {
    return items.reduce((total, item) => total + (item.product_price * item.quantity), 0);
  }

  /**
   * Get cart item count
   */
  getCartItemCount(items: CartItem[]): number {
    return items.reduce((total, item) => total + item.quantity, 0);
  }
}

export const cartService = new CartService();
