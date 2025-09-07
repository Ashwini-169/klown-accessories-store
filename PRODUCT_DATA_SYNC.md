# Unified Product Data Management in the E-Commerce System

This document explains how Inventory.tsx, ProductManager.tsx, and ProductCard.tsx all manage and synchronize the same product data from product.json.

## Overview

All three components work together to create a unified system where product data is consistent across the application:

1. **ProductContext**: Central source of truth for product data
2. **Event-based communication**: Real-time updates across components 
3. **ProductFileService**: API sync to persist changes
4. **productSyncUtils**: Utility for dispatching events and syncing data

## Data Flow Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   Inventory.tsx  │     │ ProductManager.tsx│     │  ProductCard.tsx │
│                  │     │                  │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                          ProductContext.tsx                          │
│                                                                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                        ProductFileService.ts                         │
│                                                                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                           products.json                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### 1. Inventory.tsx
- Manages inventory operations (increase, decrease, adjustment)
- Records stock transactions
- Dispatches `productStockUpdated` events when stock changes
- Uses `productSyncUtils.notifyStockChanged()` for unified updates

### 2. ProductManager.tsx
- CRUD operations for products
- Listens to `productStockUpdated` events to keep draft products in sync
- Updates products in ProductContext
- Saves changes to products.json

### 3. ProductCard.tsx 
- Displays product information to customers
- Shows real-time stock information
- Listens to `productStockUpdated` events to refresh display

## Event Communication

When stock changes in any component:

1. ProductContext dispatches a `productStockUpdated` event
2. All listening components receive the event and update their UI
3. ProductFileService syncs changes to the server/file

## Code Example: Stock Change Flow

1. **Inventory.tsx** adjusts stock:
```typescript
// Update the stock in ProductContext
updateStock(stockAdjustment.productId, stockAdjustment.size, newStock);
      
// Use our sync utility to notify all components and sync with the file
productSyncUtils.notifyStockChanged(
  stockAdjustment.productId, 
  stockAdjustment.size, 
  newStock, 
  stockAdjustment.type
);
```

2. **ProductContext.tsx** updates the stock and dispatches event:
```typescript
document.dispatchEvent(new CustomEvent('productStockUpdated', { 
  detail: { 
    productId,
    size,
    newStock,
    product: updatedProduct
  } 
}));
```

3. **ProductManager.tsx** receives the event:
```typescript
document.addEventListener('productStockUpdated', handleStockUpdated);

const handleStockUpdated = (event: any) => {
  const { productId, size, newStock } = event.detail;
  
  // Update draft products with new stock value
  setDraftProducts(currentDrafts => 
    currentDrafts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          sizes: {
            ...product.sizes,
            [size]: {
              ...product.sizes[size],
              stock: newStock,
              available: newStock > 0
            }
          }
        };
      }
      return product;
    })
  );
};
```

4. **ProductCard.tsx** receives the event:
```typescript
document.addEventListener('productStockUpdated', handleStockUpdated);

const handleStockUpdated = (event: any) => {
  const { productId, size, newStock } = event.detail;
  
  // Only update if this is our product
  if (productId === product.id && size === selectedSize) {
    console.log(`ProductCard: Stock for ${product.name} (${size}) updated to ${newStock}`);
    
    // Force a re-render
    const productUpdateEvent = new CustomEvent('productCardStockUpdate', {
      detail: { productId, size, newStock }
    });
    document.dispatchEvent(productUpdateEvent);
  }
};
```

5. **productSyncUtils.ts** syncs with the file:
```typescript
// Also update the file via API if enabled
try {
  ProductFileService.updateStock(productId, size, newStock)
    .catch(error => console.error('Failed to save stock update to file:', error));
} catch (error) {
  console.error('Error calling ProductFileService.updateStock:', error);
}
```

## Testing the Integration

To test that all components are properly synchronized:

1. Open the admin dashboard and navigate to Inventory Management
2. Make a stock adjustment to a product
3. Without refreshing, check that:
   - The ProductManager shows the updated stock value
   - The ProductCard on the storefront shows the updated stock
   - The products.json file has been updated
