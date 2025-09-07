import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Crown, Package, Settings, BarChart3, Tag, Image, Loader2, Save, CheckCircle, Trash2, PackageOpen, Ticket, FileJson } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { productSyncUtils } from '../../utils/productSyncUtils';
import Inventory from '../Inventory';
import Cookies from 'js-cookie';

// Lazy load components to improve initial load time
const ProductManager = lazy(() => import('./ProductManager'));
const DeleteProduct = lazy(() => import('./DeleteProduct'));
const OfferManager = lazy(() => import('./OfferManager'));
const BannerManager = lazy(() => import('./BannerManager'));
const ContentManager = lazy(() => import('./ContentManager'));
const StatsOverview = lazy(() => import('./StatsOverview'));
const CreateCoupon = lazy(() => import('./CreateCoupon'));
const CouponJsonEditor = lazy(() => import('./CouponJsonEditor'));

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentDraftProducts, setCurrentDraftProducts] = useState<any[]>([]);
  const [cookieCleanupTimer, setCookieCleanupTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { products, updateProduct, deleteProduct, setProducts } = useProducts();
  
  // Initialize currentDraftProducts with products when component mounts
  useEffect(() => {
    if (products && products.length > 0 && currentDraftProducts.length === 0) {
      setCurrentDraftProducts([...products]);
    }
  }, [products]);
  
  // Check for auth cookie on component mount
  useEffect(() => {
    const authCookie = Cookies.get('admin_authenticated');
    if (authCookie === 'true') {
      setIsAuthenticated(true);
    }
    
    return () => {
      // Clear any existing timer when component unmounts
      if (cookieCleanupTimer) {
        clearTimeout(cookieCleanupTimer);
      }
    };
  }, []);

  const adminPassword = 'klown_admin_2025';

  const handleLogin = () => {
    setIsLoading(true);
    
    // Add a small delay to simulate authentication and prevent immediate re-renders
    setTimeout(() => {
      if (password === adminPassword) {
        // Set authenticated state
        setIsAuthenticated(true);
        setLoginAttempts(0);
        
        // Set authentication cookie (expires in 24 hours)
        Cookies.set('admin_authenticated', 'true', { expires: 1 });
        
        // Also set a session identifier for this login session
        Cookies.set('admin_session', `session_${Date.now()}`, { expires: 1 });
        
        console.log("[Admin] Authentication successful, cookies set");
      } else {
        setLoginAttempts(prev => prev + 1);
        alert('Invalid password');
      }
      setIsLoading(false);
    }, 800);
  };
  
  const handleLogout = () => {
    // Update UI state immediately
    setIsAuthenticated(false);
    
    // Store the session ID before clearing it
    const sessionId = Cookies.get('admin_session') || '';
    
    console.log(`[Admin] Logging out. Cookies will be cleared in 3 minutes for session: ${sessionId}`);
    
    // Show a notification that cookies will be cleared
    alert('You have been logged out. Cookies will be cleared in 3 minutes for security.');
    
    // Set a timer to clear cookies after 3 minutes
    if (cookieCleanupTimer) {
      clearTimeout(cookieCleanupTimer);
    }
    
    const timer = setTimeout(() => {
      console.log(`[Admin] Clearing cookies for session: ${sessionId} after 3 minutes`);
      Cookies.remove('admin_authenticated');
      Cookies.remove('admin_session');
      Cookies.remove('admin_preferences');
      console.log('[Admin] All admin cookies cleared');
    }, 3 * 60 * 1000); // 3 minutes
    
    setCookieCleanupTimer(timer);
  };
  
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || currentDraftProducts.length === 0) return;
    
    const confirmSave = confirm('Save all changes to products.json? This will update the data displayed on the website.');
    if (!confirmSave) return;
    
    setIsSaving(true);
    
    try {
      console.log('Saving products:', currentDraftProducts);
      
      // First identify products to delete (in original products but not in draft)
      const productsToDelete = products.filter(product => 
        !currentDraftProducts.some(draftProduct => draftProduct.id === product.id)
      );
      
      console.log(`Found ${productsToDelete.length} products to delete:`, 
        productsToDelete.map(p => `${p.id} (${p.name})`));
      
      // Save the draft products to the file using our sync utility
      const saveResult = await productSyncUtils.syncProducts(currentDraftProducts);
      
      if (saveResult) {
        // Create a completely new copy of products for the context to force a refresh
        const updatedProducts = [...currentDraftProducts];
        
        // Delete each product that was removed in the draft from the context
        for (const product of productsToDelete) {
          console.log(`Deleting product ${product.id} (${product.name}) from context`);
          deleteProduct(product.id);
          
          // Also dispatch individual deletion events for each deleted product
          document.dispatchEvent(new CustomEvent('productDeleted', { 
            detail: { 
              productId: product.id,
              deletedProduct: product
            } 
          }));
        }
        
        // Then update all products in the draft
        currentDraftProducts.forEach(draftProduct => {
          // This will update existing products and add new ones
          console.log(`Updating/adding product ${draftProduct.id} in context`);
          updateProduct(draftProduct);
        });
        
        console.log(`Deleted ${productsToDelete.length} products, updated/added ${currentDraftProducts.length} products`);
        
        // Force a refresh of any components using product data
        // This ensures ProductCard components will update with new data
        document.dispatchEvent(new CustomEvent('productsUpdated', { 
          detail: { 
            products: updatedProducts,
            deletedIds: productsToDelete.map(p => p.id)
          } 
        }));
        
        // Also dispatch a more specific event for saved products
        document.dispatchEvent(new CustomEvent('productsSaved', {
          detail: { 
            products: updatedProducts,
            deletedIds: productsToDelete.map(p => p.id)
          }
        }));
        
        // Show success message
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        throw new Error('Failed to save products to file');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      const hostname = window.location.hostname;
      const response = await fetch(`http://${hostname}:3001/api/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        console.log('Data manually refreshed from server');
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-gray-600">Enter password to access dashboard</p>
            {loginAttempts > 2 && (
              <p className="text-red-500 text-sm mt-2">
                Hint: Password is klown_admin_2025
              </p>
            )}
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              disabled={isLoading}
            />
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 rounded-lg font-semibold 
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:from-yellow-300 hover:to-orange-400'} 
                transition-all flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'stats', name: 'Overview', icon: BarChart3 },
    { id: 'products', name: 'Products', icon: Package },
    // Inventory tab hidden for now
    // { id: 'inventory', name: 'Inventory', icon: PackageOpen },
    { id: 'delete-product', name: 'Delete Product', icon: Trash2 },
    { id: 'offers', name: 'Offers', icon: Tag },
    { id: 'coupons', name: 'Coupons', icon: Ticket },
    { id: 'coupon-json', name: 'Edit Coupons JSON', icon: FileJson },
    { id: 'banner', name: 'Hero Images', icon: Image },
    { id: 'content', name: 'Hero Content', icon: Crown },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-black text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">KLOWN Admin</h1>
            
            {/* Show status badge when applicable */}
            {hasUnsavedChanges && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
            
            {saveSuccess && (
              <span className="flex items-center space-x-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                <span>Saved successfully</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Save button */}
            <button
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors
                ${hasUnsavedChanges 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 cursor-not-allowed text-gray-300'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            
            {/* Logout button */}
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Are you sure you want to logout?')) {
                    handleLogout();
                  }
                } else {
                  handleLogout();
                }
              }}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <nav className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-yellow-400 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-6">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-yellow-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading component...</p>
              </div>
            }>
              {activeTab === 'stats' && <StatsOverview />}
              
              {activeTab === 'products' && (
                <ProductManager 
                  onChangesMade={() => setHasUnsavedChanges(true)}
                  draftMode={true}
                  saveDisabled={isSaving}
                  onDraftUpdate={setCurrentDraftProducts}
                />
              )}
              
              {activeTab === 'delete-product' && <DeleteProduct />}
              
              {activeTab === 'offers' && <OfferManager />}
              
              {activeTab === 'coupons' && <CreateCoupon />}
              
              {activeTab === 'coupon-json' && <CouponJsonEditor />}
              
              {activeTab === 'banner' && <BannerManager />}
              
              {activeTab === 'content' && <ContentManager />}
              
              {activeTab === 'inventory' && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Inventory Management</h2>
                  <Inventory isOpen={true} onClose={() => {}} />
                </div>
              )}
              
              {activeTab === 'settings' && (
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700">Settings Panel</h3>
                  <p className="text-gray-500">Advanced settings coming soon...</p>
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;