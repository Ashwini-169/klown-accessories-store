import { CartItem, Coupon } from '../types';

/**
 * Get coupon recommendations based on cart contents
 */
export const getRecommendedCoupons = (
  cart: CartItem[],
  coupons: Coupon[],
  totalPrice: number,
  totalItems: number
): Coupon[] => {
  if (cart.length === 0) return [];

  // Filter for active coupons only
  const activeCoupons = coupons.filter((coupon) => coupon.active);

  // Create a recommendation list based on cart metrics
  const recommendedCoupons = activeCoupons.filter((coupon) => {
    // Always include adminRecommended coupons
    if (coupon.adminRecommended) return true;

    // For percentage or fixed discounts that have a minimum amount requirement
    if ((coupon.type === 'percentage' || coupon.type === 'fixed') && coupon.minAmount) {
      return totalPrice >= coupon.minAmount;
    }

    // For special "buy X get Y" promotions
    if (coupon.type === 'special' && coupon.specialType === 'buyXgetY' && coupon.minQuantity) {
      return totalItems >= coupon.minQuantity;
    }

    // For mystery gift coupons
    if (coupon.type === 'gift' && coupon.specialType === 'mysteryGift' && coupon.minAmount) {
      return totalPrice >= coupon.minAmount;
    }

    return false;
  });

  // Sort by relevance (most valuable or most applicable first)
  return recommendedCoupons.sort((a, b) => {
    // Prioritize adminRecommended coupons
    if (a.adminRecommended && !b.adminRecommended) return -1;
    if (!a.adminRecommended && b.adminRecommended) return 1;

    // Prioritize percentage discounts for high value carts
    if (a.type === 'percentage' && b.type === 'percentage') {
      return b.discount - a.discount; // Higher discount first
    }

    // For fixed discounts, compare the actual discount amount
    if (a.type === 'fixed' && b.type === 'fixed') {
      return b.discount - a.discount;
    }

    // Special offers and gifts get higher priority for qualifying carts
    if (a.type === 'special' || a.type === 'gift') return -1;
    if (b.type === 'special' || b.type === 'gift') return 1;

    return 0;
  });
};

/**
 * Format a coupon for display
 */
export const formatCouponDisplay = (coupon: Coupon): string => {
  switch (coupon.type) {
    case 'percentage':
      return `${coupon.discount}% off: ${coupon.description}`;
    case 'fixed':
      return `₹${coupon.discount} off: ${coupon.description}`;
    case 'special':
      if (coupon.specialType === 'buyXgetY') {
        return `${coupon.title}: ${coupon.description}`;
      }
      return coupon.description;
    case 'gift':
      return `${coupon.title}: ${coupon.description}`;
    default:
      return coupon.description;
  }
};

/**
 * Get a visual indicator icon/emoji for coupon type
 */
export const getCouponIcon = (coupon: Coupon): string => {
  switch (coupon.type) {
    case 'percentage':
      return '💰';
    case 'fixed':
      return '💵';
    case 'special':
      return '🎁';
    case 'gift':
      return '🎉';
    default:
      return '🏷️';
  }
};
