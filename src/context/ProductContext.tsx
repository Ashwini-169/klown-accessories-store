import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Product, SpecialOffer, Coupon } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useLocalStorageWithFileSync } from '../hooks/useLocalStorageWithFileSync';
import productsData from '../data/products.json';
import couponsData from '../data/coupons.json';
import { couponSyncUtils } from '../utils/couponSyncUtils';

interface ProductContextType {
  products: Product[];
  specialOffers: SpecialOffer[];
  coupons: Coupon[];
  heroBannerImage: string;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void; // Add delete product method
  updateStock: (productId: string, size: string, stock: number) => void;
  updateSpecialOffers: (offers: SpecialOffer[]) => void;
  updateCoupons: (coupons: Coupon[]) => void;
  updateHeroBanner: (imageUrl: string) => void;
  decreaseStock: (productId: string, size: string, quantity: number) => void;
  validateCoupon: (code: string, orderTotal: number) => { valid: boolean; discount: number; message: string };
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  // Use our custom hook for products to sync with products.json
  const [products, setProducts] = useLocalStorageWithFileSync<Product[]>(
    'products', 
    productsData as unknown as Product[],
    'src/data/products.json'
  );
  const [specialOffers, setSpecialOffers] = useLocalStorage<SpecialOffer[]>('specialOffers', []);
  const [coupons, setCoupons] = useLocalStorage<Coupon[]>('coupons', couponsData as unknown as Coupon[]);
  const [heroBannerImage, setHeroBannerImage] = useLocalStorage<string>(
    'heroBannerImage',
    'https://images.pexels.com/photos/8838877/pexels-photo-8838877.jpeg?auto=compress&cs=tinysrgb&w=1200'
  );
  
  // Add a flag to track API error state
  const [apiErrorLogged, setApiErrorLogged] = React.useState(false);
  
  // Add effect to fetch products periodically from backend
  useEffect(() => {
    // Function to fetch products from API
    const fetchProductsFromApi = async () => {
      try {
        // Add a timeout to prevent long hanging connections if server is down
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        // Use dynamic hostname instead of hard-coded localhost
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/products`, {
          signal: controller.signal
        }).catch(() => null);
        
        clearTimeout(timeoutId);
        
        // If response is null or not ok, silently fall back to local data
        if (!response || !response.ok) {
          // Only log once to avoid console spam
          if (!apiErrorLogged) {
            console.warn('API server not available, using local product data');
            setApiErrorLogged(true);
          }
          return;
        }
        
        setApiErrorLogged(false); // Reset error log flag if connection works
        
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          // Compare with current products to see if update is needed
          const stringifiedCurrentProducts = JSON.stringify(products);
          const stringifiedNewProducts = JSON.stringify(result.data);
          
          if (stringifiedCurrentProducts !== stringifiedNewProducts) {
            console.log('Products updated from API:', result.data);
            setProducts(result.data);
            // Dispatch event to notify other components
            document.dispatchEvent(new CustomEvent('productsUpdated', { 
              detail: { products: result.data } 
            }));
          }
        }
      } catch (error) {
        // Only log once to avoid console spam
        if (!apiErrorLogged) {
          console.warn('API server not available, using local product data');
          setApiErrorLogged(true);
        }
      }
    };

    // Fetch products on component mount
    fetchProductsFromApi();
    
    // Check for product updates every 10 seconds (more frequent for real-time sync)
    const intervalId = setInterval(fetchProductsFromApi, 10000);
    
    // Listen for save events to refresh immediately after admin saves changes
    const handleProductsSaved = () => fetchProductsFromApi();
    document.addEventListener('productsSaved', handleProductsSaved);
    
    // Listen for product deletion events
    const handleProductDeleted = (event: CustomEvent) => {
      const { productId } = event.detail;
      console.log(`[ProductContext] Received productDeleted event for ID: ${productId}`);
      
      // Update products state to remove deleted product
      setProducts(currentProducts => 
        currentProducts.filter(product => product.id !== productId)
      );
      
      // Fetch latest products from API to ensure consistency
      fetchProductsFromApi();
    };
    
    // Listen for restore deleted product events
    const handleRestoreDeletedProduct = (event: CustomEvent) => {
      const { product } = event.detail;
      console.log(`[ProductContext] Restoring deleted product:`, product);
      
      if (product && product.id) {
        setProducts(currentProducts => {
          // Check if the product already exists
          const exists = currentProducts.some(p => p.id === product.id);
          
          if (exists) {
            console.log(`[ProductContext] Product ${product.id} already exists, not restoring`);
            return currentProducts;
          }
          
          console.log(`[ProductContext] Adding product ${product.id} back to state`);
          return [...currentProducts, product];
        });
      }
    };
    
    document.addEventListener('productDeleted', handleProductDeleted as EventListener);
    document.addEventListener('restoreDeletedProduct', handleRestoreDeletedProduct as EventListener);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('productsSaved', handleProductsSaved);
      document.removeEventListener('productDeleted', handleProductDeleted as EventListener);
      document.removeEventListener('restoreDeletedProduct', handleRestoreDeletedProduct as EventListener);
    };
  }, []);
  
  // Removed constant refreshing to improve performance

  const updateProduct = (updatedProduct: Product) => {
    setProducts(currentProducts =>
      currentProducts.map(product =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };
  
  const deleteProduct = (productId: string) => {
    setProducts(currentProducts =>
      currentProducts.filter(product => product.id !== productId)
    );
  };

  const updateStock = (productId: string, size: string, stock: number) => {
    setProducts(currentProducts =>
      currentProducts.map(product => {
        if (product.id === productId) {
          const updatedProduct = {
            ...product,
            sizes: {
              ...product.sizes,
              [size]: {
                ...product.sizes[size],
                stock,
                available: stock > 0
              }
            }
          };
          
          // Dispatch an event to notify other components of the stock update
          document.dispatchEvent(new CustomEvent('productStockUpdated', { 
            detail: { 
              productId,
              size,
              newStock: stock,
              product: updatedProduct
            } 
          }));
          
          return updatedProduct;
        }
        return product;
      })
    );
  };

  const decreaseStock = (productId: string, size: string, quantity: number) => {
    setProducts(currentProducts =>
      currentProducts.map(product => {
        if (product.id === productId) {
          const currentStock = product.sizes[size]?.stock || 0;
          const newStock = Math.max(0, currentStock - quantity);
          
          const updatedProduct = {
            ...product,
            sizes: {
              ...product.sizes,
              [size]: {
                ...product.sizes[size],
                stock: newStock,
                available: newStock > 0
              }
            }
          };
          
          // Dispatch an event to notify other components of the stock decrease
          document.dispatchEvent(new CustomEvent('productStockUpdated', { 
            detail: { 
              productId,
              size, 
              newStock,
              product: updatedProduct,
              changeType: 'decrease',
              quantity
            } 
          }));
          
          return updatedProduct;
        }
        return product;
      })
    );
  };

  const updateSpecialOffers = (offers: SpecialOffer[]) => {
    setSpecialOffers(offers);
  };

  const updateCoupons = (newCoupons: Coupon[]) => {
    setCoupons(newCoupons);
    // Dispatch an event to notify components that coupons have been updated
    const event = new CustomEvent('couponsUpdated', {
      detail: { coupons: newCoupons }
    });
    document.dispatchEvent(event);

    // Also attempt to sync coupons to coupons.json on the server like products
    try {
      couponSyncUtils.syncCoupons(newCoupons).catch(err => console.error('Failed to sync coupons to file:', err));
    } catch (err) {
      console.error('Error calling couponSyncUtils.syncCoupons:', err);
    }
  };

  const updateHeroBanner = (imageUrl: string) => {
    setHeroBannerImage(imageUrl);
  };

  const validateCoupon = (code: string, orderTotal: number) => {
    const coupon = coupons.find(c => c.code === code && c.active);
    
    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }

    if (new Date(coupon.validUntil) < new Date()) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    if (coupon.minAmount !== undefined && orderTotal < coupon.minAmount) {
      return { valid: false, discount: 0, message: `Minimum order amount ₹${coupon.minAmount} required` };
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.min((orderTotal * coupon.discount) / 100, coupon.maxDiscount);
    } else {
      discount = coupon.discount;
    }

    return { valid: true, discount, message: `${coupon.title} applied successfully!` };
  };

  return (
    <ProductContext.Provider value={{
      products,
      specialOffers,
      coupons,
      heroBannerImage,
      updateProduct,
      deleteProduct,
      updateStock,
      updateSpecialOffers,
      updateCoupons,
      updateHeroBanner,
      decreaseStock,
      validateCoupon,
    }}>
      {children}
    </ProductContext.Provider>
  );
};