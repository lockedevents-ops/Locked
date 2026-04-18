/**
 * Cart Icon Component
 * --------------------------------------------------------------
 * Shopping cart icon with item count badge for navbar
 */

'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useEffect } from 'react';

export function CartIcon() {
  const { items, loadCart, openCart, getItemCount } = useCartStore();
  const itemCount = getItemCount();

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  return (
    <button
      onClick={openCart}
      className="relative p-2 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer inline-block"
      aria-label="Shopping cart"
    >
      <ShoppingCart className="w-5 h-5 text-white" />
      
      {/* Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
