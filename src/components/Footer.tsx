import React, { useState, useEffect } from 'react';
import { Crown, MapPin, Phone, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIsMobile();
    
    // Add listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleAdminAccess = () => {
    const password = prompt('Enter admin password:');
    if (password === 'klown_admin_2025') {
      window.location.href = '/admin';
    } else if (password) {
      alert('Invalid password');
    }
  };

  return (
    <footer className="bg-black text-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-8' : 'py-12'}`}>
        <div className={`${isMobile ? 'grid grid-cols-1 gap-6' : 'grid md:grid-cols-4 gap-8'}`}>
          <div className={`${isMobile ? '' : 'col-span-2'}`}>
            <div className="flex items-center space-x-2 mb-4">
              <Crown className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-400`} />
              <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>KLOWN</h3>
            </div>
            <p className={`text-gray-300 mb-4 max-w-md ${isMobile ? 'text-sm' : ''}`}>
              Premium metal accessories for the modern gentleman. Crafted with precision, 
              designed for style, built to last.
            </p>
            <div className="flex space-x-4">
              <div className="bg-gray-800 px-3 py-2 rounded-lg">
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>Since</span>
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-yellow-400`}>2025</div>
              </div>
              <div className="bg-gray-800 px-3 py-2 rounded-lg">
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>Products</span>
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-yellow-400`}>100+</div>
              </div>
            </div>
          </div>

          {isMobile ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-base font-semibold mb-3">Quick Links</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li><a href="#products" className="hover:text-yellow-400 transition-colors">Products</a></li>
                  <li><a href="#about" className="hover:text-yellow-400 transition-colors">About Us</a></li>
                  <li><a href="#shipping" className="hover:text-yellow-400 transition-colors">Shipping Info</a></li>
                  <li><a href="#returns" className="hover:text-yellow-400 transition-colors">Returns</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-base font-semibold mb-3">Contact Info</h4>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs">Mumbai, India</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs">+91 98765 43210</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs">support@klown.in</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#products" className="hover:text-yellow-400 transition-colors">Products</a></li>
                  <li><a href="#about" className="hover:text-yellow-400 transition-colors">About Us</a></li>
                  <li><a href="#shipping" className="hover:text-yellow-400 transition-colors">Shipping Info</a></li>
                  <li><a href="#returns" className="hover:text-yellow-400 transition-colors">Returns</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">Mumbai, Maharashtra, India</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">+91 98765 43210</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">support@klown.in</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`border-t border-gray-800 ${isMobile ? 'mt-6 pt-6' : 'mt-12 pt-8'} flex flex-col md:flex-row justify-between items-center`}>
          <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>© 2025 KLOWN. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className={`text-gray-400 hover:text-yellow-400 ${isMobile ? 'text-xs' : 'text-sm'} transition-colors`}>Privacy Policy</a>
            <a href="#" className={`text-gray-400 hover:text-yellow-400 ${isMobile ? 'text-xs' : 'text-sm'} transition-colors`}>Terms of Service</a>
            <button 
              onClick={handleAdminAccess}
              className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              onDoubleClick={() => window.location.href = '/admin'}
            >
              •
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;