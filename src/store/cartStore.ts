/**
 * Cart Store (Zustand)
 * --------------------------------------------------------------
 * Global state management for shopping cart
 */

import { create } from 'zustand';
import { cartService, type CartItem } from '@/services/cartService';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  isOpen: boolean;
  
  // Actions
  loadCart: () => Promise<void>;
  addToCart: (params: {
    eventId: string;
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    productQuantity?: number;
    quantity?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  getItemsForEvent: (eventId: string) => CartItem[];
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,
  isOpen: false,

  loadCart: async () => {
    set({ isLoading: true });
    try {
      const items = await cartService.getCartItems();
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Error loading cart:', error);
      set({ isLoading: false });
    }
  },

  addToCart: async (params) => {
    // Optimistic update - add to UI immediately  
    // Create temporary item for instant feedback
    const tempItem = {
      id: `temp-${Date.now()}`, // Temporary ID
      user_id: 'temp',
      event_id: params.eventId,
      product_id: params.productId,
      product_name: params.productName,
      product_price: params.productPrice,
      product_image: params.productImage || null,
      quantity: params.quantity || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if item already exists
    const existingItem = get().items.find(
      item => item.product_id === params.productId && item.event_id === params.eventId
    );

    if (existingItem) {
      // Update quantity optimistically
      set(state => ({
        items: state.items.map(item =>
          item.product_id === params.productId && item.event_id === params.eventId
            ? { ...item, quantity: item.quantity + (params.quantity || 1) }
            : item
        )
      }));
    } else {
      // Add new item optimistically
      set(state => ({
        items: [...state.items, tempItem]
      }));
    }

    // Sync with database in background
    const result = await cartService.addToCart(params);
    
    if (result.success) {
      // Reload cart to get correct IDs from database and confirm state
      get().loadCart();
    } else {
      // Rollback on error
      if (existingItem) {
        set(state => ({
          items: state.items.map(item =>
            item.product_id === params.productId && item.event_id === params.eventId
              ? { ...item, quantity: existingItem.quantity }
              : item
          )
        }));
      } else {
        set(state => ({
          items: state.items.filter(item => item.id !== tempItem.id)
        }));
      }
    }
    
    return result;
  },

  updateQuantity: async (cartItemId, quantity) => {
    // Optimistic update - update UI immediately
    set(state => ({
      items: state.items.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      )
    }));
    
    // Sync with database in background
    const result = await cartService.updateQuantity(cartItemId, quantity);
    
    if (!result.success) {
      // Reload on error to sync with database state
      get().loadCart();
    }
  },

  removeItem: async (cartItemId) => {
    // Optimistic update - remove from UI immediately
    set(state => ({
      items: state.items.filter(item => item.id !== cartItemId)
    }));
    
    // Sync with database in background
    const result = await cartService.removeFromCart(cartItemId);
    
    if (!result.success) {
      // Reload on error to sync with database state
      get().loadCart();
    }
  },

  clearCart: async () => {
    // Optimistic update - clear UI immediately
    set({ items: [] });
    
    // Sync with database in background
    const result = await cartService.clearCart();
    
    if (!result.success) {
      // Reload on error to sync with database state
      get().loadCart();
    }
  },

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  getTotal: () => {
    const { items } = get();
    return cartService.getCartTotal(items);
  },

  getItemCount: () => {
    const { items } = get();
    return cartService.getCartItemCount(items);
  },

  getItemsForEvent: (eventId) => {
    const { items } = get();
    return items.filter(item => item.event_id === eventId);
  },
}));
