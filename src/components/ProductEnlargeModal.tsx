import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ShoppingCart, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import LoadingIcon from './LoadingIcon';
import useModalTransition from '../hooks/useModalTransition';

interface ProductEnlargeModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const ProductEnlargeModal: React.FC<ProductEnlargeModalProps> = ({ product, isOpen, onClose }) => {
  const [selectedSize, setSelectedSize] = useState<string>(
    Object.entries(product.sizes).find(([_, info]) => info.available)?.[0] || ''
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [viewMode, setViewMode] = useState<'cover' | 'contain'>('cover');
  const { addToCart } = useCart();
  
  // Use the modal transition hook
  const { isVisible, isAnimating, handleClose } = useModalTransition({
    isOpen,
    onClose,
    transitionDuration: 200
  });

  // Filter available sizes
  const availableSizes = useMemo(() => {
    return Object.entries(product.sizes).filter(([_, info]) => info.available);
  }, [product.sizes]);

  // Check if selected size is out of stock
  const isOutOfStock = useMemo(() => {
    return selectedSize ? (product.sizes[selectedSize]?.stock || 0) === 0 : true;
  }, [product.sizes, selectedSize]);

  // Get valid image URLs (not empty strings)
  const validImages = product.images.filter(img => img && img.trim() !== '');
  const hasMultipleImages = validImages.length > 1;

  // Handle image navigation
  const nextImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };
  
  // Reset loading state when currentImageIndex changes
  React.useEffect(() => {
    setImageLoading(true);
  }, [currentImageIndex]);
  
  // Prevent body scrolling when modal is open
  React.useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  // Handle add to cart
  const handleAddToCart = () => {
    if (!isOutOfStock && selectedSize) {
      addToCart({
        productId: product.id,
        size: selectedSize,
        quantity: 1,
        price: product.price
      });
      // Optional: close the modal after adding to cart
      // handleClose();
    }
  };

  // Handle click outside to close
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black ${
        isAnimating && !isOpen ? 'animate-fadeOut' : 'animate-fadeIn'
      } ${isOpen ? 'bg-opacity-60' : 'bg-opacity-0'}`}
      onClick={handleOutsideClick}
    >
      <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative mx-4 md:mx-auto my-8 md:my-0 overflow-y-auto max-h-[90vh] ${
        isAnimating && !isOpen ? 'animate-scaleOut' : 'animate-scaleIn'
      }`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-3 right-3 bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 rounded-full w-8 h-8 flex items-center justify-center z-10 transition-colors duration-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image gallery */}
          <div className="md:w-1/2 relative">
            <div className="aspect-square flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden relative">
              {(imageLoading || imageError) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingIcon category={product.category} className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <img
                src={validImages[currentImageIndex] || '/placeholder-image.jpg'}
                alt={product.name}
                className={`w-full h-full object-${viewMode} transition-all duration-500 hover:scale-105 ${
                  imageLoading || imageError ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => {
                  setImageLoading(false);
                  setImageError(false);
                }}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </div>
            
            {hasMultipleImages && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                <button 
                  onClick={prevImage}
                  className="bg-white/70 hover:bg-white p-1 rounded-full shadow-md"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={nextImage}
                  className="bg-white/70 hover:bg-white p-1 rounded-full shadow-md"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            )}
            
            {/* View mode toggle */}
            <button 
              onClick={() => setViewMode(prev => prev === 'cover' ? 'contain' : 'cover')}
              className="absolute top-2 right-2 bg-white/70 hover:bg-white p-1.5 rounded-full shadow-md"
              title={viewMode === 'cover' ? 'Show full image' : 'Fill frame'}
            >
              {viewMode === 'cover' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            
            {/* Thumbnails */}
            {hasMultipleImages && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {validImages.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg border-2 flex-shrink-0 overflow-hidden relative
                      ${currentImageIndex === idx ? 'border-yellow-500' : 'border-gray-200'}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <LoadingIcon category={product.category} className="w-6 h-6 text-gray-400" />
                    </div>
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-cover relative z-10" 
                      onLoad={(e) => e.currentTarget.parentElement?.querySelector('div')?.classList.add('hidden')}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.classList.add('opacity-0');
                        target.parentElement?.querySelector('div')?.classList.remove('hidden');
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Product info */}
          <div className="md:w-1/2">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{product.name}</h2>
            <p className="text-gray-600 mb-4">{product.description}</p>
            
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-lg text-gray-500 line-through">₹{product.originalPrice}</span>
              )}
            </div>
            
            {product.discount > 0 && (
              <div className="mb-4 text-sm font-bold text-red-500">{product.discount}% OFF</div>
            )}
            
            {/* Size selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Size:</label>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(([size, sizeInfo]) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                      ${selectedSize === size 
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-800' 
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{size}</span>
                      <span className={`text-xs ${sizeInfo.stock > 5 ? 'text-green-600' : sizeInfo.stock > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                        {sizeInfo.stock > 0 ? `${sizeInfo.stock} left` : 'Out of stock'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Stock information for selected size */}
              {selectedSize && (
                <div className="mt-2 text-sm">
                  {product.sizes[selectedSize]?.stock > 5 ? (
                    <span className="text-green-600">In stock</span>
                  ) : product.sizes[selectedSize]?.stock > 0 ? (
                    <span className="text-orange-500 font-medium">Only {product.sizes[selectedSize]?.stock} left in stock - order soon</span>
                  ) : (
                    <span className="text-red-500 font-medium">Out of stock</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || availableSizes.length === 0}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                isOutOfStock || availableSizes.length === 0 || !selectedSize
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-300 hover:to-orange-400 transform hover:scale-105 shadow-lg'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>{isOutOfStock || !selectedSize ? 'Select a size' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEnlargeModal;