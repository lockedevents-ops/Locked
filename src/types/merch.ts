/**
 * Merchandise Store Types
 * 
 * Type definitions for the platform merchandise store.
 * These types align with the database schema in sql/migrations/merch_store.sql
 */

// ============================================================================
// CATEGORIES
// ============================================================================
export interface MerchCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCTS
// ============================================================================
export interface MerchProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  
  // Pricing
  price: number;
  compare_at_price?: number; // Original price for sale items
  cost_price?: number;
  
  // Category
  category_id?: string;
  category?: MerchCategory;
  
  // Images
  images: string[];
  primary_image?: string;
  
  // Variants
  sizes: string[];
  colors: ProductColor[];
  variants?: MerchProductVariant[];
  
  // Inventory
  stock: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  
  // Metadata
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  
  // Visibility
  active: boolean;
  featured: boolean;
  featured_order?: number;
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  
  // Stats
  view_count: number;
  purchase_count: number;
  rating: number;
  review_count: number;
  
  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

// ============================================================================
// PRODUCT VARIANTS
// ============================================================================
export interface MerchProductVariant {
  id: string;
  product_id: string;
  
  // Variant details
  size?: string;
  color?: string;
  sku?: string;
  
  // Pricing
  price?: number;
  compare_at_price?: number;
  
  // Inventory
  stock: number;
  
  // Image
  image?: string;
  
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ORDERS
// ============================================================================
export interface MerchOrder {
  id: string;
  order_number: string;
  
  // Customer
  user_id: string;
  
  // Order details
  status: OrderStatus;
  
  // Pricing
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  
  // Shipping
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address_line_1?: string;
  shipping_address_line_2?: string;
  shipping_city?: string;
  shipping_region?: string;
  shipping_country: string;
  shipping_postal_code?: string;
  
  // Tracking
  tracking_number?: string;
  carrier?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  
  // Payment
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference?: string;
  paid_at?: string;
  
  // Notes
  customer_notes?: string;
  admin_notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  refunded_at?: string;
  
  // Relations
  items?: MerchOrderItem[];
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 
  | 'momo'
  | 'card'
  | 'cash_on_delivery';

export type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

// ============================================================================
// ORDER ITEMS
// ============================================================================
export interface MerchOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  
  // Item details
  product_name: string;
  size?: string;
  color?: string;
  sku?: string;
  
  // Pricing
  unit_price: number;
  quantity: number;
  subtotal: number;
  
  created_at: string;
  
  // Relations
  product?: MerchProduct;
  variant?: MerchProductVariant;
}

// ============================================================================
// CART
// ============================================================================
export interface MerchCartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  
  // Relations (populated by joins)
  product?: MerchProduct;
  variant?: MerchProductVariant;
}

// ============================================================================
// REVIEWS
// ============================================================================
export interface MerchReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id?: string;
  
  rating: number;
  title?: string;
  comment?: string;
  
  // Moderation
  approved: boolean;
  moderated_by?: string;
  moderated_at?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

// ============================================================================
// API RESPONSES
// ============================================================================
export interface ProductsResponse {
  products: MerchProduct[];
  total: number;
  hasMore: boolean;
}

export interface ProductResponse {
  product: MerchProduct;
}

export interface OrdersResponse {
  orders: MerchOrder[];
  total: number;
  hasMore: boolean;
}

export interface OrderResponse {
  order: MerchOrder;
}

export interface CartResponse {
  items: MerchCartItem[];
  subtotal: number;
  item_count: number;
}

// ============================================================================
// FILTERS & PARAMS
// ============================================================================
export interface ProductFilters {
  category?: string;
  featured?: boolean;
  inStock?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular' | 'rating';
}

export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// FORM DATA
// ============================================================================
export interface CreateProductData {
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  category_id?: string;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  stock: number;
  featured?: boolean;
  sku?: string;
  weight?: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  active?: boolean;
}

export interface CreateOrderData {
  items: {
    product_id: string;
    variant_id?: string;
    quantity: number;
  }[];
  shipping_address: {
    name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    region: string;
    country: string;
    postal_code?: string;
  };
  payment_method: PaymentMethod;
  customer_notes?: string;
}

export interface AddToCartData {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface CreateReviewData {
  product_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment?: string;
}
