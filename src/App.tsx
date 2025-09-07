import React, { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ProductProvider, useProducts } from './context/ProductContext';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import Footer from './components/Footer';
import Mobile from './components/Mobile';
import Cart from './components/Cart';
import { Loader2 } from 'lucide-react';
import { cacheUtils } from './utils/cacheUtils';
import { initializeSocketListeners } from './utils/socketUtils';

// Lazy load admin components to prevent unnecessary loading on main page
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const InventoryManagement = lazy(() => import('./components/InventoryManagement'));

interface MainAppProps {
  products: any[]; // Using any for now, can be replaced with proper type
}

const MainApp: React.FC<MainAppProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if the device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIsMobile();
    
    // Add listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Filter products based on category and search query
  const filteredProducts = useMemo(() => {
    // First filter by category
    const categoryFiltered = selectedCategory === 'all' 
      ? products 
      : products.filter((product) => product.category === selectedCategory);
    
    // Then filter by search query if it exists
    if (!searchQuery.trim()) return categoryFiltered;
    
    const query = searchQuery.toLowerCase().trim();
    return categoryFiltered.filter(product => 
      product.name.toLowerCase().includes(query) || 
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.id.toLowerCase().includes(query)
    );
  }, [products, selectedCategory, searchQuery]);

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {isMobile ? (
        <Mobile 
          isMobile={isMobile}
          onCategorySelect={setSelectedCategory}
          selectedCategory={selectedCategory}
          toggleCart={toggleCart}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />
      ) : (
        <Header 
          onCategorySelect={setSelectedCategory} 
          selectedCategory={selectedCategory} 
          toggleCart={toggleCart}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />
      )}
      
      {/* Cart component is displayed for both mobile and desktop */}
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
      <Hero />
      
      <main id="products" className={`max-w-7xl mx-auto ${isMobile ? 'px-3 py-6' : 'px-4 sm:px-6 lg:px-8 py-12'}`}>
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-12'}`}>
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-gray-900 mb-2 sm:mb-4`}>
            {searchQuery ? 'Search Results' : 
              (selectedCategory === 'all' ? 'Complete Collection' : 
              selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1))}
          </h2>
          {searchQuery ? (
            <p className={`${isMobile ? 'text-sm' : 'text-xl'} text-gray-600`}>
              Found {filteredProducts.length} products matching "{searchQuery}"
            </p>
          ) : (
            <p className={`${isMobile ? 'text-sm' : 'text-xl'} text-gray-600`}>
              Premium metal accessories crafted for the modern man
            </p>
          )}
        </div>
        
        <ProductGrid products={filteredProducts} />
      </main>
      
      <Footer />
    </div>
  );
};

function App() {
  // Create a wrapper component to fetch and pass the products
  const MainAppWithProducts = () => {
    const { products } = useProducts();
    return <MainApp products={products} />;
  };
  
  // Initialize cache utilities and socket listeners on app mount
  useEffect(() => {
    // Set up listeners for data file changes
    cacheUtils.setupFileChangeListeners();
    
    // Set up socket.io listeners for server-pushed updates
    initializeSocketListeners();
    
    console.log('[App] Cache utilities and socket listeners initialized');
    
    // Add a timestamp query parameter to the page URL to bust cache on reload
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('t', Date.now().toString());
    window.history.replaceState({}, document.title, currentUrl.toString());
    
    // Listen for file change events
    const handleFileChange = () => {
      console.log('[App] Data file change detected, clearing cache in 2 seconds...');
      setTimeout(() => {
        console.log('[App] Clearing cache and reloading...');
        cacheUtils.clearCacheAndReload();
      }, 2000); // Delay to allow save to complete
    };
    
    // Add listeners for each data file type
    document.addEventListener('productDataChanged', handleFileChange);
    document.addEventListener('couponsUpdated', handleFileChange);
    document.addEventListener('bannerDataChanged', handleFileChange);
    
    return () => {
      document.removeEventListener('productDataChanged', handleFileChange);
      document.removeEventListener('couponsUpdated', handleFileChange);
      document.removeEventListener('bannerDataChanged', handleFileChange);
    };
  }, []);

  return (
    <ProductProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainAppWithProducts />} />
            <Route path="/admin" element={
              <Suspense fallback={
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <Loader2 className="h-12 w-12 text-yellow-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Loading Admin Dashboard...</h2>
                    <p className="text-gray-500">Please wait while we prepare your dashboard</p>
                  </div>
                </div>
              }>
                <AdminDashboard />
              </Suspense>
            } />
            <Route path="/inventory" element={
              <Suspense fallback={
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <Loader2 className="h-12 w-12 text-yellow-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Loading Inventory Management...</h2>
                    <p className="text-gray-500">Please wait while we prepare your inventory system</p>
                  </div>
                </div>
              }>
                <InventoryManagement />
              </Suspense>
            } />
          </Routes>
        </Router>
      </CartProvider>
    </ProductProvider>
  );
}

export default App;
