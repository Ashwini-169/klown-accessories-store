import React from 'react';
import { Coupon } from '../../types';
import { Percent, DollarSign, Tag, Gift } from 'lucide-react';

interface CouponDisplayProps {
  coupon: Coupon;
}

const CouponDisplay: React.FC<CouponDisplayProps> = ({ coupon }) => {
  const formatDiscountText = (): string => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.discount}% off${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`;
        
      case 'fixed':
        return `₹${coupon.discount} off`;
        
      case 'special':
        if (coupon.specialType === 'buyXgetY' && coupon.buyQuantity && coupon.getQuantity) {
          return `Buy ${coupon.buyQuantity} Get ${coupon.getQuantity} Free`;
        } else if (coupon.specialType === 'bundle' && coupon.minQuantity) {
          return `Bundle: ${coupon.discount < 100 ? `${coupon.discount}% off` : `₹${coupon.discount} off`} on ${coupon.minQuantity}+ items`;
        }
        return 'Special offer';
        
      case 'gift':
        let text = '';
        
        // Add discount text if applicable
        if (coupon.discount > 0) {
          text = coupon.discount < 100 
            ? `${coupon.discount}% off` 
            : `₹${coupon.discount} off`;
        }
        
        // Add gift description
        if (coupon.giftDescription) {
          text += text ? ` + ${coupon.giftDescription}` : coupon.giftDescription;
        } else {
          text += text ? ' + Free Gift' : 'Free Gift';
        }
        
        return text;
        
      default:
        return 'Unknown discount type';
    }
  };

  const getIcon = () => {
    switch (coupon.type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed':
        return <DollarSign className="h-4 w-4" />;
      case 'special':
        return <Tag className="h-4 w-4" />;
      case 'gift':
        return <Gift className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <span className="text-blue-600">{getIcon()}</span>
      <span>{formatDiscountText()}</span>
    </div>
  );
};

export default CouponDisplay;
