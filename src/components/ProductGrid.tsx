import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import ProductEnlargeModal from './ProductEnlargeModal';
// ...no context imports needed here; parent provides products

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const [enlargedProduct, setEnlargedProduct] = useState<Product | null>(null);
  // no direct dependency on contextProducts here; parent passes filtered products

  // Memoize the rendered grid items to avoid re-mapping on unrelated state updates
  const gridItems = useMemo(() => {
    return products.map(product => (
      <div key={product.id} onClick={() => setEnlargedProduct(product)} className="cursor-pointer">
        <ProductCard product={product} />
      </div>
    ));
  }, [products]);
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">No products found in this category.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-2 gap-2 xs:gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8"
      >
        {gridItems}
      </div>
      {enlargedProduct && (
        <ProductEnlargeModal product={enlargedProduct} onClose={() => setEnlargedProduct(null)} />
      )}
    </>
  );
};

export default ProductGrid;