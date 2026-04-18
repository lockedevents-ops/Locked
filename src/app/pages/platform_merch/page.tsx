"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Package, 
  Shirt, 
  Star, 
  TrendingUp, 
  Users,
  Shield,
  Truck,
  Heart,
  Sparkles,
  Store,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

/**
 * Platform Merch Store Page
 * 
 * This is the OFFICIAL LOCKED PLATFORM merchandise store.
 * Event organizers will have their own separate merch stores on their event pages.
 * 
 * Future Integration Points:
 * - API Route: /api/platform-merch/products (GET all products)
 * - API Route: /api/platform-merch/products/:id (GET single product)
 * - API Route: /api/platform-merch/cart (POST add to cart)
 * - API Route: /api/platform-merch/checkout (POST checkout)
 * - Database Tables: platform_merch_products, platform_merch_categories, platform_merch_orders
 */

type CategoryId = 'all' | 'apparel' | 'accessories' | 'featured';

interface Category {
  id: CategoryId;
  name: string;
  icon: React.ReactNode;
}

export default function PlatformMerchStorePage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');

  const categories: Category[] = [
    { id: 'all', name: 'All Products', icon: <Package className="w-4 h-4" /> },
    { id: 'apparel', name: 'Apparel', icon: <Shirt className="w-4 h-4" /> },
    { id: 'accessories', name: 'Accessories', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'featured', name: 'Featured', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} 
          />
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Store className="w-5 h-5" />
              <span className="text-sm font-medium">Official Platform Store</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-300">
              Locked Platform Merch
            </h1>
            
            <p className="text-lg md:text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
              Exclusive branded merchandise. Represent the platform you love, support the community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter Bar - Non-Sticky for better UX */}
      <section className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-sm font-medium text-neutral-500 whitespace-nowrap mr-2">Browse:</span>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium text-sm cursor-pointer ${
                  selectedCategory === category.id
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {category.icon}
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        {/* Coming Soon Section - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-8 md:p-12 text-center border border-neutral-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-neutral-700" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Store Opening Soon!
            </h2>
            
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              We're curating an exclusive collection of premium Locked platform merchandise. 
              Be the first to know when we launch and get special early access.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium shadow-md hover:shadow-lg cursor-pointer">
                Get Notified
              </button>
              <Link 
                href="/" 
                className="px-8 py-3 bg-white text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium border border-neutral-200 cursor-pointer"
              >
                Explore Events
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 text-center border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-100 rounded-full mb-4">
              <Shield className="w-7 h-7 text-neutral-700" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Premium Quality
            </h3>
            <p className="text-sm text-neutral-600">
              High-quality materials in every product
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 text-center border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-100 rounded-full mb-4">
              <Truck className="w-7 h-7 text-neutral-700" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Fast Delivery
            </h3>
            <p className="text-sm text-neutral-600">
              Quick shipping across Ghana
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl p-6 text-center border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-100 rounded-full mb-4">
              <Heart className="w-7 h-7 text-neutral-700" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Community First
            </h3>
            <p className="text-sm text-neutral-600">
              Supporting the platform you love
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl p-6 text-center border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-100 rounded-full mb-4">
              <TrendingUp className="w-7 h-7 text-neutral-700" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Limited Editions
            </h3>
            <p className="text-sm text-neutral-600">
              Exclusive drops and rare items
            </p>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neutral-400 rounded-full blur-3xl" />
          </div>
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Users className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Join the Waitlist
            </h2>
            
            <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto">
              Be among the first to shop when we launch. Get exclusive early access and special launch discounts.
            </p>
            
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-neutral-900 rounded-lg hover:bg-neutral-100 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer">
              Join Waitlist
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Hidden Product Grid (for future use) */}
        <div className="hidden mt-16">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-8">Products</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Product cards will go here */}
          </div>
        </div>
      </section>

      {/* Info Banner */}
      <section className="bg-neutral-900 text-white py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm">
            <span className="font-semibold">Note:</span> This is the official Locked platform store. Event organizers will have their own merchandise stores available on their event pages.
          </p>
        </div>
      </section>
    </div>
  );
}
