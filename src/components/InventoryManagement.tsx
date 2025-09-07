import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2, ArrowLeft } from 'lucide-react';
import Inventory from './Inventory';

const InventoryManagement: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  const navigate = useNavigate();
  
  const adminPassword = 'klown_admin_2025';

  const handleLogin = () => {
    setIsLoading(true);
    
    // Add a small delay to simulate authentication
    setTimeout(() => {
      if (password === adminPassword) {
        setIsAuthenticated(true);
        setLoginAttempts(0);
      } else {
        setLoginAttempts(prev => prev + 1);
        alert('Invalid password');
      }
      setIsLoading(false);
    }, 800);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">Enter password to access inventory</p>
            {loginAttempts > 2 && (
              <p className="text-red-500 text-sm mt-2">
                Hint: Password is klown_admin_2025
              </p>
            )}
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              disabled={isLoading}
            />
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 rounded-lg font-semibold 
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:from-yellow-300 hover:to-orange-400'} 
                transition-all flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-black text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">KLOWN Inventory</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </button>
            
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <Inventory isOpen={true} onClose={() => navigate('/')} />
    </div>
  );
};

export default InventoryManagement;
