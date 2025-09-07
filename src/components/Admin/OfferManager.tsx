import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Star } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { SpecialOffer, Coupon } from '../../types';
import axios from 'axios';
import { io } from 'socket.io-client';

interface Banner {
  id: string;
  type: string;
  couponIds: string[];
}

const OfferManager: React.FC = () => {
  const { specialOffers, updateSpecialOffers, coupons } = useProducts();
  const [isEditing, setIsEditing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [bannerData, setBannerData] = useState<Banner[]>([]);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [showCouponSelector, setShowCouponSelector] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  
  // Load banner data
  useEffect(() => {
    const loadBannerData = async () => {
      try {
        // Use fetch API to read banner.json from server
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/banner.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setBannerData(data.data);
            if (data.data[0]?.couponIds) {
              setSelectedCoupons(data.data[0].couponIds);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load banner data:", error);
      }
    };
    
    loadBannerData();
    
    // Set up Socket.IO connection
    const hostname = window.location.hostname;
    const socketConnection = io(`http://${hostname}:3001`);
    setSocket(socketConnection);
    
    // Listen for banner data changes
    socketConnection.on('bannerChanged', () => {
      console.log('Banner data changed, refreshing admin view...');
      loadBannerData();
    });
    
    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // Save banner data
  const saveBannerData = async () => {
    try {
      const hostname = window.location.hostname;
      const updatedBanner = bannerData.length > 0 
        ? [{ ...bannerData[0], couponIds: selectedCoupons }] 
        : [{ id: "banner1", type: "special", couponIds: selectedCoupons }];
        
      const response = await axios.post(`http://${hostname}:3001/api/savefile`, {
        filePath: 'src/data/banner.json',
        data: updatedBanner
      });
      
      // The server will broadcast the change event via Socket.IO
      if (response.data.success) {
        // Update our local state immediately
        setBannerData(updatedBanner);
        console.log("Banner data saved successfully, changes will propagate to all connected clients");
        alert("Special offers banner updated successfully!");
      } else {
        throw new Error("Server returned error response");
      }
    } catch (error) {
      console.error("Failed to save banner data:", error);
      alert("Failed to save banner data. Please try again.");
    }
  };
  
  // Toggle coupon selection
  const toggleCouponSelection = (couponId: string) => {
    setSelectedCoupons(prev => 
      prev.includes(couponId)
        ? prev.filter(id => id !== couponId)
        : [...prev, couponId]
    );
  };

  const handleAddOffer = () => {
    const newOffer: SpecialOffer = {
      id: 'NEW' + Date.now(),
      title: 'New Offer',
      description: 'Special discount',
      discount: 10,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      active: true
    };
    updateSpecialOffers([...specialOffers, newOffer]);
  };

  const handleUpdateOffer = (offer: SpecialOffer) => {
    updateSpecialOffers(
      specialOffers.map(o => o.id === offer.id ? offer : o)
    );
    setIsEditing(false);
    setEditingOffer(null);
  };

  const handleDeleteOffer = (offerId: string) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      updateSpecialOffers(specialOffers.filter(o => o.id !== offerId));
    }
  };

  const toggleOfferStatus = (offerId: string) => {
    updateSpecialOffers(
      specialOffers.map(offer =>
        offer.id === offerId ? { ...offer, active: !offer.active } : offer
      )
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Special Offers Management</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCouponSelector(true)}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors"
          >
            <Star className="h-5 w-5" />
            <span>Select Special Offers</span>
          </button>
          <button
            onClick={handleAddOffer}
            className="flex items-center space-x-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Offer</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {specialOffers.map(offer => (
          <div key={offer.id} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Tag className={`h-6 w-6 ${offer.active ? 'text-green-500' : 'text-gray-400'}`} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{offer.title}</h3>
                  <p className="text-sm text-gray-600">Code: {offer.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleOfferStatus(offer.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    offer.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {offer.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => {
                    setEditingOffer(offer);
                    setIsEditing(true);
                  }}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Description:</span>
                <p className="font-medium">{offer.description}</p>
              </div>
              <div>
                <span className="text-gray-600">Discount:</span>
                <p className="font-medium text-green-600">{offer.discount}% OFF</p>
              </div>
              <div>
                <span className="text-gray-600">Valid Until:</span>
                <p className="font-medium">{new Date(offer.validUntil).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && editingOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit Offer</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Offer Title"
                value={editingOffer.title}
                onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Description"
                value={editingOffer.description}
                onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Discount %"
                value={editingOffer.discount}
                onChange={(e) => setEditingOffer({ ...editingOffer, discount: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={new Date(editingOffer.validUntil).toISOString().split('T')[0]}
                onChange={(e) => setEditingOffer({ ...editingOffer, validUntil: new Date(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleUpdateOffer(editingOffer)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingOffer(null);
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special Offers Coupon Selection Modal */}
      {showCouponSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Select Coupons for Special Offers</h3>
            <p className="text-gray-600 mb-4">
              Choose any number of coupons to feature as special offers in the hero banner section.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.filter(coupon => coupon.active).map(coupon => (
                <div 
                  key={coupon.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCoupons.includes(coupon.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => toggleCouponSelection(coupon.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{coupon.title}</h4>
                      <p className="text-sm text-gray-600">{coupon.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {coupon.type.charAt(0).toUpperCase() + coupon.type.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          Code: {coupon.code || coupon.id}
                        </span>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                      selectedCoupons.includes(coupon.id) 
                        ? 'bg-blue-500 text-white' 
                        : 'border border-gray-300'
                    }`}>
                      {selectedCoupons.includes(coupon.id) && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  saveBannerData();
                  setShowCouponSelector(false);
                }}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Save Special Offers
              </button>
              <button
                onClick={() => setShowCouponSelector(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferManager;