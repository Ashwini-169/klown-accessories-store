import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Crown, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  onCategorySelect: (category: string) => void;
  selectedCategory: string;
  toggleCart?: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onCategorySelect, 
  selectedCategory, 
  toggleCart,
  onSearch,
  searchQuery
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { getTotalItems } = useCart();

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'bracelets', name: 'Bracelets' },
    { id: 'rings', name: 'Rings' },
    { id: 'necklaces', name: 'Necklaces' },
    { id: 'earrings', name: 'Earrings' },
    { id: 'keyrings', name: 'Keyrings' }
  ];

  return (
    <>
      <header className="bg-black/95 backdrop-blur-sm text-white sticky top-0 z-40 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-yellow-400" />
              <h1 className="text-2xl font-bold tracking-tight">KLOWN</h1>
            </div>

            <nav className="hidden md:flex space-x-8">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'text-yellow-400 border-b-2 border-yellow-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Search icon & input */}
              <div className="relative hidden md:block">
                {isSearchOpen ? (
                  <div className="flex items-center bg-gray-800 rounded-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      placeholder="Search products..."
                      className="py-1.5 pl-3 pr-8 text-sm bg-gray-800 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-400 w-48"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        setIsSearchOpen(false);
                        if (searchQuery) onSearch('');
                      }} 
                      className="absolute right-2 text-gray-300 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                )}
              </div>
            
              <button
                onClick={toggleCart}
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <button
                className="md:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-800">
              <nav className="flex flex-col space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      onCategorySelect(category.id);
                      setIsMenuOpen(false);
                    }}
                    className={`text-left px-3 py-2 text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;