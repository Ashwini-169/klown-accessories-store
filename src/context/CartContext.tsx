import React, { createContext, useContext, ReactNode } from 'react';
import { CartItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CartContextType {
  items: CartItem[];
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  discount: number;
  setDiscount: (amount: number) => void;
  addFreeItem: (item: CartItem) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useLocalStorage<CartItem[]>('cart', []);
  const [discount, setDiscount] = useLocalStorage<number>('cartDiscount', 0);
  const [freeItems, setFreeItems] = useLocalStorage<CartItem[]>('freeItems', []);
  
  // Combine regular items and free items
  const cartItems = [...items, ...freeItems];

  const addToCart = (newItem: CartItem) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(
        item => item.productId === newItem.productId && item.size === newItem.size
      );

      if (existingItem) {
        return currentItems.map(item =>
          item.productId === newItem.productId && item.size === newItem.size
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      return [...currentItems, newItem];
    });
  };

  const removeFromCart = (productId: string, size: string) => {
    // When removing an item, clear any applied coupon/discount
    setDiscount(0); // Clear the discount
    localStorage.removeItem('appliedCoupon'); // Clear stored coupon data
    
    // Check and remove from regular items if found
    setItems(currentItems =>
      currentItems.filter(item => !(item.productId === productId && item.size === size))
    );

    // Also check and remove from free items if found
    setFreeItems(currentFreeItems =>
      currentFreeItems.filter(item => !(item.productId === productId && item.size === size))
    );
  };

  const updateQuantity = (productId: string, size: string, quantity: number) => {
    // When quantity changes, remove any applied coupon/discount
    setDiscount(0); // Clear the discount
    localStorage.removeItem('appliedCoupon'); // Clear stored coupon data

    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    // Check and update in regular items
    const regularItem = items.find(item => item.productId === productId && item.size === size);
    if (regularItem) {
      setItems(currentItems =>
        currentItems.map(item =>
          item.productId === productId && item.size === size
            ? { ...item, quantity }
            : item
        )
      );
      return;
    }

    // Check and update in free items
    const freeItem = freeItems.find(item => item.productId === productId && item.size === size);
    if (freeItem) {
      setFreeItems(currentFreeItems =>
        currentFreeItems.map(item =>
          item.productId === productId && item.size === size
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const addFreeItem = (newItem: CartItem) => {
    // Make sure it's marked as a free gift
    const freeItem = { ...newItem, isFreeGift: true };
    
    setFreeItems(currentFreeItems => {
      const existingItem = currentFreeItems.find(
        item => item.productId === freeItem.productId && item.size === freeItem.size
      );

      if (existingItem) {
        return currentFreeItems.map(item =>
          item.productId === freeItem.productId && item.size === freeItem.size
            ? { ...item, quantity: item.quantity + freeItem.quantity }
            : item
        );
      }

      return [...currentFreeItems, freeItem];
    });
  };

  const clearCart = () => {
    setItems([]);
    setFreeItems([]);
  };

  const getTotalItems = () => {
    const regularItemCount = items.reduce((total, item) => total + item.quantity, 0);
    const freeItemCount = freeItems.reduce((total, item) => total + item.quantity, 0);
    return regularItemCount + freeItemCount;
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    // Free items don't contribute to the price
  };

  return (
    <CartContext.Provider value={{
      items,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
      discount,
      setDiscount,
      addFreeItem
    }}>
      {children}
    </CartContext.Provider>
  );
};