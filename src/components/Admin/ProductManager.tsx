import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Edit, Plus, Save, X, Star, Loader2, PlusCircle, MinusCircle, RefreshCw, Search } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { Product } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import ProductFileService from '../../services/ProductFileService';
import { productSyncUtils } from '../../utils/productSyncUtils';

// Create a loading indicator component
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
      <Loader2 className="h-8 w-8 text-yellow-500 animate-spin mb-3" />
      <p className="text-gray-700 font-medium">Saving changes...</p>
    </div>
  </div>
);

// Define props interface
interface ProductManagerProps {
  onChangesMade?: () => void;
  draftMode?: boolean;
  saveDisabled?: boolean;
  onDraftUpdate?: (draftProducts: Product[]) => void;
}

// Memoize the ProductManager component to prevent unnecessary re-renders
const ProductManager: React.FC<ProductManagerProps> = memo(({
  onChangesMade = () => {},
  draftMode = false,
  saveDisabled = false,
  onDraftUpdate = () => {}
}) => {
  const { products, updateProduct, deleteProduct } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [draftProducts, setDraftProducts] = useState<Product[]>([]);
  const [newlyAddedProductIds, setNewlyAddedProductIds] = useState<string[]>([]);
  const [modifiedProductIds, setModifiedProductIds] = useState<string[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('all');
  const [newProduct, setNewProduct] = useState<Product>({
    id: '',
    name: '',
    category: 'bracelets',
    price: 0,
    originalPrice: 0,
    description: '',
    images: ['', ''],
    sizes: { 'S': { stock: 0, available: false } },
    featured: false,
    discount: 0,
    rating: {
      average: 0,
      count: 0
    }
  });

  // Initialize draftProducts with the current products and notify parent component
  useEffect(() => {
    if (draftMode && draftProducts.length === 0) {
      const initialDraftProducts = [...products];
      setDraftProducts(initialDraftProducts);
      setOriginalProducts([...products]); // Store original products for comparison
      onDraftUpdate(initialDraftProducts);
    }
  }, [draftMode, products, draftProducts.length, onDraftUpdate]);
  
  // Update parent component whenever draft products change
  useEffect(() => {
    if (draftMode && draftProducts.length > 0) {
      onDraftUpdate(draftProducts);
      
      // Identify new, modified and deleted products
      const newIds = draftProducts
        .filter(product => !originalProducts.some(original => original.id === product.id))
        .map(product => product.id);
      
      const modifiedIds = draftProducts
        .filter(product => {
          const original = originalProducts.find(orig => orig.id === product.id);
          return original && JSON.stringify(original) !== JSON.stringify(product);
        })
        .map(product => product.id);
      
      const deletedIds = originalProducts
        .filter(product => !draftProducts.some(draft => draft.id === product.id))
        .map(product => product.id);
      
      setNewlyAddedProductIds(newIds);
      setModifiedProductIds(modifiedIds);
      setDeletedProductIds(deletedIds);
    }
  }, [draftMode, draftProducts, onDraftUpdate, originalProducts]);
  
  // Listen for stock updates from Inventory component
  useEffect(() => {
    const handleStockUpdated = (event: any) => {
      const { productId, size, newStock, changeType } = event.detail;
      
      console.log(`ProductManager: Detected stock ${changeType || 'update'} for product ${productId}, size ${size} to ${newStock}`);
      
      // If we're in draft mode, update our draft products
      if (draftMode && draftProducts.length > 0) {
        setDraftProducts(currentDrafts => 
          currentDrafts.map(product => {
            if (product.id === productId) {
              return {
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
            }
            return product;
          })
        );
        
        // Mark this product as modified
        if (!modifiedProductIds.includes(productId)) {
          setModifiedProductIds([...modifiedProductIds, productId]);
        }
        
        // Notify parent that changes were made
        onChangesMade();
      }
    };
    
    document.addEventListener('productStockUpdated', handleStockUpdated);
    
    return () => {
      document.removeEventListener('productStockUpdated', handleStockUpdated);
    };
  }, [draftMode, draftProducts, modifiedProductIds, onChangesMade]);
  
  // Function to manually fetch the latest products from API
  const fetchLatestProducts = useCallback(async () => {
    try {
      console.log('Manually fetching latest products from API');
      const hostname = window.location.hostname;
      const response = await fetch(`http://${hostname}:3001/api/products`);
      if (!response.ok) {
        console.error('Failed to fetch products:', await response.text());
        return false;
      }
      
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        // Update draft products with the latest data
        setDraftProducts([...result.data]);
        setOriginalProducts([...result.data]);
        onDraftUpdate([...result.data]);
        console.log('Successfully fetched', result.data.length, 'products from API');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching products:', error);
      return false;
    }
  }, [onDraftUpdate]);

  // Add an effect to detect changes in the products array from context
  // This ensures we update our component state when products.json is changed externally
  useEffect(() => {
    if (products.length > 0) {
      // If we have no draft products yet, or if we find products in context not in our drafts
      if (draftProducts.length === 0 || products.some(p => !draftProducts.some(dp => dp.id === p.id))) {
        console.log('ProductManager: Detected new products from context, updating drafts');
        const newDraftProducts = [...products];
        setDraftProducts(newDraftProducts);
        setOriginalProducts([...products]);
        
        if (draftMode) {
          onDraftUpdate(newDraftProducts);
        }
      }
    }
  }, [products, draftProducts, draftMode, onDraftUpdate]);
  
  // Listen for product deletion events
  useEffect(() => {
    const handleProductDeleted = (event: CustomEvent) => {
      const { productId } = event.detail;
      console.log(`[ProductManager] Received productDeleted event for ID: ${productId}`);
      
      // Update draft products if in draft mode
      if (draftMode && draftProducts.some(p => p.id === productId)) {
        console.log(`[ProductManager] Removing deleted product ${productId} from drafts`);
        const updatedDrafts = draftProducts.filter(p => p.id !== productId);
        setDraftProducts(updatedDrafts);
        onDraftUpdate(updatedDrafts);
        
        // Also remove from tracking arrays
        setNewlyAddedProductIds(prev => prev.filter(id => id !== productId));
        setModifiedProductIds(prev => prev.filter(id => id !== productId));
        setDeletedProductIds(prev => prev.filter(id => id !== productId));
      }
      
      // Force refresh latest products to ensure UI is in sync
      fetchLatestProducts();
    };
    
    document.addEventListener('productDeleted', handleProductDeleted as EventListener);
    return () => {
      document.removeEventListener('productDeleted', handleProductDeleted as EventListener);
    };
  }, [draftMode, draftProducts, onDraftUpdate, fetchLatestProducts]);
  
  // Function to save all draft products to the main context and file
  const saveAllChanges = useCallback(async () => {
    if (!draftMode || draftProducts.length === 0) return;
    
    setIsSaving(true);
    setShowLoadingOverlay(true);
    
    try {
      // For each draft product, update or add it to the main context
      draftProducts.forEach(product => {
        updateProduct(product);
      });
      
      // Sync with products.json
      await ProductFileService.saveProductsToFile(draftProducts);
      
      console.log('All changes saved successfully');
    } catch (error) {
      console.error('Error saving all changes:', error);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setShowLoadingOverlay(false);
      }, 500);
    }
  }, [draftMode, draftProducts, updateProduct]);

  // Calculate the discount percentage for new products
  useEffect(() => {
    if (newProduct.originalPrice > 0 && newProduct.price > 0) {
      const calculatedDiscount = Math.round(((newProduct.originalPrice - newProduct.price) / newProduct.originalPrice) * 100);
      setNewProduct(prev => ({...prev, discount: calculatedDiscount}));
    }
  }, [newProduct.originalPrice, newProduct.price]);

  // Calculate the discount percentage for edited products
  useEffect(() => {
    if (editingProduct && editingProduct.originalPrice > 0 && editingProduct.price > 0) {
      const calculatedDiscount = Math.round(((editingProduct.originalPrice - editingProduct.price) / editingProduct.originalPrice) * 100);
      setEditingProduct(prev => ({...prev!, discount: calculatedDiscount}));
    }
  }, [editingProduct?.originalPrice, editingProduct?.price]);
  
  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    if (!searchQuery && searchCategory === 'all') {
      return draftProducts;
    }
    
    return draftProducts.filter(product => {
      // Filter by search query (case insensitive)
      const matchesQuery = searchQuery.trim() === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
        
      // Filter by category
      const matchesCategory = searchCategory === 'all' || product.category === searchCategory;
      
      return matchesQuery && matchesCategory;
    });
  }, [draftProducts, searchQuery, searchCategory]);

  const handleStockUpdate = useCallback((productId: string, size: string, newStock: number) => {
    // Find the product in either the draft products (if in draft mode) or regular products
    const productArray = draftMode ? draftProducts : products;
    const product = productArray.find(p => p.id === productId);
    
    if (product) {
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
      
      if (draftMode) {
        // In draft mode, update the draft products and notify parent of changes
        const updatedDraftProducts = draftProducts.map(p => 
          p.id === updatedProduct.id ? updatedProduct : p
        );
        setDraftProducts(updatedDraftProducts);
        onChangesMade(); // Notify parent component about unsaved changes
        onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
      } else {
        // In regular mode, update through context
        updateProduct(updatedProduct);
        
        // Only sync with file if not in draft mode
        if (!draftMode) {
          ProductFileService.saveProductsToFile(products.map(p => 
            p.id === updatedProduct.id ? updatedProduct : p
          ));
        }
      }
    }
  }, [draftMode, products, draftProducts, updateProduct, onChangesMade, onDraftUpdate]);

  const handlePriceUpdate = useCallback((productId: string, newPrice: number) => {
    // Find the product in either the draft products (if in draft mode) or regular products
    const productArray = draftMode ? draftProducts : products;
    const product = productArray.find(p => p.id === productId);
    
    if (product) {
      const updatedProduct = {
        ...product,
        price: newPrice,
        discount: product.originalPrice > 0 
          ? Math.round(((product.originalPrice - newPrice) / product.originalPrice) * 100)
          : 0
      };
      
      if (draftMode) {
        // In draft mode, update the draft products and notify parent of changes
        const updatedDraftProducts = draftProducts.map(p => 
          p.id === updatedProduct.id ? updatedProduct : p
        );
        setDraftProducts(updatedDraftProducts);
        onChangesMade(); // Notify parent component about unsaved changes
        onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
      } else {
        // In regular mode, update through context
        updateProduct(updatedProduct);
        
        // Only sync with file if not in draft mode
        if (!draftMode) {
          ProductFileService.saveProductsToFile(products.map(p => 
            p.id === updatedProduct.id ? updatedProduct : p
          ));
        }
      }
    }
  }, [draftMode, products, draftProducts, updateProduct, onChangesMade, onDraftUpdate]);

  const handleImageUpdate = useCallback((productId: string, imageIndex: number, newUrl: string) => {
    // Find the product in either the draft products (if in draft mode) or regular products
    const productArray = draftMode ? draftProducts : products;
    const product = productArray.find(p => p.id === productId);
    
    if (product) {
      const newImages = [...product.images];
      newImages[imageIndex] = newUrl;
      const updatedProduct = { ...product, images: newImages };
      
      if (draftMode) {
        // In draft mode, update the draft products and notify parent of changes
        const updatedDraftProducts = draftProducts.map(p => 
          p.id === updatedProduct.id ? updatedProduct : p
        );
        setDraftProducts(updatedDraftProducts);
        onChangesMade(); // Notify parent component about unsaved changes
        onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
      } else {
        // In regular mode, update through context
        updateProduct(updatedProduct);
        
        // Only sync with file if not in draft mode
        if (!draftMode) {
          ProductFileService.saveProductsToFile(products.map(p => 
            p.id === updatedProduct.id ? updatedProduct : p
          ));
        }
      }
    }
  }, [draftMode, products, draftProducts, updateProduct, onChangesMade, onDraftUpdate]);

  // Use useCallback to prevent unnecessary re-renders
  const handleSaveProduct = useCallback(async () => {
    if (editingProduct) {
      setIsSaving(true);
      setShowLoadingOverlay(true);
      
      try {
        if (draftMode) {
          // In draft mode, update the draft products and notify parent of changes
          const updatedDraftProducts = draftProducts.map(p => 
            p.id === editingProduct.id ? editingProduct : p
          );
          setDraftProducts(updatedDraftProducts);
          onChangesMade(); // Notify parent component about unsaved changes
          onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
        } else {
          // In regular mode, update through context
          updateProduct(editingProduct);
          
          // Notify all components about the updated product
          productSyncUtils.notifyProductUpdated(editingProduct.id);
          
          // Only sync with file if not in draft mode
          if (!draftMode) {
            // Sync with products.json using our utility
            const updatedProducts = products.map(p => 
              p.id === editingProduct.id ? editingProduct : p
            );
            await productSyncUtils.syncProducts(updatedProducts);
          }
        }
        
        setEditingProduct(null);
      } catch (error) {
        console.error('Error saving product:', error);
      } finally {
        // Short delay before hiding loading overlay for better UX
        setTimeout(() => {
          setIsSaving(false);
          setShowLoadingOverlay(false);
        }, 500);
      }
    }
  }, [editingProduct, products, draftMode, updateProduct, draftProducts, onChangesMade, onDraftUpdate]);

  const handleAddProduct = useCallback(async () => {
    setIsSaving(true);
    setShowLoadingOverlay(true);
    
    try {
      // Ensure the ID is generated if not provided
      const generatedId = newProduct.id || `${newProduct.category.substring(0, 2).toUpperCase()}${String(products.length + 1).padStart(3, '0')}`;
      
      // Calculate discount from original and sale price
      const calculatedDiscount = 
        newProduct.originalPrice > 0 && newProduct.price > 0 
          ? Math.round(((newProduct.originalPrice - newProduct.price) / newProduct.originalPrice) * 100) 
          : 0;
          
      // Ensure we have valid sizes with stock values
      const validatedSizes = newProduct.sizes || { 'S': { stock: 0, available: false } };
      
      // Create the complete product with all required fields
      const productToAdd = {
        ...newProduct,
        id: generatedId,
        featured: newProduct.featured || false,
        discount: calculatedDiscount,
        sizes: validatedSizes,
        // Ensure we have image URLs, even if empty
        images: newProduct.images && newProduct.images.length > 0 ? newProduct.images : ['', '']
      };
      
      console.log('Adding new product:', productToAdd);
      
      if (draftMode) {
        // First fetch latest products to ensure we have the most up-to-date list
        await fetchLatestProducts();
        
        // In draft mode, update local state and notify parent of changes
        const updatedDraftProducts = [...draftProducts, productToAdd];
        setDraftProducts(updatedDraftProducts);
        onChangesMade(); // Notify parent that we have unsaved changes
        onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
        
        // Mark as newly added product
        setNewlyAddedProductIds(prev => [...prev, productToAdd.id]);
        console.log('Draft products updated with new product:', updatedDraftProducts.length);
      } else {
        // Update the local state
        const updatedProducts = [...products, productToAdd];
        
        // Update through context
        updateProduct(productToAdd);
        
        // Notify all components about the new product
        productSyncUtils.notifyProductCreated(productToAdd);
        
        // Sync with products.json only if not in draft mode
        if (!draftMode) {
          // Use our utility to sync products, which handles notifications and file sync
          await productSyncUtils.syncProducts(updatedProducts);
        }
      }
      
      // Reset form
      setIsAdding(false);
      setNewProduct({
        id: '',
        name: '',
        category: 'bracelets',
        price: 0,
        originalPrice: 0,
        description: '',
        images: ['', ''],
        sizes: { 'S': { stock: 0, available: false } },
        featured: false,
        discount: 0
      });
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      // Short delay before hiding loading overlay for better UX
      setTimeout(() => {
        setIsSaving(false);
        setShowLoadingOverlay(false);
      }, 500);
    }
  }, [newProduct, products, updateProduct, draftMode, onChangesMade, draftProducts, onDraftUpdate]);

  // Handle product deletion
  const handleDeleteProduct = useCallback(async (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
      setIsSaving(true);
      setShowLoadingOverlay(true);
      
      try {
        if (draftMode) {
          // In draft mode, only update draft state and notify parent
          const updatedDraftProducts = draftProducts.filter(p => p.id !== productId);
          setDraftProducts(updatedDraftProducts);
          onChangesMade(); // Notify parent that we have unsaved changes
          onDraftUpdate(updatedDraftProducts); // Send updated draft products to parent
          
          // Mark as deleted product if it was in original products
          if (originalProducts.some(p => p.id === productId)) {
            setDeletedProductIds(prev => [...prev, productId]);
          }
          
          // If it was a newly added product, remove it from newly added list
          setNewlyAddedProductIds(prev => prev.filter(id => id !== productId));
          
          console.log(`Product ${productId} marked for deletion in draft mode`);
        } else {
          // Direct deletion mode (not in draft)
          console.log(`Directly deleting product ${productId} from products.json`);
          
          // Use the ProductFileService.deleteProduct method for direct API call
          const deleteResult = await ProductFileService.deleteProduct(productId);
          
          if (deleteResult) {
            // If API deletion successful, update context
            deleteProduct(productId);
            
            console.log(`Product ${productId} deleted successfully from products.json`);
            
            // Force a refresh in ProductManager to get updated products
            await fetchLatestProducts();
            
            // Dispatch a custom event to notify all components about the deletion
            document.dispatchEvent(new CustomEvent('productDeleted', { 
              detail: { productId } 
            }));
          } else {
            throw new Error(`Failed to delete product ${productId} from API`);
          }
        }
      } catch (error: any) {
        console.error('Error deleting product:', error);
        alert(`Failed to delete product: ${error?.message || 'Unknown error'}`);
      } finally {
        // Short delay before hiding loading overlay for better UX
        setTimeout(() => {
          setIsSaving(false);
          setShowLoadingOverlay(false);
        }, 500);
      }
    }
  }, [products, deleteProduct, draftMode, onChangesMade, draftProducts, onDraftUpdate, originalProducts, fetchLatestProducts]);

  const handleAddSize = (product: Product, newSize: string) => {
    if (!product.sizes[newSize]) {
      const updatedProduct = {
        ...product,
        sizes: {
          ...product.sizes,
          [newSize]: {
            stock: 0,
            available: false
          }
        }
      };
      if (product.id === editingProduct?.id) {
        setEditingProduct(updatedProduct);
      } else {
        updateProduct(updatedProduct);
        
        // Sync with products.json
        ProductFileService.saveProductsToFile(products.map(p => 
          p.id === updatedProduct.id ? updatedProduct : p
        ));
      }
    }
  };

  const handleRemoveSize = (product: Product, sizeToRemove: string) => {
    const updatedSizes = { ...product.sizes };
    delete updatedSizes[sizeToRemove];
    
    const updatedProduct = {
      ...product,
      sizes: updatedSizes
    };
    
    if (product.id === editingProduct?.id) {
      setEditingProduct(updatedProduct);
    } else {
      updateProduct(updatedProduct);
      
      // Sync with products.json
      ProductFileService.saveProductsToFile(products.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      ));
    }
  };

  const handleAddImage = (product: Product) => {
    const updatedProduct = {
      ...product,
      images: [...product.images, '']
    };
    
    if (product.id === editingProduct?.id) {
      setEditingProduct(updatedProduct);
    } else {
      updateProduct(updatedProduct);
      
      // Sync with products.json
      ProductFileService.saveProductsToFile(products.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      ));
    }
  };

  const handleRemoveImage = (product: Product, index: number) => {
    if (product.images.length > 1) {
      const updatedImages = [...product.images];
      updatedImages.splice(index, 1);
      
      const updatedProduct = {
        ...product,
        images: updatedImages
      };
      
      if (product.id === editingProduct?.id) {
        setEditingProduct(updatedProduct);
      } else {
        updateProduct(updatedProduct);
        
        // Sync with products.json
        ProductFileService.saveProductsToFile(products.map(p => 
          p.id === updatedProduct.id ? updatedProduct : p
        ));
      }
    }
  };

  const toggleFeatured = (product: Product) => {
    const updatedProduct = {
      ...product,
      featured: !product.featured
    };
    
    updateProduct(updatedProduct);
    
    // Sync with products.json
    ProductFileService.saveProductsToFile(products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    ));
  };

  return (
    <div className="relative">
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mb-2" />
            <span className="font-medium text-gray-800">Saving changes...</span>
          </div>
        </div>
      )}
      
      {/* Draft mode notice */}
      {draftMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>You're working in draft mode. Changes will only be saved to products.json when you click "Save Changes" in the header.</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <button
            onClick={fetchLatestProducts}
            className="ml-4 flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Refresh products from server"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            <span>Refresh</span>
          </button>
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Product</span>
        </button>
      </div>
      
      {/* Search & Filter Bar */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products by name, ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="all">All Categories</option>
            <option value="bracelets">Bracelets</option>
            <option value="rings">Rings</option>
            <option value="necklaces">Necklaces</option>
            <option value="earrings">Earrings</option>
            <option value="keyrings">Keyrings</option>
          </select>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSearchCategory('all');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
        
        {/* Display search results count */}
        <div className="mt-3 text-sm text-gray-500">
          {searchQuery || searchCategory !== 'all' ? (
            <span>
              Found <span className="font-medium">{filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''} 
              {searchCategory !== 'all' ? ` in category "${searchCategory}"` : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </span>
          ) : (
            <span>Showing all {filteredProducts.length} products</span>
          )}
        </div>
      </div>
      
      {isAdding && (
        <div className="mb-8 bg-white shadow-lg rounded-xl p-6 border-2 border-yellow-400">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-bold">Add New Product</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (optional)</label>
                <input
                  type="text"
                  value={newProduct.id}
                  onChange={(e) => setNewProduct({...newProduct, id: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Auto-generated if empty"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty for auto-generated ID</p>
              </div>
            
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value as any})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="bracelets">Bracelets</option>
                  <option value="rings">Rings</option>
                  <option value="necklaces">Necklaces</option>
                  <option value="earrings">Earrings</option>
                  <option value="keyrings">Keyrings</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="featured-product"
                  checked={newProduct.featured}
                  onChange={(e) => setNewProduct({...newProduct, featured: e.target.checked})}
                  className="mr-2 h-4 w-4 text-yellow-500"
                />
                <label htmlFor="featured-product" className="text-sm font-medium text-gray-700">
                  Featured Product
                </label>
              </div>

            </div>
            
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Price (₹)</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
                <input
                  type="number"
                  value={newProduct.originalPrice}
                  onChange={(e) => setNewProduct({...newProduct, originalPrice: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={newProduct.discount}
                    readOnly
                    className="w-24 p-2 border border-gray-200 bg-gray-50 rounded-lg"
                  />
                  <span className="ml-2">% (Auto-calculated)</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Rating</label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <label className="w-24 text-sm text-gray-600">Rating:</label>
                    <input
                      type="number"
                      value={newProduct.rating?.average || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        const rating = value > 5 ? 5 : value < 0 ? 0 : value;
                        setNewProduct({
                          ...newProduct,
                          rating: {
                            ...(newProduct.rating || { count: 0 }),
                            average: rating
                          }
                        });
                      }}
                      step="0.1"
                      min="0"
                      max="5"
                      className="w-24 p-2 border border-gray-300 rounded-lg"
                    />
                    <div className="flex items-center ml-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (newProduct.rating?.average || 0) 
                              ? "text-yellow-400 fill-yellow-400" 
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm text-gray-600">Reviews:</label>
                    <input
                      type="number"
                      value={newProduct.rating?.count || 0}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        setNewProduct({
                          ...newProduct,
                          rating: {
                            ...(newProduct.rating || { average: 0 }),
                            count: count < 0 ? 0 : count
                          }
                        });
                      }}
                      min="0"
                      className="w-24 p-2 border border-gray-300 rounded-lg"
                    />
                    <span className="ml-2 text-sm text-gray-500">reviews</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs</label>
                {newProduct.images.map((image, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => {
                        const newImages = [...newProduct.images];
                        newImages[index] = e.target.value;
                        setNewProduct({...newProduct, images: newImages});
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-lg"
                      placeholder="Image URL"
                    />
                    <button 
                      onClick={() => {
                        if (newProduct.images.length > 1) {
                          const newImages = [...newProduct.images];
                          newImages.splice(index, 1);
                          setNewProduct({...newProduct, images: newImages});
                        }
                      }}
                      disabled={newProduct.images.length <= 1}
                      className="ml-2 p-2 text-red-500 hover:bg-red-100 rounded-lg disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewProduct({...newProduct, images: [...newProduct.images, '']})}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Another Image
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sizes and Stock</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
              {Object.entries(newProduct.sizes).map(([size, info]) => (
                <div key={size} className="bg-white p-3 rounded-lg border relative">
                  <button 
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                    onClick={() => {
                      const updatedSizes = {...newProduct.sizes};
                      delete updatedSizes[size];
                      setNewProduct({...newProduct, sizes: updatedSizes});
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-medium text-gray-700 mb-2">Size {size}</div>
                  <input
                    type="number"
                    value={info.stock || 0}
                    onChange={(e) => {
                      const stock = parseInt(e.target.value) || 0;
                      setNewProduct({
                        ...newProduct,
                        sizes: {
                          ...newProduct.sizes,
                          [size]: {
                            stock,
                            available: stock > 0
                          }
                        }
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-center text-sm"
                    placeholder="Stock"
                  />
                </div>
              ))}
              
              <button
                onClick={() => {
                  const newSize = prompt('Enter new size name:');
                  if (newSize && !newProduct.sizes[newSize]) {
                    setNewProduct({
                      ...newProduct,
                      sizes: {
                        ...newProduct.sizes,
                        [newSize]: { stock: 0, available: false }
                      }
                    });
                  }
                }}
                className="flex items-center justify-center h-full min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50"
              >
                <Plus className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg mr-3 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProduct}
              disabled={!newProduct.name || !newProduct.price || !newProduct.originalPrice}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && searchQuery ? (
        <div className="bg-gray-50 rounded-xl p-10 text-center">
          <div className="text-gray-400 mb-3">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            No products match your search for "{searchQuery}"
            {searchCategory !== 'all' ? ` in category "${searchCategory}"` : ''}.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchCategory('all');
            }}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Show filtered products based on search query */}
          {filteredProducts.map(product => (
          <div key={product.id} className="bg-gray-50 rounded-xl p-6">
            {editingProduct && editingProduct.id === product.id ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-full">
                    <div className="flex items-center mb-2">
                      <input
                        type="text"
                        value={editingProduct.id}
                        disabled
                        className="text-sm font-mono bg-gray-100 border border-gray-300 rounded px-2 py-1 mr-2"
                      />
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="text-xl font-bold text-gray-900 p-2 w-full border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center">
                      <select
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value as any})}
                        className="p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="bracelets">BRACELETS</option>
                        <option value="rings">RINGS</option>
                        <option value="necklaces">NECKLACES</option>
                        <option value="earrings">EARRINGS</option>
                        <option value="keyrings">KEYRINGS</option>
                      </select>
                      <div className="ml-4 flex items-center">
                        <input
                          type="checkbox"
                          id={`featured-${editingProduct.id}`}
                          checked={editingProduct.featured}
                          onChange={(e) => setEditingProduct({...editingProduct, featured: e.target.checked})}
                          className="mr-2 h-4 w-4 text-yellow-500"
                        />
                        <label htmlFor={`featured-${editingProduct.id}`} className="text-sm font-medium text-gray-700">
                          Featured Product
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={handleSaveProduct}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block font-semibold mb-3">Description</label>
                      <textarea
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block font-semibold mb-3">Images</label>
                      {editingProduct.images.map((image, index) => (
                        <div key={index} className="flex mb-2">
                          <input
                            type="text"
                            value={image}
                            onChange={(e) => {
                              const newImages = [...editingProduct.images];
                              newImages[index] = e.target.value;
                              setEditingProduct({...editingProduct, images: newImages});
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded-lg"
                            placeholder="Image URL"
                          />
                          <button 
                            onClick={() => handleRemoveImage(editingProduct, index)}
                            className="ml-2 p-2 text-red-500 hover:bg-red-100 rounded-lg"
                            disabled={editingProduct.images.length <= 1}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddImage(editingProduct)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Another Image
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <label className="block font-semibold mb-3">Pricing</label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Current:</span>
                          <input
                            type="number"
                            value={editingProduct.price}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})}
                            className="p-2 border border-gray-300 rounded-lg w-24"
                          />
                          <span className="text-sm text-gray-500">₹</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Original:</span>
                          <input
                            type="number"
                            value={editingProduct.originalPrice}
                            onChange={(e) => setEditingProduct({...editingProduct, originalPrice: parseInt(e.target.value) || 0})}
                            className="p-2 border border-gray-300 rounded-lg w-24"
                          />
                          <span className="text-sm text-gray-500">₹</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Discount:</span>
                          <input
                            type="number"
                            value={editingProduct.discount}
                            readOnly
                            className="p-2 border border-gray-200 bg-gray-50 rounded-lg w-24"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block font-semibold mb-3">Product Rating</label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Rating:</span>
                          <input
                            type="number"
                            value={editingProduct.rating?.average || 0}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              const rating = value > 5 ? 5 : value < 0 ? 0 : value;
                              setEditingProduct({
                                ...editingProduct,
                                rating: {
                                  ...(editingProduct.rating || { count: 0 }),
                                  average: rating
                                }
                              });
                            }}
                            step="0.1"
                            min="0"
                            max="5"
                            className="p-2 border border-gray-300 rounded-lg w-24"
                          />
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= (editingProduct.rating?.average || 0) 
                                    ? "text-yellow-400 fill-yellow-400" 
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Reviews:</span>
                          <input
                            type="number"
                            value={editingProduct.rating?.count || 0}
                            onChange={(e) => {
                              const count = parseInt(e.target.value) || 0;
                              setEditingProduct({
                                ...editingProduct,
                                rating: {
                                  ...(editingProduct.rating || { average: 0 }),
                                  count: count < 0 ? 0 : count
                                }
                              });
                            }}
                            min="0"
                            className="p-2 border border-gray-300 rounded-lg w-24"
                          />
                          <span className="text-sm text-gray-500">reviews</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block font-semibold">Sizes and Stock</label>
                        <button
                          onClick={() => {
                            const newSize = prompt('Enter new size name:');
                            if (newSize && !editingProduct.sizes[newSize]) {
                              handleAddSize(editingProduct, newSize);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Size
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(editingProduct.sizes).map(([size, sizeInfo]) => (
                          <div key={size} className="bg-white p-3 rounded-lg border relative">
                            <button 
                              className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveSize(editingProduct, size)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="text-sm font-medium text-gray-700 mb-2">Size {size}</div>
                            <input
                              type="number"
                              value={sizeInfo.stock}
                              onChange={(e) => {
                                const stock = parseInt(e.target.value) || 0;
                                setEditingProduct({
                                  ...editingProduct,
                                  sizes: {
                                    ...editingProduct.sizes,
                                    [size]: {
                                      stock,
                                      available: stock > 0
                                    }
                                  }
                                });
                              }}
                              className="w-full p-2 border border-gray-300 rounded text-center text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-start justify-between mb-4 ${
                  newlyAddedProductIds.includes(product.id) 
                    ? 'bg-green-50 border-l-4 border-green-500 pl-3 py-2 rounded-l' 
                    : modifiedProductIds.includes(product.id)
                      ? 'bg-blue-50 border-l-4 border-blue-500 pl-3 py-2 rounded-l'
                      : ''
                }`}>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-xl font-bold text-gray-900 mr-2">{product.name}</h3>
                      {product.featured && (
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      )}
                      {newlyAddedProductIds.includes(product.id) && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <PlusCircle className="h-3 w-3 mr-1" /> New
                        </span>
                      )}
                      {modifiedProductIds.includes(product.id) && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full flex items-center">
                          <RefreshCw className="h-3 w-3 mr-1" /> Modified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <p className="text-gray-600">{product.category.toUpperCase()}</p>
                      <p className="text-xs bg-gray-200 px-2 py-0.5 rounded">ID: {product.id}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleFeatured(product)}
                      className={`p-2 ${product.featured ? 'bg-yellow-400' : 'bg-gray-200'} text-gray-800 rounded-lg hover:opacity-80 transition-colors`}
                      title={product.featured ? "Remove from featured" : "Add to featured"}
                    >
                      <Star className={`h-4 w-4 ${product.featured ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={() => setEditingProduct({...product})}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-gray-700">{product.description}</p>
                    </div>
                
                    <div className="mb-4">
                      <h4 className="font-semibold mb-3">Images</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {product.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`${product.name} ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                const newUrl = prompt('Enter new image URL:', image);
                                if (newUrl) handleImageUpdate(product.id, index, newUrl);
                              }}
                              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                            >
                              <Edit className="h-5 w-5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Pricing</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Current:</span>
                          <input
                            type="number"
                            value={product.price}
                            onChange={(e) => handlePriceUpdate(product.id, parseInt(e.target.value))}
                            className="p-2 border border-gray-300 rounded-lg w-24"
                          />
                          <span className="text-sm text-gray-500">₹</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Original:</span>
                          <span className="text-gray-500">₹{product.originalPrice}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">Discount:</span>
                          <span className="text-green-600 font-medium">{product.discount}% OFF</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Stock Management</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {Object.entries(product.sizes).map(([size, sizeInfo]) => (
                          <div key={size} className="bg-white p-3 rounded-lg border">
                            <div className="text-sm font-medium text-gray-700 mb-2">Size {size}</div>
                            <input
                              type="number"
                              value={sizeInfo.stock}
                              onChange={(e) => handleStockUpdate(product.id, size, parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded text-center text-sm"
                            />
                            <div className={`text-xs mt-1 text-center ${
                              sizeInfo.available ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {sizeInfo.available ? 'In Stock' : 'Out of Stock'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      )}
      
      {/* Deleted Products Section */}
      {deletedProductIds.length > 0 && (
        <div className="mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <MinusCircle className="h-5 w-5 mr-2" /> 
              Products Marked for Deletion
            </h3>
            <p className="text-red-600 text-sm">
              These products will be permanently deleted when you save changes.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {deletedProductIds.map(deletedId => {
              const deletedProduct = originalProducts.find(p => p.id === deletedId);
              if (!deletedProduct) return null;
              
              return (
                <div key={deletedId} className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-70">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-gray-800 font-medium line-through">{deletedProduct.name}</h4>
                      <p className="text-xs text-gray-500">ID: {deletedProduct.id}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        // Restore the deleted product
                        const productToRestore = originalProducts.find(p => p.id === deletedId);
                        if (productToRestore) {
                          const updatedDraftProducts = [...draftProducts, productToRestore];
                          setDraftProducts(updatedDraftProducts);
                          setDeletedProductIds(prev => prev.filter(id => id !== deletedId));
                          onDraftUpdate(updatedDraftProducts);
                          onChangesMade();
                        }
                      }}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs"
                    >
                      Restore
                    </button>
                  </div>
                  
                  {deletedProduct.images[0] && (
                    <img 
                      src={deletedProduct.images[0]} 
                      alt={deletedProduct.name} 
                      className="h-16 w-16 object-cover rounded opacity-50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// Since we already wrapped the component in memo when defining it,
// we don't need to wrap it again in export
export default ProductManager;
