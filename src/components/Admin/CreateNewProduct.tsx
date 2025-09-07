import React from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Product } from '../../types';

interface Props {
  newProduct: Product;
  setNewProduct: (p: Product) => void;
  onAdd: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const CreateNewProduct: React.FC<Props> = ({ newProduct, setNewProduct, onAdd, onCancel, isSaving }) => {
  return (
    <div className="mb-8 bg-white shadow-lg rounded-xl p-6 border-2 border-yellow-400">
      <div className="flex justify-between mb-4">
        <h3 className="text-xl font-bold">Add New Product</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
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
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg mr-3 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onAdd}
          disabled={!newProduct.name || !newProduct.price || !newProduct.originalPrice || isSaving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>
    </div>
  );
};

export default CreateNewProduct;
