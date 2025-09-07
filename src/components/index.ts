/**
 * Component exports for the application
 * This allows us to control which Cart implementation is used
 */

// Export the cart wrapper as the default Cart component
export { default as Cart } from './CartWrapper';
export { default as RegularCart } from './Cart';
export { default as OptimizedCart } from './Cart.low';

// Other component exports
export { default as Header } from './Header';
export { default as Footer } from './Footer';
export { default as Hero } from './Hero';
export { default as ProductCard } from './ProductCard';
export { default as ProductGrid } from './ProductGrid';
export { default as Checkout } from './Checkout';
export { default as Bill } from './Bill';
export { default as LoadingIcon } from './LoadingIcon';
export { default as ProductEnlargeModal } from './ProductEnlargeModal';
