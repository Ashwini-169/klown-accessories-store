import React, { useState, useEffect } from 'react';
import { Edit, Save, PlusCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

interface Feature {
  id: string;
  icon: string;
  text: string;
  color: string;
}

interface HeroContent {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  buttonText: string;
  buttonLink: string;
}

// This interface represents the structure of our banner-admin.json file
// It's the same as HeroContent but explicitly defined for clarity

const ContentManager: React.FC = () => {
  const [content, setContent] = useState<HeroContent>({
    id: "hero1",
    type: "content",
    title: "KLOWN",
    subtitle: "Metal Accessories",
    description: "Premium steel bracelets, rings, necklaces & more for the modern man",
    features: [],
    buttonText: "Shop Collection",
    buttonLink: "#products"
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load banner-admin.json content
  useEffect(() => {
    const loadContent = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/readfile?filePath=src/data/banner-admin.json`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            setContent(data.data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load banner content:", error);
      }
    };

    loadContent();

    // Set up Socket.IO for real-time updates
    const hostname = window.location.hostname;
    const socket = io(`http://${hostname}:3001`);
    
    socket.on('bannerAdminChanged', () => {
      console.log('Banner admin data changed, refreshing...');
      loadContent();
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const hostname = window.location.hostname;
      
      await axios.post(`http://${hostname}:3001/api/savefile`, {
        filePath: 'src/data/banner-admin.json',
        data: [content]
      });

      setIsEditing(false);
      alert('Content saved successfully!');
    } catch (error) {
      console.error("Failed to save content:", error);
      alert('Failed to save content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addFeature = () => {
    const newFeature: Feature = {
      id: `feature${content.features.length + 1}`,
      icon: "Star",
      text: "New Feature",
      color: "gray"
    };
    setContent({
      ...content,
      features: [...content.features, newFeature]
    });
  };

  const removeFeature = (id: string) => {
    setContent({
      ...content,
      features: content.features.filter(feature => feature.id !== id)
    });
  };

  const updateFeature = (id: string, field: string, value: string) => {
    setContent({
      ...content,
      features: content.features.map(feature => 
        feature.id === id ? { ...feature, [field]: value } : feature
      )
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Hero Content Management</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors"
          >
            <Edit className="h-5 w-5" />
            <span>Edit Content</span>
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Title & Subtitle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Title</label>
            <input
              type="text"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={content.subtitle}
              onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={content.description}
            onChange={(e) => setContent({ ...content, description: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
          />
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Features</label>
            {isEditing && (
              <button
                onClick={addFeature}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Feature
              </button>
            )}
          </div>

          <div className="space-y-3">
            {content.features.map((feature) => (
              <div key={feature.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Icon</label>
                    <select
                      value={feature.icon}
                      onChange={(e) => updateFeature(feature.id, 'icon', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                    >
                      <option value="Star">Star</option>
                      <option value="Truck">Truck</option>
                      <option value="Shield">Shield</option>
                      <option value="Zap">Zap</option>
                      <option value="Heart">Heart</option>
                      <option value="Award">Award</option>
                      <option value="Gift">Gift</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Text</label>
                    <input
                      type="text"
                      value={feature.text}
                      onChange={(e) => updateFeature(feature.id, 'text', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                    <select
                      value={feature.color}
                      onChange={(e) => updateFeature(feature.id, 'color', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md disabled:bg-gray-100"
                    >
                      <option value="yellow">Yellow</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="purple">Purple</option>
                      <option value="red">Red</option>
                      <option value="pink">Pink</option>
                      <option value="indigo">Indigo</option>
                      <option value="gray">Gray</option>
                    </select>
                  </div>
                </div>
                {isEditing && (
                  <button
                    onClick={() => removeFeature(feature.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Button */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
            <input
              type="text"
              value={content.buttonText}
              onChange={(e) => setContent({ ...content, buttonText: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
            <input
              type="text"
              value={content.buttonLink}
              onChange={(e) => setContent({ ...content, buttonLink: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Preview</h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{content.title}</h1>
            <span className="block text-xl text-yellow-500 font-medium">{content.subtitle}</span>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">{content.description}</p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 my-4">
              {content.features.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-1">
                  <span className={`inline-block w-3 h-3 rounded-full bg-${feature.color}-400`}></span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
            
            <button className="inline-block mt-3 bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-full text-sm font-semibold">
              {content.buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;
