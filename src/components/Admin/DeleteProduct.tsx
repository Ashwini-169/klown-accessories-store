import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, Search, AlertTriangle } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import ProductFileService from '../../services/ProductFileService';

const DeleteProduct: React.FC = () => {
  const { products, deleteProduct } = useProducts();
  const [productId, setProductId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | '' }>({
    text: '',
    type: ''
  });
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    const filtered = products.filter(product => 
      product.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleDeleteProduct = async () => {
    if (!productId) {
      setMessage({
        text: 'Please enter a product ID',
        type: 'warning'
      });
      return;
    }

    const productToDelete = products.find(p => p.id === productId);
    
    if (!productToDelete) {
      setMessage({
        text: `Product with ID ${productId} not found`,
        type: 'error'
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${productToDelete.name}" (${productId})? This action cannot be undone.`)) {
      setIsDeleting(true);
      setMessage({ text: '', type: '' });
      
      try {
        console.log(`Attempting to delete product: ${productId} (${productToDelete.name})`);
        
        // Store product data for recovery if needed
        const productData = { ...productToDelete };
        
        // First update UI state for better responsiveness
        deleteProduct(productId);
        
        // Reset form immediately for better UX
        setProductId('');
        setSearchQuery('');
        
        setMessage({
          text: `Deleting product "${productToDelete.name}" (${productId})...`,
          type: 'warning'
        });
        
        try {
          // Then make the API call
          const deleteResult = await ProductFileService.deleteProduct(productId);
          
          if (deleteResult) {
            console.log(`Product deleted successfully: ${productId}`);
            
            setMessage({
              text: `Successfully deleted product "${productToDelete.name}" (${productId})`,
              type: 'success'
            });
            
            // Dispatch a custom event to notify all components about the deletion
            document.dispatchEvent(new CustomEvent('productDeleted', { 
              detail: { productId } 
            }));
          } else {
            // If API failed but we already updated UI, we need to handle this gracefully
            console.error(`API failed to delete product ${productId}, but UI was updated`);
            
            // Attempt to refresh products from server to resync state
            await ProductFileService.refreshProducts();
            
            throw new Error(`Failed to delete product ${productId} from API`);
          }
        } catch (error) {
          const apiError = error as Error;
          console.error(`API error deleting product ${productId}:`, apiError);
          
          // If the API call failed, we need to restore the product in the UI
          try {
            console.log(`Restoring deleted product in UI: ${productId}`);
            // Use the updateProduct method to add the product back
            // We're not using actual updateProduct here since it's not in scope
            document.dispatchEvent(new CustomEvent('restoreDeletedProduct', { 
              detail: { product: productData } 
            }));
            
            // Refresh products to ensure consistency
            await ProductFileService.refreshProducts();
          } catch (restoreError) {
            console.error('Failed to restore product in UI:', restoreError);
          }
          
          throw new Error(`Failed to delete product ${productId}: ${apiError.message || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error deleting product:', error);
        setMessage({
          text: `Failed to delete product: ${error?.message || 'Unknown error'}`,
          type: 'error'
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Delete Product</h2>
      
      <div className="mb-6">
        <div className="flex items-center p-2 border border-gray-300 rounded-lg bg-gray-50">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by product ID or name"
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Warning message */}
      <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 flex items-start">
        <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Warning</p>
          <p className="text-sm">
            Deleting a product is permanent and cannot be undone. The product will be permanently removed from products.json.
          </p>
        </div>
      </div>
      
      {/* Product selection list */}
      {filteredProducts.length > 0 ? (
        <div className="mb-6 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className={`border-t border-gray-200 hover:bg-gray-50 ${productId === product.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-2 px-4 font-medium">{product.id}</td>
                  <td className="py-2 px-4">{product.name}</td>
                  <td className="py-2 px-4 capitalize">{product.category}</td>
                  <td className="py-2 px-4 text-right">₹{product.price}</td>
                  <td className="py-2 px-4 text-center">
                    <button
                      onClick={() => setProductId(product.id)}
                      className={`px-3 py-1 rounded text-xs ${
                        productId === product.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 text-center text-gray-500 rounded-lg">
          No products found matching your search criteria
        </div>
      )}
      
      {/* Delete form */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Product ID</label>
          <div className="flex">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded-lg"
              placeholder="Enter product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
          </div>
        </div>
        
        <button
          onClick={handleDeleteProduct}
          disabled={isDeleting || !productId}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg text-white font-medium ${
            isDeleting || !productId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-5 w-5 mr-2" />
              Delete Product
            </>
          )}
        </button>
      </div>
      
      {/* Status message */}
      {message.text && (
        <div className={`rounded-lg p-4 mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default DeleteProduct;
