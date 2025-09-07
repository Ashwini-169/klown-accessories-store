import React from 'react';
import { Save, X, Plus } from 'lucide-react';
import { Product } from '../../types';

interface Props {
  editingProduct: Product;
  setEditingProduct: (p: Product | null) => void;
  onSave: () => void;
  onAddImage: (p: Product) => void;
  onRemoveImage: (p: Product, idx: number) => void;
  onAddSize: (p: Product, size: string) => void;
  onRemoveSize: (p: Product, size: string) => void;
  onPriceChange: (productId: string, newPrice: number) => void;
  onStockChange: (productId: string, size: string, newStock: number) => void;
  isSaving: boolean;
}

const UpdateProduct: React.FC<Props> = ({ editingProduct, setEditingProduct, onSave, onAddImage, onRemoveImage, onAddSize, onRemoveSize, onPriceChange, onStockChange, isSaving }) => {
  if (!editingProduct) return null as any;

  return (
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
            onClick={onSave}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
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
                  onClick={() => onRemoveImage(editingProduct, index)}
                  className="ml-2 p-2 text-red-500 hover:bg-red-100 rounded-lg"
                  disabled={editingProduct.images.length <= 1}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onAddImage(editingProduct)}
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
                  onChange={(e) => onPriceChange(editingProduct.id, parseInt(e.target.value) || 0)}
                  className="p-2 border border-gray-300 rounded-lg w-24"
                />
                <span className="text-sm text-gray-500">₹</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-20">Original:</span>
                <input
                  type="number"
                  value={editingProduct.originalPrice}
                  readOnly
                  className="p-2 border border-gray-200 bg-gray-50 rounded-lg w-24"
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
            <div className="flex justify-between items-center mb-3">
              <label className="block font-semibold">Sizes and Stock</label>
              <button
                onClick={() => {
                  const newSize = prompt('Enter new size name:');
                  if (newSize && !editingProduct.sizes[newSize]) {
                    onAddSize(editingProduct, newSize);
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
                    onClick={() => onRemoveSize(editingProduct, size)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-medium text-gray-700 mb-2">Size {size}</div>
                  <input
                    type="number"
                    value={sizeInfo.stock}
                    onChange={(e) => onStockChange(editingProduct.id, size, parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateProduct;
