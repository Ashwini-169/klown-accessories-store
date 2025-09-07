import React from 'react';
import { Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';

const StatsOverview: React.FC = () => {
  const { products } = useProducts();

  const totalProducts = products.length;
  const totalStock = products.reduce((total, product) => 
    total + (product.sizes ? Object.values(product.sizes).reduce((sum, size) => sum + (size?.stock || 0), 0) : 0), 0
  );
  const lowStockItems = products.filter(product => 
    product.sizes && Object.values(product.sizes).some(size => size?.stock <= 5 && size?.stock > 0)
  );
  const outOfStockItems = products.filter(product =>
    product.sizes && Object.values(product.sizes).every(size => size?.stock === 0)
  );

  const stats = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'blue' },
    { label: 'Total Stock', value: totalStock, icon: TrendingUp, color: 'green' },
    { label: 'Low Stock Items', value: lowStockItems.length, icon: ShoppingCart, color: 'orange' },
    { label: 'Out of Stock', value: outOfStockItems.length, icon: Users, color: 'red' }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Low Stock Alert</h3>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-600">All products are well-stocked!</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {product.sizes 
                        ? Object.entries(product.sizes)
                          .filter(([_, size]) => size?.stock <= 5 && size?.stock > 0)
                          .map(([sizeName, size]) => `${sizeName}: ${size?.stock}`)
                          .join(', ')
                        : 'No size information available'}
                    </p>
                  </div>
                  <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    LOW
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Out of Stock</h3>
          {outOfStockItems.length === 0 ? (
            <p className="text-gray-600">No out of stock items!</p>
          ) : (
            <div className="space-y-3">
              {outOfStockItems.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">All sizes out of stock</p>
                  </div>
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    OUT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;