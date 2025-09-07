import React, { useState, useEffect } from 'react';
import { useProducts } from '../../context/ProductContext';
import { Coupon } from '../../types';
import { Calendar, Tag, Clipboard, CheckCircle, ShoppingCart, Clock, Trash2, Edit, Plus, Crown } from 'lucide-react';
import CouponDisplay from './CouponDisplay';
import { couponSyncUtils } from '../../utils/couponSyncUtils';

type CouponType = 'percentage' | 'fixed' | 'special' | 'gift';
type SpecialType = 'buyXgetY' | 'mysteryGift' | undefined;

interface FormCoupon extends Omit<Coupon, 'validUntil'> {
  validUntil: string; // YYYY-MM-DD format
}

const INITIAL_COUPON: FormCoupon = {
  id: '',
  code: '',
  title: '',
  description: '',
  discount: 0,
  type: 'percentage',
  maxDiscount: 0,
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  active: true,
  usageLimit: 100,
  usedCount: 0,
  isVisible: true,
  adminRecommended: false
};

const CreateCoupon: React.FC = () => {
  const { coupons, updateCoupons } = useProducts();
  const [formCoupon, setFormCoupon] = useState<FormCoupon>({ ...INITIAL_COUPON });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sort coupons by date
  const sortedCoupons = [...coupons].sort((a, b) => {
    const dateA = new Date(a.validUntil);
    const dateB = new Date(b.validUntil);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });
  
  // Reset form
  const resetForm = () => {
    setFormCoupon({ 
      ...INITIAL_COUPON,
      id: 'COUPON_' + Date.now(), 
      code: generateRandomCode(6)
    });
    setIsEditing(false);
    setSelectedCouponId(null);
  };
  
  // Generate a random coupon code
  const generateRandomCode = (length: number): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  // Initialize with a random code
  useEffect(() => {
    resetForm();
  }, []);
  
  // Load coupon data when editing
  useEffect(() => {
    if (selectedCouponId) {
      const couponToEdit = coupons.find(c => c.id === selectedCouponId);
      if (couponToEdit) {
        setFormCoupon({
          ...couponToEdit,
          validUntil: typeof couponToEdit.validUntil === 'string' 
            ? couponToEdit.validUntil 
            : new Date(couponToEdit.validUntil).toISOString().split('T')[0]
        });
      }
    }
  }, [selectedCouponId, coupons]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormCoupon(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              value
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormCoupon(prev => ({ ...prev, [name]: checked }));
  };
  
  // Save coupon
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!formCoupon.code || !formCoupon.title || formCoupon.discount <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Check for duplicate codes (except when editing the same coupon)
    const duplicateCode = coupons.find(c => 
      c.code === formCoupon.code && c.id !== formCoupon.id
    );
    
    if (duplicateCode) {
      alert(`A coupon with code ${formCoupon.code} already exists`);
      return;
    }
    
    // Show confirmation dialog
    const confirmationMessage = isEditing
      ? `Are you sure you want to update the "${formCoupon.title}" coupon? This will update the data in coupons.json.`
      : `Are you sure you want to create the "${formCoupon.title}" coupon? This will update the data in coupons.json.`;
    
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;
    
    setIsSaving(true);
    
    try {
      let updatedCoupons: Coupon[];
      
      if (isEditing) {
        // Update existing coupon
        updatedCoupons = coupons.map(c => 
          c.id === formCoupon.id ? formCoupon : c
        );
      } else {
        // Add new coupon
        updatedCoupons = [...coupons, formCoupon];
      }
      
      // Use couponSyncUtils to sync with coupons.json
      const success = await couponSyncUtils.syncCoupons(updatedCoupons);
      
      if (success) {
        // Update context
        updateCoupons(updatedCoupons);
        
        if (isEditing) {
          couponSyncUtils.notifyCouponUpdated(formCoupon.id);
          alert(`Coupon "${formCoupon.title}" updated successfully!`);
        } else {
          couponSyncUtils.notifyCouponCreated(formCoupon);
          alert(`Coupon "${formCoupon.title}" created successfully!`);
        }
        
        resetForm(); // Reset form after successful save
      } else {
        throw new Error('Failed to save coupons');
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('There was a problem saving the coupon. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Edit coupon
  const handleEditCoupon = (couponId: string) => {
    setSelectedCouponId(couponId);
    setIsEditing(true);
  };
  
  // Delete coupon
  const handleDeleteCoupon = async (couponId: string) => {
    const couponToDelete = coupons.find(c => c.id === couponId);
    if (!couponToDelete) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the coupon "${couponToDelete.title}"? This will remove it from coupons.json.`
    );
    
    if (!confirmDelete) return;
    
    setIsSaving(true);
    
    try {
      console.log(`Deleting coupon with ID: ${couponId}`);
      const updatedCoupons = coupons.filter(c => c.id !== couponId);
      console.log(`Coupons before: ${coupons.length}, after: ${updatedCoupons.length}`);
      
      // Update context first to ensure UI is responsive
      updateCoupons(updatedCoupons);
      
      // Use couponSyncUtils to sync with coupons.json
      const success = await couponSyncUtils.syncCoupons(updatedCoupons);
      
      if (success) {
        couponSyncUtils.notifyCouponDeleted(couponId);
        alert(`Coupon "${couponToDelete.title}" deleted successfully!`);
        
        if (selectedCouponId === couponId) {
          resetForm();
        }
      } else {
        console.error('Failed to sync coupons to file');
        throw new Error('Failed to delete coupon');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      // Show more detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      alert('There was a problem deleting the coupon. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle coupon active status
  const handleToggleActive = async (couponId: string) => {
    const couponToToggle = coupons.find(c => c.id === couponId);
    if (!couponToToggle) return;
    
    setIsSaving(true);
    
    try {
      const updatedCoupons = coupons.map(c => {
        if (c.id === couponId) {
          return { ...c, active: !c.active };
        }
        return c;
      });
      
      // Use couponSyncUtils to sync with coupons.json
      const success = await couponSyncUtils.syncCoupons(updatedCoupons);
      
      if (success) {
        // Update context
        updateCoupons(updatedCoupons);
        couponSyncUtils.notifyCouponUpdated(couponId);
      } else {
        throw new Error('Failed to toggle coupon active status');
      }
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      alert('There was a problem updating the coupon. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Coupon' : 'Create New Coupon'}
      </h3>
      
      <form onSubmit={handleSaveCoupon} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coupon Code*
            </label>
            <div className="flex">
              <input
                type="text"
                name="code"
                value={formCoupon.code}
                onChange={handleInputChange}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button 
                type="button"
                onClick={() => setFormCoupon(prev => ({ ...prev, code: generateRandomCode(6) }))}
                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                title="Generate random code"
              >
                <Clipboard size={16} />
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title*
            </label>
            <input
              type="text"
              name="title"
              value={formCoupon.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type*
            </label>
            <select
              name="type"
              value={formCoupon.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
              <option value="special">Special Offer</option>
              <option value="gift">Gift Coupon</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formCoupon.type === 'percentage' ? 'Discount (%)' : 'Discount Amount'}*
            </label>
            <input
              type="number"
              name="discount"
              value={formCoupon.discount}
              onChange={handleInputChange}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {(formCoupon.type === 'percentage' || formCoupon.type === 'fixed' || formCoupon.type === 'gift') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Purchase Amount
              </label>
              <input
                type="number"
                name="minAmount"
                value={formCoupon.minAmount || 0}
                onChange={handleInputChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {formCoupon.type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Discount Amount (0 = unlimited)
              </label>
              <input
                type="number"
                name="maxDiscount"
                value={formCoupon.maxDiscount}
                onChange={handleInputChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {/* Special coupon fields */}
          {formCoupon.type === 'special' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Offer Type
                </label>
                <select
                  name="specialType"
                  value={formCoupon.specialType || 'buyXgetY'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="buyXgetY">Buy X Get Y Free</option>
                  <option value="bundle">Bundle Discount</option>
                </select>
              </div>
              
              {formCoupon.specialType === 'buyXgetY' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buy Quantity (X)
                    </label>
                    <input
                      type="number"
                      name="buyQuantity"
                      value={formCoupon.buyQuantity || 3}
                      onChange={handleInputChange}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Get Free Quantity (Y)
                    </label>
                    <input
                      type="number"
                      name="getQuantity"
                      value={formCoupon.getQuantity || 1}
                      onChange={handleInputChange}
                      min={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
              
              {formCoupon.specialType === 'bundle' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Quantity for Bundle
                  </label>
                  <input
                    type="number"
                    name="minQuantity"
                    value={formCoupon.minQuantity || 2}
                    onChange={handleInputChange}
                    min={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </>
          )}
          
          {/* Gift coupon fields */}
          {formCoupon.type === 'gift' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift Type
                </label>
                <select
                  name="giftType"
                  value={formCoupon.giftType || 'mystery'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mystery">Mystery Gift</option>
                  <option value="product">Specific Product</option>
                  <option value="custom">Custom Gift</option>
                </select>
              </div>
              
              {formCoupon.giftType === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gift Product ID
                  </label>
                  <input
                    type="text"
                    name="giftProductId"
                    value={formCoupon.giftProductId || ''}
                    onChange={handleInputChange}
                    placeholder="Enter product ID for gift"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift Description
                </label>
                <input
                  type="text"
                  name="giftDescription"
                  value={formCoupon.giftDescription || ''}
                  onChange={handleInputChange}
                  placeholder="Describe the gift"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift Image URL
                </label>
                <input
                  type="text"
                  name="giftImage"
                  value={formCoupon.giftImage || '/gift-box.png'}
                  onChange={handleInputChange}
                  placeholder="URL to gift image"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until
            </label>
            <input
              type="date"
              name="validUntil"
              value={formCoupon.validUntil}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formCoupon.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Limit (0 = unlimited)
            </label>
            <input
              type="number"
              name="usageLimit"
              value={formCoupon.usageLimit}
              onChange={handleInputChange}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="active"
              id="active"
              checked={formCoupon.active}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isVisible"
              id="isVisible"
              checked={formCoupon.isVisible}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isVisible" className="ml-2 text-sm text-gray-700">
              Visible to Customers
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="adminRecommended"
              id="adminRecommended"
              checked={formCoupon.adminRecommended}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="adminRecommended" className="ml-2 text-sm text-gray-700">
              Admin Recommended
            </label>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear Form
          </button>
          
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Coupon' : 'Create Coupon'}
          </button>
        </div>
      </form>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Coupons</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                    No coupons found
                  </td>
                </tr>
              ) : (
                sortedCoupons.map(coupon => {
                  const isExpired = new Date(coupon.validUntil) < new Date();
                  
                  return (
                    <tr key={coupon.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center">
                          <Tag size={16} className="mr-2 text-gray-500" />
                          <span className="font-mono">{coupon.code}</span>
                          {coupon.adminRecommended && (
                            <span title="Admin Recommended"><Crown size={16} className="ml-2 text-amber-500" /></span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.title}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CouponDisplay coupon={coupon} />
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-blue-500" />
                          {typeof coupon.validUntil === 'string' 
                            ? new Date(coupon.validUntil).toLocaleDateString() 
                            : new Date(coupon.validUntil).toLocaleDateString()}
                          {isExpired && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {coupon.active ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full flex items-center">
                              <CheckCircle size={14} className="mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleToggleActive(coupon.id)}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              coupon.active ? 'text-green-600' : 'text-gray-500'
                            }`}
                            title={coupon.active ? 'Deactivate' : 'Activate'}
                            disabled={isSaving}
                          >
                            {coupon.active ? (
                              <CheckCircle size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditCoupon(coupon.id)}
                            className="p-1 rounded hover:bg-gray-100 text-blue-600"
                            title="Edit"
                            disabled={isSaving}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="p-1 rounded hover:bg-gray-100 text-red-600"
                            title="Delete"
                            disabled={isSaving}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CreateCoupon;
