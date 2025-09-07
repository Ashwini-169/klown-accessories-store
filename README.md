# Product Manager Documentation

This document explains how to use the Product Manager component to manage your product inventory.

## Features

- **View Products**: See all products in a clean, organized list
- **Add Products**: Create new products with all required fields
- **Edit Products**: Modify existing product details
- **Delete Products**: Remove products from inventory
- **File Syncing**: All changes are automatically saved to the products.json file

## Setup Instructions

1. Start the development server and API server:
   ```
   npm run dev:full
   ```
   This starts both the Vite development server and the Express API server.

2. Navigate to the admin section to access the Product Manager.

## Product Fields

Each product has the following fields:

- **ID**: Unique identifier (auto-generated if not provided)
- **Name**: Product name
- **Category**: Product category (bracelets, rings, necklaces, earrings, keyrings)
- **Description**: Detailed product description
- **Images**: Product image URLs (multiple images supported)
- **Prices**:
  - Current Price: The selling price
  - Original Price: The price before discount
  - Discount: Auto-calculated as percentage off original price
- **Sizes and Stock**: Different size options with stock quantity for each
- **Featured**: Flag to mark as featured product

## Managing Products

### Adding Products

1. Click the "Add Product" button
2. Fill in the required fields:
   - Product Name
   - Category
   - Description
   - Current Price
   - Original Price
   - At least one image URL
   - Size and stock information
3. Click "Add Product" to save

### Editing Products

1. Click the edit (pencil) icon on a product
2. Modify any fields you need to change
3. Click the save icon to confirm changes

### Deleting Products

1. Click the delete (trash) icon on a product
2. Confirm deletion in the prompt

### Managing Stock

You can update stock levels directly from the product list by changing the number in the stock input field for each size.

### Managing Featured Products

Click the star icon to toggle whether a product is featured or not.

## Technical Information

The Product Manager component syncs with the products.json file through an API endpoint. When changes are made, they are:

1. Updated in the React state via the ProductContext
2. Saved to localStorage for persistence between sessions
3. Sent to the backend API to update the products.json file

This ensures that all changes are properly persisted and available throughout the application.
