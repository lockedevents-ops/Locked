'use client';

import { useEffect, useState } from 'react';
import { orderService, type Order } from '@/services/orderService';
import { Package, Clock, CheckCircle, XCircle, RefreshCw, ShoppingBag, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/loaders/PageLoader';
import Link from 'next/link';

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadOrders();
    } else {
      setOrders([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getUserOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-neutral-600" />;
      case 'pending':
      case 'processing': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <Package className="w-5 h-5 text-neutral-600" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-neutral-100 text-neutral-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getOrderTypeIcon = (type: Order['order_type']) => {
    switch (type) {
      case 'ticket': return <Ticket className="w-4 h-4" />;
      case 'merchandise': return <ShoppingBag className="w-4 h-4" />;
      case 'combo': return <><Ticket className="w-4 h-4" /><ShoppingBag className="w-4 h-4" /></>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Order History</h1>
          <p className="text-neutral-600 mt-1">View all your ticket and merchandise purchases</p>
        </div>
        <button
          onClick={loadOrders}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <PageLoader message="Loading orders..." />
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <Package className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-neutral-900">No orders yet</h3>
          <p className="text-neutral-600 mb-6">Your order history will appear here</p>
          <Link 
            href="/pages/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-black transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div 
              key={order.id} 
              className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-neutral-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-neutral-900">{order.order_number}</span>
                      <div className="flex items-center gap-1 text-neutral-600">
                        {getOrderTypeIcon(order.order_type)}
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span 
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Order Items */}
              <div className="space-y-2 mb-4">
                {order.ticket_name && (
                  <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        {order.ticket_name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        × {order.ticket_quantity}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      ₵{order.ticket_price?.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {order.order_items && order.order_items.length > 0 && order.order_items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-900">
                        {item.product_name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        × {item.quantity}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      ₵{(item.product_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-neutral-600">
                    Payment: <span className="font-medium text-neutral-900 capitalize">{order.payment_method}</span>
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-600">Total</p>
                  <p className="text-xl font-bold text-neutral-900">₵{order.total_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
