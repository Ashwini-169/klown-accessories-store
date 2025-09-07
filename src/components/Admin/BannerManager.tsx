import React, { useState, useEffect } from 'react';
import { Image, Save, Trash2, Plus, ArrowUpDown } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

interface HeroImage {
  id: string;
  url: string;
  active: boolean;
}

interface HeroImagesData {
  id: string;
  images: HeroImage[];
  autoSlideInterval: number;
  overlayOpacity: number;
  overlayColor: string;
}

const BannerManager: React.FC = () => {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSlideInterval, setAutoSlideInterval] = useState(5000);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [overlayColor, setOverlayColor] = useState('#000000');
  
  // Load hero images data from file when component mounts
  useEffect(() => {
    const loadHeroImages = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/hero-images.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const heroData = data.data[0] as HeroImagesData;
            setHeroImages(heroData.images || []);
            setAutoSlideInterval(heroData.autoSlideInterval || 5000);
            setOverlayOpacity(heroData.overlayOpacity !== undefined ? heroData.overlayOpacity : 0.7);
            setOverlayColor(heroData.overlayColor || '#000000');
          }
        }
      } catch (error) {
        console.error("Failed to load hero images:", error);
      }
    };
    
    loadHeroImages();
    
    // Set up Socket.IO for real-time updates
    const hostname = window.location.hostname;
    const socket = io(`http://${hostname}:3001`);
    
    socket.on('heroImagesChanged', () => {
      console.log('Hero images changed, refreshing...');
      loadHeroImages();
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const hostname = window.location.hostname;
      
      await axios.post(`http://${hostname}:3001/api/savefile`, {
        filePath: 'src/data/hero-images.json',
        data: [
          {
            id: "heroImages",
            images: heroImages,
            autoSlideInterval: autoSlideInterval,
            overlayOpacity: overlayOpacity,
            overlayColor: overlayColor
          }
        ]
      });
      
      // Broadcast update
      io(`http://${hostname}:3001`).emit('requestDataChange', { fileType: 'heroImages' });
      
      alert('Hero images saved successfully!');
    } catch (error) {
      console.error("Failed to save hero images:", error);
      alert('Failed to save hero images. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const addNewImage = () => {
    if (!newImageUrl.trim()) {
      alert('Please enter an image URL');
      return;
    }
    
    const newImage: HeroImage = {
      id: `img${Date.now()}`,
      url: newImageUrl.trim(),
      active: true
    };
    
    setHeroImages([...heroImages, newImage]);
    setNewImageUrl('');
  };
  
  const removeImage = (id: string) => {
    setHeroImages(heroImages.filter(img => img.id !== id));
  };
  
  const toggleImageActive = (id: string) => {
    setHeroImages(heroImages.map(img => 
      img.id === id ? { ...img, active: !img.active } : img
    ));
  };

  const suggestedBanners = [
    'https://images.pexels.com/photos/8838877/pexels-photo-8838877.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/8838881/pexels-photo-8838881.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/8838890/pexels-photo-8838890.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Hero Image Carousel Management</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Hero Images Carousel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {heroImages.length > 0 ? (
              heroImages.map((image) => (
                <div 
                  key={image.id} 
                  className={`relative rounded-lg overflow-hidden border-2 ${image.active ? 'border-green-500' : 'border-red-500'}`}
                >
                  <img
                    src={image.url}
                    alt="Hero carousel image"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-0 right-0 p-2 flex gap-2">
                    <button
                      onClick={() => toggleImageActive(image.id)}
                      className={`p-2 rounded-full ${image.active ? 'bg-green-500' : 'bg-red-500'} text-white`}
                      title={image.active ? 'Disable image' : 'Enable image'}
                    >
                      {image.active ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-2 rounded-full bg-black bg-opacity-70 text-white"
                      title="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-3 text-center py-8">No hero images added yet. Add images below.</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carousel Slide Interval (ms)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={autoSlideInterval}
                onChange={(e) => setAutoSlideInterval(Number(e.target.value))}
                min="1000"
                step="500"
                className="w-32 p-2 border border-gray-300 rounded-lg"
              />
              <span className="text-sm text-gray-500">
                {autoSlideInterval / 1000} seconds between slides
              </span>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-md font-semibold mb-3">Background Overlay Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overlay Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="h-10 w-24"
                  />
                  <input
                    type="text"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-32 p-2 border border-gray-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overlay Opacity ({Math.round(overlayOpacity * 100)}%)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  0% = completely transparent, 100% = completely opaque
                </p>
              </div>
            </div>
            
            {/* Overlay Preview */}
            <div className="mt-4 border rounded-lg overflow-hidden">
              <div className="p-2 bg-gray-100 border-b text-sm font-medium">Preview</div>
              <div className="relative h-24">
                {heroImages.length > 0 && (
                  <img 
                    src={heroImages[0].url} 
                    alt="Background preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div 
                  className="absolute inset-0"
                  style={{ 
                    backgroundColor: overlayColor,
                    opacity: overlayOpacity
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-white font-bold text-lg">Sample Hero Content</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Hero Image URL
            </label>
            <div className="flex space-x-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Enter image URL"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={addNewImage}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
          >
            <Save className="h-5 w-5" />
            <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3">Suggested Images</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedBanners.map((url, index) => (
              <div key={index} className="relative group cursor-pointer">
                <img
                  src={url}
                  alt={`Suggested banner ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => setNewImageUrl(url)}
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                >
                  <Image className="h-8 w-8 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerManager;