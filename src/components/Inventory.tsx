import React, { useState, useEffect } from 'react';
import { useInventory, StockTransaction } from '../services/InventoryService';
import { useProducts } from '../context/ProductContext';
import { productSyncUtils } from '../utils/productSyncUtils';
import { X, ArrowDown, ArrowUp, PenSquare, Trash2, Search, Download, RotateCcw, FileText } from 'lucide-react';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'decrease' | 'increase' | 'adjustment'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const { getAllTransactions, getProductTransactions, recordTransaction, clearTransactions, generateStockReport } = useInventory();
  const { products, updateStock } = useProducts();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [stockAdjustment, setStockAdjustment] = useState({
    productId: '',
    size: '',
    quantity: 1,
    type: 'increase' as 'increase' | 'decrease' | 'adjustment',
    note: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load transactions when component mounts or when filter/search changes
  useEffect(() => {
    loadTransactions();
  }, [selectedProduct, filter, searchTerm]);
  
  // Listen for product updates from other components (like ProductManager)
  useEffect(() => {
    const handleProductsUpdated = () => {
      console.log('Inventory: Detected products update, refreshing transactions');
      loadTransactions();
    };
    
    const handleStockUpdated = (event: any) => {
      console.log('Inventory: Detected stock update', event.detail);
      loadTransactions();
    };
    
    // Listen for various product-related events
    document.addEventListener('productsUpdated', handleProductsUpdated);
    document.addEventListener('productStockUpdated', handleStockUpdated);
    document.addEventListener('productsSaved', handleProductsUpdated);
    
    return () => {
      document.removeEventListener('productsUpdated', handleProductsUpdated);
      document.removeEventListener('productStockUpdated', handleStockUpdated);
      document.removeEventListener('productsSaved', handleProductsUpdated);
    };
  }, []);

  const loadTransactions = () => {
    let filteredTransactions: StockTransaction[];
    
    // If a product is selected, get only transactions for that product
    if (selectedProduct) {
      filteredTransactions = getProductTransactions(selectedProduct);
    } else {
      filteredTransactions = getAllTransactions();
    }

    // Apply type filter
    if (filter !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.type === filter);
    }

    // Apply search filter
    if (searchTerm) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerInfo?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerInfo?.phone.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setTransactions(filteredTransactions);
  };

  const handleStockAdjustment = async () => {
    if (!stockAdjustment.productId || !stockAdjustment.size) {
      alert('Please select a product and size');
      return;
    }

    // Find the product and calculate the new stock value
    const product = products.find(p => p.id === stockAdjustment.productId);
    if (!product) {
      alert('Selected product not found');
      return;
    }
    
    const currentStock = product.sizes[stockAdjustment.size]?.stock || 0;
    let newStock = currentStock;
    
    if (stockAdjustment.type === 'increase') {
      newStock = currentStock + stockAdjustment.quantity;
    } else if (stockAdjustment.type === 'decrease') {
      newStock = Math.max(0, currentStock - stockAdjustment.quantity);
    } else if (stockAdjustment.type === 'adjustment') {
      // For adjustment, we directly set the new stock value
      newStock = stockAdjustment.quantity;
    }
    
    try {
      // Record the transaction in our inventory system
      recordTransaction({
        productId: stockAdjustment.productId,
        size: stockAdjustment.size,
        quantity: stockAdjustment.quantity,
        type: stockAdjustment.type,
        note: stockAdjustment.note || `Manual ${stockAdjustment.type}`
      });
      
      // Update the stock in ProductContext
      updateStock(stockAdjustment.productId, stockAdjustment.size, newStock);
      
      // Use our sync utility to notify all components and sync with the file
      productSyncUtils.notifyStockChanged(
        stockAdjustment.productId, 
        stockAdjustment.size, 
        newStock, 
        stockAdjustment.type
      );
      
      // Also notify about the manual update specifically
      document.dispatchEvent(new CustomEvent('productStockManuallyUpdated', {
        detail: {
          productId: stockAdjustment.productId,
          size: stockAdjustment.size,
          previousStock: currentStock,
          newStock: newStock,
          type: stockAdjustment.type,
          note: stockAdjustment.note || `Manual ${stockAdjustment.type}`
        }
      }));
      
      // Reset form and refresh transactions
      setStockAdjustment({
        productId: '',
        size: '',
        quantity: 1,
        type: 'increase',
        note: ''
      });
      setIsModalOpen(false);
      loadTransactions();
      
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('There was an error updating the stock. Please try again.');
    }
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Transaction ID', 'Product ID', 'Size', 'Quantity', 'Type', 'Order ID', 'Customer', 'Date', 'Note'];
    const rows = transactions.map(t => [
      t.id,
      t.productId,
      t.size,
      t.quantity,
      t.type,
      t.orderId || '',
      t.customerInfo ? `${t.customerInfo.name} (${t.customerInfo.phone})` : '',
      t.timestamp.toLocaleString(),
      t.note || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : productId;
  };

  // When used as a modal, respect the isOpen prop
  // When used in the admin panel tab, we'll always show it
  if (!isOpen) return null;

  const stockReport = generateStockReport();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 z-10 bg-white">
            <h2 className="text-xl font-bold text-gray-900">Inventory Management</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                >
                  <option value="all">All Transactions</option>
                  <option value="decrease">Stock Decreases</option>
                  <option value="increase">Stock Increases</option>
                  <option value="adjustment">Adjustments</option>
                </select>
                
                <select
                  value={selectedProduct || ''}
                  onChange={(e) => setSelectedProduct(e.target.value || null)}
                  className="py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                >
                  <option value="">All Products</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 py-2 px-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition-colors"
                >
                  <PenSquare className="h-4 w-4" />
                  <span>Adjust Stock</span>
                </button>
                
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 py-2 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm text-gray-500 mb-1">Total Transactions</h3>
                <p className="text-2xl font-bold">{stockReport.totalTransactions}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm text-gray-500 mb-1">Stock Decreases</h3>
                <p className="text-2xl font-bold text-red-500">{stockReport.decreases}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm text-gray-500 mb-1">Stock Increases</h3>
                <p className="text-2xl font-bold text-green-500">{stockReport.increases}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm text-gray-500 mb-1">Manual Adjustments</h3>
                <p className="text-2xl font-bold text-blue-500">{stockReport.adjustments}</p>
              </div>
            </div>
          </div>
          
          {/* Transactions Table */}
          <div className="flex-1 p-4 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No transactions found</h3>
                <p className="text-sm text-gray-500 mb-4">There are no inventory transactions matching your criteria</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                    setSelectedProduct(null);
                  }}
                  className="flex items-center gap-1 py-2 px-4 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset filters</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order/Note</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {getProductName(transaction.productId)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {transaction.size}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center ${
                            transaction.type === 'decrease' ? 'text-red-600' : 
                            transaction.type === 'increase' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {transaction.type === 'decrease' ? <ArrowDown className="h-3 w-3 mr-1" /> : 
                             transaction.type === 'increase' ? <ArrowUp className="h-3 w-3 mr-1" /> : 
                             <PenSquare className="h-3 w-3 mr-1" />}
                            {transaction.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'decrease' ? 'bg-red-100 text-red-800' : 
                            transaction.type === 'increase' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {transaction.orderId && (
                            <div className="text-gray-900 font-medium">{transaction.orderId}</div>
                          )}
                          {transaction.customerInfo && (
                            <div className="text-gray-500 text-xs">
                              {transaction.customerInfo.name} ({transaction.customerInfo.phone})
                            </div>
                          )}
                          {transaction.note && (
                            <div className="text-gray-500 text-xs italic mt-1">{transaction.note}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="p-4 border-t flex justify-between">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all transaction history? This action cannot be undone.')) {
                  clearTransactions();
                  loadTransactions();
                }
              }}
              className="flex items-center gap-1 py-2 px-3 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear History</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Stock Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Adjust Stock</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={stockAdjustment.productId}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, productId: e.target.value})}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={stockAdjustment.size}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, size: e.target.value})}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  disabled={!stockAdjustment.productId}
                >
                  <option value="">Select a size</option>
                  {stockAdjustment.productId && products.find(p => p.id === stockAdjustment.productId)?.sizes &&
                    Object.keys(products.find(p => p.id === stockAdjustment.productId)!.sizes).map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))
                  }
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="increase"
                      checked={stockAdjustment.type === 'increase'}
                      onChange={() => setStockAdjustment({...stockAdjustment, type: 'increase'})}
                      className="mr-2"
                    />
                    <span>Increase</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="decrease"
                      checked={stockAdjustment.type === 'decrease'}
                      onChange={() => setStockAdjustment({...stockAdjustment, type: 'decrease'})}
                      className="mr-2"
                    />
                    <span>Decrease</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="adjustment"
                      checked={stockAdjustment.type === 'adjustment'}
                      onChange={() => setStockAdjustment({...stockAdjustment, type: 'adjustment'})}
                      className="mr-2"
                    />
                    <span>Set Value</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {stockAdjustment.type === 'adjustment' ? 'New Stock Value' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, quantity: parseInt(e.target.value) || 0})}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                <textarea
                  value={stockAdjustment.note}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, note: e.target.value})}
                  placeholder="Reason for adjustment"
                  rows={2}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                className="py-2 px-4 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
