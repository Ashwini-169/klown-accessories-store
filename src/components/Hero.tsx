import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { Star, Truck, Shield, Zap, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { getRecommendedCoupons } from '../utils/couponUtils';
import { Coupon } from '../types';
import { io } from 'socket.io-client';

interface Banner {
  id: string;
  type: string;
  couponIds: string[];
}

interface HeroImage {
  id: string;
  url: string;
  active: boolean;
}

interface HeroImagesData {
  id: string;
  images: HeroImage[];
  autoSlideInterval: number;
  overlayOpacity: number;
  overlayColor: string;
}

const Hero: React.FC = () => {
  const { coupons } = useProducts();
  const { items, getTotalPrice, getTotalItems } = useCart();
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cartRecommendedCoupons, setCartRecommendedCoupons] = useState<Coupon[]>([]);
  const [specialCoupons, setSpecialCoupons] = useState<Coupon[]>([]);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [autoSlideInterval, setAutoSlideInterval] = useState(5000);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlayColor, setOverlayColor] = useState('#000000');
  const [heroContent, setHeroContent] = useState<{
    title: string;
    subtitle: string;
    description: string;
    features: { id: string; icon: string; text: string; color: string; }[];
    buttonText: string;
    buttonLink: string;
  }>({
    title: "KLOWN",
    subtitle: "Metal Accessories",
    description: "Premium steel bracelets, rings, necklaces & more for the modern man",
    features: [
      { id: "feature1", icon: "Star", text: "Premium Quality", color: "yellow" },
      { id: "feature2", icon: "Truck", text: "Fast Delivery", color: "blue" },
      { id: "feature3", icon: "Shield", text: "Lifetime Warranty", color: "green" },
      { id: "feature4", icon: "Zap", text: "Student Discounts", color: "purple" }
    ],
    buttonText: "Shop Collection",
    buttonLink: "#products"
  });
  
  // Filter for admin recommended coupons and active coupons
  const adminRecommendedCoupons = coupons.filter(coupon => coupon.active && coupon.adminRecommended);
  const activeCoupons = coupons.filter(coupon => coupon.active);
  
  // Load banner data to get special coupons, hero content, and hero images
  useEffect(() => {
    const loadBannerData = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/banner.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const banner = data.data[0] as Banner;
            // Find selected coupons
            if (banner.couponIds && banner.couponIds.length > 0) {
              const selectedCoupons = coupons.filter(coupon => 
                banner.couponIds.includes(coupon.id) && coupon.active
              );
              setSpecialCoupons(selectedCoupons);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load banner data:", error);
      }
    };
    
    const loadHeroContent = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/banner-admin.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const content = data.data[0];
            setHeroContent({
              title: content.title || "KLOWN",
              subtitle: content.subtitle || "Metal Accessories",
              description: content.description || "Premium accessories for the modern man",
              features: content.features || [],
              buttonText: content.buttonText || "Shop Collection",
              buttonLink: content.buttonLink || "#products"
            });
          }
        }
      } catch (error) {
        console.error("Failed to load hero content:", error);
      }
    };
    
    const loadHeroImages = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/hero-images.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const heroData = data.data[0] as HeroImagesData;
            // Filter only active images
            const activeImages = heroData.images.filter(img => img.active);
            setHeroImages(activeImages);
            setAutoSlideInterval(heroData.autoSlideInterval || 5000);
            setOverlayOpacity(heroData.overlayOpacity !== undefined ? heroData.overlayOpacity : 0.7);
            setOverlayColor(heroData.overlayColor || '#000000');
          }
        }
      } catch (error) {
        console.error("Failed to load hero images:", error);
      }
    };
    
    if (coupons.length > 0) {
      loadBannerData();
    }
    
    loadHeroContent();
    loadHeroImages();
    
    // Set up Socket.IO for real-time updates
    const hostname = window.location.hostname;
    const socket = io(`http://${hostname}:3001`);
    
    // Listen for banner data changes
    socket.on('bannerChanged', () => {
      console.log('Banner data changed, refreshing...');
      loadBannerData();
    });
    
    // Listen for banner-admin data changes
    socket.on('bannerAdminChanged', () => {
      console.log('Hero content changed, refreshing...');
      loadHeroContent();
    });
    
    // Listen for hero images changes
    socket.on('heroImagesChanged', () => {
      console.log('Hero images changed, refreshing...');
      loadHeroImages();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [coupons]);
  
  // Auto rotate through hero images
  useEffect(() => {
    if (heroImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % heroImages.length);
    }, autoSlideInterval);
    
    return () => clearInterval(interval);
  }, [heroImages.length, autoSlideInterval]);
  
  // Get cart-based coupon recommendations
  useEffect(() => {
    if (items.length > 0 && coupons.length > 0) {
      const recommended = getRecommendedCoupons(
        items,
        coupons,
        getTotalPrice(),
        getTotalItems()
      );
      
      // Sort by potential savings (most savings first)
      const totalPrice = getTotalPrice();
      recommended.sort((a, b) => {
        if (a.adminRecommended && !b.adminRecommended) return -1;
        if (!a.adminRecommended && b.adminRecommended) return 1;
        
        // Sort based on calculated savings potential
        const savingsA = calculateSavings(a, totalPrice);
        const savingsB = calculateSavings(b, totalPrice);
        
        // Higher savings first
        return savingsB - savingsA;
      });
      
      setCartRecommendedCoupons(recommended);
    } else {
      setCartRecommendedCoupons([]);
    }
  }, [items, coupons, getTotalPrice, getTotalItems]);
  
  // Combine special offers and recommended coupons for the rotating display
  const allDisplayItems = [
    // Priority: 1. Special coupons from banner.json, 2. Cart recommendations, 3. Admin recommendations
    ...(specialCoupons.length > 0
      ? specialCoupons.map(coupon => ({ type: 'coupon', item: coupon }))
      : cartRecommendedCoupons.length > 0 
        ? cartRecommendedCoupons.slice(0, 3).map(coupon => ({ type: 'coupon', item: coupon }))
        : adminRecommendedCoupons.map(coupon => ({ type: 'coupon', item: coupon })))
  ];
  
  const currentItem = allDisplayItems.length > 0 ? allDisplayItems[currentOfferIndex % allDisplayItems.length] : null;
  
  // Auto-rotate through offers every 5 seconds if autoRotate is true
  useEffect(() => {
    if (!autoRotate || allDisplayItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentOfferIndex(prevIndex => (prevIndex + 1) % allDisplayItems.length);
    }, 5000); // Change offer every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoRotate, allDisplayItems.length]);
  
  // If user stays longer than 30 seconds, start showing all active offers
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAllOffers(true);
    }, 30000); // 30 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Calculate potential savings from a coupon
  const calculateSavings = (coupon: Coupon, totalPrice: number): number => {
    switch (coupon.type) {
      case 'percentage':
        return (totalPrice * coupon.discount) / 100;
      case 'fixed':
        return Math.min(coupon.discount, totalPrice); // Can't save more than the total
      case 'special':
        if (coupon.specialType === 'buyXgetY' && coupon.buyQuantity && coupon.getQuantity) {
          // Rough estimation of savings for buy X get Y
          return totalPrice * (coupon.getQuantity / (coupon.buyQuantity + coupon.getQuantity));
        }
        return 0;
      case 'gift':
        return coupon.giftValue || 0;
      default:
        return 0;
    }
  };
  
  // Format coupon text for display
  const formatCouponDisplay = (coupon: any) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.discount}% off: ${coupon.description}`;
      case 'fixed':
        return `₹${coupon.discount} off: ${coupon.description}`;
      case 'special':
        return coupon.title;
      case 'gift':
        return coupon.title;
      default:
        return coupon.description;
    }
  };
  
  // Get coupon icon based on type
  const getCouponIcon = (coupon: any) => {
    switch (coupon.type) {
      case 'percentage': return '💰';
      case 'fixed': return '💵';
      case 'special': return '🎁';
      case 'gift': return '🎉';
      default: return '🏷️';
    }
  };
  
  // Helper function to get the correct icon color for inline styling
  const getIconColorClass = (color: string): string => {
    // Instead of using dynamic class names (which causes build issues with Tailwind),
    // return a fixed class and apply color as inline style
    return "h-4 w-4"; // Base sizing only
  };
  
  // Helper function to get color value from color name
  const getColorValue = (color: string): string => {
    const colorMap: Record<string, string> = {
      'yellow': '#FBBF24', // yellow-400
      'blue': '#60A5FA',   // blue-400
      'green': '#34D399',  // green-400
      'purple': '#A78BFA', // purple-400
      'red': '#F87171',    // red-400
      'pink': '#F472B6',   // pink-400
      'indigo': '#818CF8', // indigo-400
      'gray': '#9CA3AF'    // gray-400
    };
    
    return colorMap[color] || colorMap.yellow; // Default to yellow if color not found
  };

  return (
    <div className="relative">
      {/* Rotating offer display */}
      {currentItem && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-2 px-4 overflow-hidden">
          <div className="relative flex items-center">
            <button 
              onClick={() => {
                setAutoRotate(false);
                setCurrentOfferIndex(prevIndex => 
                  prevIndex === 0 ? allDisplayItems.length - 1 : prevIndex - 1
                );
              }}
              className="hidden sm:flex absolute left-2 p-1 rounded-full bg-white/30 hover:bg-white/50 z-10"
              aria-label="Previous offer"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="w-full overflow-hidden">
              <div key={currentOfferIndex} className="text-center animate-fadeIn">
                <p className="font-semibold text-sm sm:text-base">
                  <>
                    <span className="mr-1">✨</span>
                    {getCouponIcon(currentItem.item)} {formatCouponDisplay(currentItem.item)} - Use code: {(currentItem.item as Coupon).code || (currentItem.item as Coupon).id}
                  </>
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setAutoRotate(false);
                setCurrentOfferIndex(prevIndex => (prevIndex + 1) % allDisplayItems.length);
              }}
              className="hidden sm:flex absolute right-2 p-1 rounded-full bg-white/30 hover:bg-white/50 z-10"
              aria-label="Next offer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          {/* Dots indicator for multiple offers */}
          {allDisplayItems.length > 1 && (
            <div className="flex justify-center mt-1 gap-1">
              {allDisplayItems.map((_, index) => (
                <button 
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentOfferIndex % allDisplayItems.length ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                  onClick={() => {
                    setAutoRotate(false);
                    setCurrentOfferIndex(index);
                  }}
                  aria-label={`Go to offer ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* All active offers display (appears after 30 seconds) */}
      {showAllOffers && activeCoupons.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 shadow-xl rounded-lg p-3 max-w-xs md:max-w-sm animate-slideUp">
          <div className="flex justify-between items-center mb-2 border-b pb-2">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <span className="mr-2 text-yellow-500">🏷️</span> 
              {items.length > 0 ? "Recommended Offers" : "Active Offers"}
            </h4>
            <button 
              onClick={() => setShowAllOffers(false)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              aria-label="Close offers panel"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto pr-1 -mr-1">
            {/* Display cart-specific recommendations if cart has items */}
            {items.length > 0 && cartRecommendedCoupons.length > 0 ? (
              <div>
                <div className="mb-2 pb-1 border-b">
                  <p className="text-xs text-yellow-600 font-medium">Based on your cart</p>
                </div>
                <ul className="space-y-1.5">
                  {cartRecommendedCoupons.map(coupon => (
                    <li key={coupon.id} className="flex items-start p-2 border border-gray-100 rounded-md hover:bg-yellow-50 transition-colors">
                      <span className="mr-2.5 text-xl">{getCouponIcon(coupon)}</span>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium text-gray-800">{coupon.title}</p>
                          <div className="flex gap-1.5">
                            {specialCoupons.some(sc => sc.id === coupon.id) && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded flex items-center">
                                <span className="mr-0.5">✨</span> Special
                              </span>
                            )}
                            {coupon.adminRecommended && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Admin Pick</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{formatCouponDisplay(coupon)}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500">Use code: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{coupon.code || coupon.id}</span></p>
                          {coupon.validUntil && (
                            <p className="text-xs text-gray-400">Valid until: {new Date(coupon.validUntil).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {activeCoupons.map(coupon => (
                  <li key={coupon.id} className="flex items-start p-2 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors">
                    <span className="mr-2.5 text-xl">{getCouponIcon(coupon)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium text-gray-800">{coupon.title}</p>
                        <div className="flex gap-1.5">
                          {specialCoupons.some(sc => sc.id === coupon.id) && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded flex items-center">
                              <span className="mr-0.5">✨</span> Special
                            </span>
                          )}
                          {coupon.adminRecommended && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Admin Pick</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{formatCouponDisplay(coupon)}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">Use code: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{coupon.code || coupon.id}</span></p>
                        {coupon.validUntil && (
                          <p className="text-xs text-gray-400">Valid until: {new Date(coupon.validUntil).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Carousel background images - now with proper opacity transitions */}
        {heroImages.map((image, index) => (
          <div 
            key={image.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${image.url})` }}
          />
        ))}
        
        {/* Default background if no images */}
        {heroImages.length === 0 && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(https://images.pexels.com/photos/8838877/pexels-photo-8838877.jpeg?auto=compress&cs=tinysrgb&w=1200)` }}
          />
        )}
        
        {/* Overlay with customizable opacity and color */}
        <div 
          className="absolute inset-0 z-10"
          style={{ 
            backgroundColor: overlayColor,
            opacity: overlayOpacity
          }}
        />
        
        {/* Image carousel navigation dots */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                className={`h-2 w-2 rounded-full mx-1 ${
                  idx === currentImageIndex ? 'bg-white' : 'bg-white/40'
                }`}
                onClick={() => setCurrentImageIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              {heroContent.title}
              <span className="block text-3xl sm:text-4xl lg:text-5xl text-yellow-400 font-medium mt-2">
                {heroContent.subtitle}
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              {heroContent.description}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400 mb-8">
              {heroContent.features.map(feature => {
                // Map icon string to the actual component
                let IconComponent;
                switch (feature.icon) {
                  case 'Star': IconComponent = Star; break;
                  case 'Truck': IconComponent = Truck; break;
                  case 'Shield': IconComponent = Shield; break;
                  case 'Zap': IconComponent = Zap; break;
                  // Add more icon mappings as needed
                  default: IconComponent = Star;
                }
                
                // Get the color value for this feature
                const colorValue = getColorValue(feature.color);
                
                return (
                  <div key={feature.id} className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" style={{ color: colorValue }} />
                    <span>{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={() => {
              const targetElement = document.getElementById(heroContent.buttonLink.replace('#', ''));
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-full text-lg font-semibold hover:from-yellow-300 hover:to-orange-400 transition-all transform hover:scale-105 shadow-2xl"
          >
            {heroContent.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;