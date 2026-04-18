/**
 * Cart Modal Component
 * --------------------------------------------------------------
 * Slide-out drawer showing cart items with management controls
 */

'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedCheckoutModal } from '@/components/events/UnifiedCheckoutModal';

export function CartModal() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, clearCart, getTotal, getItemCount } = useCartStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const total = getTotal();
  const itemCount = getItemCount();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(itemId, newQuantity);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const handleDeleteItem = (itemId: string) => {
    removeItem(itemId);
    setItemToDelete(null);
  };

  // Prepare purchase details for UnifiedCheckoutModal (using new tickets array format)
  const purchaseDetails = items.length > 0 ? {
    tickets: [{
      ticket: {
        name: `Merchandise (${items.length} ${items.length === 1 ? 'item' : 'items'})`,
        price: total,
        type: 'merchandise'
      },
      quantity: 1,
      subtotal: total
    }],
    total: total
  } : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCart}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[101] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  <h2 className="text-lg font-bold">Shopping Cart</h2>
                  {itemCount > 0 && (
                    <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {itemCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeCart}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                      <ShoppingBag className="w-10 h-10 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">Your cart is empty</h3>
                    <p className="text-neutral-500 text-sm">Add some merchandise to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        <div className="flex gap-3">
                          {/* Product Image */}
                          <div className="w-20 h-20 bg-neutral-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {item.product_image ? (
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-neutral-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-neutral-900 line-clamp-2 mb-1">
                              {item.product_name}
                            </h4>
                            <p className="text-sm font-bold text-neutral-900 mb-2">
                              ₵{item.product_price.toFixed(2)}
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg">
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="p-1.5 hover:bg-neutral-100 rounded-l-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-sm font-semibold min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  className="p-1.5 hover:bg-neutral-100 rounded-r-lg transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={() => setItemToDelete(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Clear Cart Button */}
                    {items.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer font-medium"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t p-4 space-y-3">
                  {/* Total */}
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₵{total.toFixed(2)}</span>
                  </div>

                  {/* Checkout Button */}
                  <button
                    className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => {
                      closeCart();
                      setTimeout(() => setIsCheckoutOpen(true), 300);
                    }}
                  >
                    Proceed to Checkout
                  </button>

                  <p className="text-xs text-neutral-500 text-center">
                    Pay with Hubtel or Keys
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
        
        {/* Delete Item Confirmation Dialog */}
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[102] flex items-center justify-center p-4"
            onClick={() => setItemToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-2">Remove Item?</h3>
              <p className="text-neutral-600 mb-4">Are you sure you want to remove this item from your cart?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteItem(itemToDelete)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Clear Cart Confirmation Dialog */}
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[102] flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-2">Clear Cart?</h3>
              <p className="text-neutral-600 mb-4">Are you sure you want to remove all items from your cart?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCart}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Checkout Modal - Outside AnimatePresence with higher z-index */}
      <UnifiedCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          // Clear cart after successful purchase
          if (items.length === 0) {
            closeCart();
          }
        }}
        event={{
          id: 'merchandise-cart',
          title: 'Merchandise Purchase'
        }}
        purchaseDetails={purchaseDetails}
        isFree={false}
        cartItems={items}
      />
    </>
  );
}
