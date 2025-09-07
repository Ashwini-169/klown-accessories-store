import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, Search, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface MobileProps {
  isMobile: boolean;
  onCategorySelect: (category: string) => void;
  selectedCategory: string;
  toggleCart: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

const Mobile: React.FC<MobileProps> = ({ 
  isMobile, 
  onCategorySelect, 
  selectedCategory, 
  toggleCart,
  onSearch,
  searchQuery: globalSearchQuery
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const { getTotalItems } = useCart();
  
  // Update local search query when global changes
  useEffect(() => {
    setLocalSearchQuery(globalSearchQuery);
  }, [globalSearchQuery]);

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Categories
  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'bracelets', name: 'Bracelets' },
    { id: 'rings', name: 'Rings' },
    { id: 'necklaces', name: 'Necklaces' },
    { id: 'earrings', name: 'Earrings' },
    { id: 'keyrings', name: 'Keyrings' }
  ];

  // If not mobile, don't render anything
  if (!isMobile) return null;

  return (
    <div className="mobile-optimization">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left: Menu Button or Back Button */}
            {isSearchOpen ? (
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  if (localSearchQuery) {
                    setLocalSearchQuery('');
                    onSearch('');
                  }
                }}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <Menu size={20} />
              </button>
            )}
            
            {/* Center: Logo or Search Bar */}
            {isSearchOpen ? (
              <div className="flex-1 mx-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={localSearchQuery}
                  onChange={(e) => {
                    setLocalSearchQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900">KLOWN</h1>
              </div>
            )}
            
            {/* Right: Icons */}
            <div className="flex items-center">
              {!isSearchOpen && (
                <>
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Search size={20} />
                  </button>
                  <button 
                    onClick={toggleCart}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
                  >
                    <ShoppingBag size={20} />
                    {getTotalItems() > 0 && (
                      <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-yellow-500 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {getTotalItems()}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile Category Scroll */}
          {!isSearchOpen && (
            <div className="overflow-x-auto py-2 -mx-4 px-4 scrollbar-hide">
              <div className="flex space-x-4 whitespace-nowrap pb-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedCategory === category.id
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50">
          <div className="mobile-menu-container fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white shadow-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="py-6">
              <ul>
                <li className="px-4 py-3 border-b border-gray-100">
                  <a href="/" className="text-gray-800 font-medium hover:text-yellow-500">
                    Home
                  </a>
                </li>
                {categories.map((category) => (
                  <li key={category.id} className="px-4 py-3 border-b border-gray-100">
                    <button
                      onClick={() => {
                        onCategorySelect(category.id);
                        setIsMenuOpen(false);
                      }}
                      className={`text-left w-full ${
                        selectedCategory === category.id
                          ? 'text-yellow-500 font-medium'
                          : 'text-gray-800 hover:text-yellow-500'
                      }`}
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
                <li className="px-4 py-3 border-b border-gray-100">
                  <a href="#" className="text-gray-800 hover:text-yellow-500">
                    About Us
                  </a>
                </li>
                <li className="px-4 py-3 border-b border-gray-100">
                  <a href="#" className="text-gray-800 hover:text-yellow-500">
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
            
            <div className="absolute bottom-0 w-full p-4 border-t">
              <button
                onClick={() => {
                  toggleCart();
                  setIsMenuOpen(false);
                }}
                className="w-full bg-yellow-400 text-black py-2.5 rounded-md font-medium hover:bg-yellow-500 transition-all flex items-center justify-center"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                View Cart
                {getTotalItems() > 0 && (
                  <span className="ml-2 bg-white text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              
              <div className="flex justify-center mt-4">
                <a href="#" className="text-gray-600 hover:text-yellow-500">Help</a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile styling is now handled through Tailwind classes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Custom CSS for mobile optimization */
        @media (max-width: 767px) {
          .product-card {
            padding: 0.75rem;
          }
          
          .product-title {
            font-size: 0.875rem;
          }
          
          .product-price {
            font-size: 0.9375rem;
          }
          
          /* Hide scrollbar but allow scrolling */
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
        }
        `
      }} />
    </div>
  );
};

export default Mobile;