export interface Product {
  id: string;
  name: string;
  category: 'bracelets' | 'rings' | 'necklaces' | 'earrings' | 'keyrings';
  price: number;
  originalPrice: number;
  description: string;
  images: string[];
  sizes: Record<string, { stock: number; available: boolean }>;
  featured: boolean;
  discount: number;
  rating?: {
    average: number;
    count: number;
  };
}

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
  isFreeGift?: boolean;
  giftValue?: number;  // Value of free gift items, for display purposes
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  paymentMethod: 'upi' | 'razorpay';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  createdAt: Date;
}

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: Date;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: number;
  type: 'percentage' | 'fixed' | 'special' | 'gift';
  minAmount?: number;
  minQuantity?: number;
  maxDiscount: number;
  validUntil: string;
  active: boolean;
  usageLimit: number;
  usedCount: number;
  isVisible?: boolean;
  adminRecommended?: boolean;
  
  // Special coupon fields
  specialType?: 'buyXgetY' | 'mysteryGift' | 'bundle';
  buyQuantity?: number;
  getQuantity?: number;
  
  // Gift coupon fields
  giftType?: 'product' | 'mystery' | 'custom';
  giftDescription?: string;
  giftProductId?: string;  // For specific product gifts
  giftValue?: number;      // Value of the gift
  giftImage?: string;      // URL to gift image
}