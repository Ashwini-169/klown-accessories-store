import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File utility functions
const saveJsonToFile = async (data, filePath) => {
  try {
    console.log(`[SERVER] saveJsonToFile called for ${filePath}`);
    
    // Validate that data is a proper array or object that can be stringified
    if (data === undefined || data === null) {
      console.error(`[SERVER] Data is null or undefined for ${filePath}, not saving`);
      return false;
    }
    
    if (Array.isArray(data) && data.length === 0) {
      console.warn(`[SERVER] Empty array data for ${filePath}, saving empty array`);
      // Continue with save - empty array is valid
    }
    
    // Log data summary
    if (Array.isArray(data)) {
      console.log(`[SERVER] Saving array with ${data.length} items to ${filePath}`);
      if (data.length > 0 && data[0].id) {
        console.log(`[SERVER] First few IDs: ${data.slice(0, 3).map(item => item.id).join(', ')}...`);
      }
    } else {
      console.log(`[SERVER] Saving object data to ${filePath}`);
    }
    
    // Create a backup of the current file before modifying
    const fullPath = path.resolve(__dirname, filePath);
    console.log(`[SERVER] Full path for save: ${fullPath}`);
    
    // Ensure directory exists
    const directory = path.dirname(fullPath);
    if (!fs.existsSync(directory)) {
      console.log(`[SERVER] Creating directory: ${directory}`);
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Create backup if file exists
    try {
      if (fs.existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup`;
        fs.copyFileSync(fullPath, backupPath);
        console.log(`[SERVER] Created backup at: ${backupPath}`);
      }
    } catch (backupErr) {
      console.warn(`[SERVER] Failed to create backup for ${fullPath}:`, backupErr);
      // Continue even if backup fails
    }
    
    // First read existing file to compare (to avoid unnecessary writes)
    let existingData = '';
    try {
      existingData = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
      console.log(`[SERVER] Existing file read, size: ${existingData.length} chars`);
    } catch (err) {
      console.log(`[SERVER] File ${filePath} does not exist yet or cannot be read, will create new file`);
    }
    
    // Prepare the JSON data with pretty formatting
    const jsonData = JSON.stringify(data, null, 2);
    
    // Only write if data has changed
    if (existingData !== jsonData) {
      console.log(`[SERVER] Data changed, writing to ${filePath}`);
      
      try {
        // First write to a temporary file, then rename to ensure atomic write
        const tempPath = `${fullPath}.temp`;
        fs.writeFileSync(tempPath, jsonData, 'utf8');
        
        // Verify the temp file was written correctly
        const tempData = fs.readFileSync(tempPath, 'utf8');
        if (tempData !== jsonData) {
          throw new Error('Verification failed: Temp file data does not match expected data');
        }
        
        // Rename temp file to actual file (atomic operation)
        fs.renameSync(tempPath, fullPath);
        console.log(`[SERVER] Data successfully saved to ${fullPath}`);
      } catch (writeErr) {
        console.error(`[SERVER] Error writing to file ${fullPath}:`, writeErr);
        
        // Try one more time with direct write as fallback
        try {
          console.log(`[SERVER] Attempting direct write as fallback`);
          fs.writeFileSync(fullPath, jsonData, 'utf8');
          console.log(`[SERVER] Direct write successful`);
          return true;
        } catch (fallbackErr) {
          console.error(`[SERVER] Direct write fallback failed:`, fallbackErr);
          return false;
        }
      }
    } else {
      console.log(`[SERVER] Data unchanged, not writing to ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[SERVER] Error saving data to ${filePath}:`, error);
    return false;
  }
};

const readJsonFromFile = async (filePath) => {
  try {
    console.log(`[SERVER] Reading JSON from ${filePath}`);
    const fullPath = path.resolve(__dirname, filePath);
    console.log(`[SERVER] Full path for read: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`[SERVER] File does not exist: ${fullPath}`);
      return null;
    }
    
    const data = fs.readFileSync(fullPath, 'utf8');
    console.log(`[SERVER] File read, size: ${data.length} chars`);
    
    const parsedData = JSON.parse(data);
    
    if (Array.isArray(parsedData)) {
      console.log(`[SERVER] Parsed data is array with ${parsedData.length} items`);
      if (parsedData.length > 0 && parsedData[0].id) {
        console.log(`[SERVER] First few IDs: ${parsedData.slice(0, 3).map(item => item.id).join(', ')}...`);
      }
    } else {
      console.log(`[SERVER] Parsed data is an object`);
    }
    
    return parsedData;
  } catch (error) {
    console.error(`[SERVER] Error reading data from ${filePath}:`, error);
    return null;
  }
};

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';  // Listen on all network interfaces

// Initialize Socket.io with your Express server
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`For local network access: http://192.168.1.61:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from any origin
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow connections from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Broadcast when files change
function broadcastDataChange(fileType) {
  console.log(`[SERVER] Broadcasting ${fileType} data change to all clients`);
  io.emit(`${fileType}Changed`, { timestamp: Date.now() });
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[SERVER] Client connected: ${socket.id}`);
  
  // Listen for client-triggered data change events
  socket.on('requestDataChange', (data) => {
    if (data && data.fileType) {
      console.log(`[SERVER] Client ${socket.id} requested broadcast for ${data.fileType}`);
      broadcastDataChange(data.fileType);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`[SERVER] Client disconnected: ${socket.id}`);
  });
});

// API endpoint to save products
app.post('/api/products/save', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      console.error('Invalid product data received:', req.body);
      return res.status(400).json({ success: false, message: 'Invalid product data' });
    }
    
    // Get previous products to check for deletions
    let previousProducts = [];
    try {
      previousProducts = await readJsonFromFile('src/data/products.json') || [];
    } catch (error) {
      console.warn('Could not read previous products:', error);
    }
    
    // Check for deleted products
    const deletedProducts = previousProducts.filter(prevProduct => 
      !products.some(newProduct => newProduct.id === prevProduct.id)
    );
    
    if (deletedProducts.length > 0) {
      console.log(`Detected ${deletedProducts.length} deleted products:`, deletedProducts.map(p => p.id));
    }
    
    console.log(`Saving ${products.length} products to products.json`);
    
    // Save to products.json
    const result = await saveJsonToFile(products, 'src/data/products.json');
    
    if (result) {
      console.log('Products saved successfully');
      broadcastDataChange('product');
      res.json({ 
        success: true, 
        message: 'Products saved successfully',
        deletedIds: deletedProducts.map(p => p.id),
        addedIds: products.filter(p => !previousProducts.some(prevP => prevP.id === p.id)).map(p => p.id)
      });
    } else {
      console.error('Failed to save products');
      res.status(500).json({ success: false, message: 'Failed to save products' });
    }
  } catch (error) {
    console.error('Error saving products:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// API endpoint to get products
app.get('/api/products', async (req, res) => {
  try {
    const products = await readJsonFromFile('src/data/products.json');
    
    if (products) {
      res.json({ success: true, data: products });
    } else {
      res.status(404).json({ success: false, message: 'Products not found' });
    }
  } catch (error) {
    console.error('Error reading products:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API endpoint to get coupons
app.get('/api/coupons', async (req, res) => {
  try {
    console.log('[SERVER] Received request to fetch coupons at: ' + new Date().toISOString());
    
    // Check if file exists before reading
    const couponsPath = 'src/data/coupons.json';
    const fullPath = path.resolve(__dirname, couponsPath);
    
    console.log(`[SERVER] Checking if coupons file exists at: ${fullPath}`);
    const fileExists = fs.existsSync(fullPath);
    console.log(`[SERVER] Coupons file exists: ${fileExists}`);
    
    if (!fileExists) {
      console.error('[SERVER] Coupons file does not exist');
      return res.status(404).json({ success: false, message: 'Coupons file not found' });
    }
    
    console.log('[SERVER] Reading coupons file contents');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    console.log(`[SERVER] File contents length: ${fileContents.length}`);
    
    console.log('[SERVER] Parsing JSON');
    const coupons = JSON.parse(fileContents);
    console.log(`[SERVER] Parsed coupons: ${Array.isArray(coupons) ? coupons.length + ' items' : 'not an array'}`);
    
    console.log('[SERVER] Sending response');
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('[SERVER] Error reading coupons:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.toString() });
  }
});

// API endpoint to read any JSON file
app.get('/api/readfile', async (req, res) => {
  try {
    const { filePath } = req.query;
    console.log(`[SERVER] Received request to read file: ${filePath}`);
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path is required' });
    }
    
    // Security check to prevent reading files outside of src/data
    if (!filePath.startsWith('src/data/') || filePath.includes('..')) {
      console.error(`[SERVER] Security violation: Attempted to read from unauthorized path: ${filePath}`);
      return res.status(403).json({ success: false, message: 'Unauthorized file path' });
    }
    
    console.log(`[SERVER] Reading file: ${filePath}`);
    const data = await readJsonFromFile(filePath);
    
    if (data === null) {
      return res.status(404).json({ success: false, message: 'File not found or invalid JSON' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[SERVER] Error reading file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// API endpoint to delete a specific product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`[SERVER] Received request to delete product with ID: ${productId}`);
    
    if (!productId) {
      console.error(`[SERVER] Invalid product ID received: ${productId}`);
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    
    // Read current products
    const productsPath = 'src/data/products.json';
    console.log(`[SERVER] Reading products from ${productsPath}`);
    const products = await readJsonFromFile(productsPath);
    
    if (!products || !Array.isArray(products)) {
      console.error(`[SERVER] Products data not found or invalid at ${productsPath}`);
      return res.status(404).json({ success: false, message: 'Products data not found or invalid format' });
    }
    
    console.log(`[SERVER] Found ${products.length} products before deletion`);
    
    // Find the product
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      console.error(`[SERVER] Product with ID ${productId} not found in products array`);
      return res.status(404).json({ success: false, message: `Product with ID ${productId} not found` });
    }
    
    console.log(`[SERVER] Found product at index ${productIndex}: ${products[productIndex].name}`);
    
    // Create a backup of the product for recovery
    const deletedProduct = { ...products[productIndex] };
    console.log(`[SERVER] Created backup of product: ${JSON.stringify(deletedProduct).substring(0, 100)}...`);
    
    // Remove the product
    products.splice(productIndex, 1);
    console.log(`[SERVER] Product removed from array, now has ${products.length} products`);
    
    // Save the updated products with retry logic
    console.log(`[SERVER] Saving updated products array to ${productsPath}`);
    
    let saveResult = false;
    let retries = 3;
    
    while (retries > 0 && !saveResult) {
      try {
        saveResult = await saveJsonToFile(products, productsPath);
        
        if (!saveResult) {
          console.error(`[SERVER] Failed to save updated products to ${productsPath}, retries left: ${retries - 1}`);
          retries--;
          
          if (retries > 0) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (saveError) {
        console.error(`[SERVER] Error during save, retries left: ${retries - 1}:`, saveError);
        retries--;
        
        if (retries > 0) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    if (!saveResult) {
      console.error(`[SERVER] All save attempts failed, restoring product to array`);
      // Put the product back in the array since we couldn't save the deletion
      products.splice(productIndex, 0, deletedProduct);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save updated products after multiple attempts',
        productRestored: true
      });
    }
    
    console.log(`[SERVER] Successfully deleted product ${productId} (${deletedProduct.name})`);
    res.json({ 
      success: true, 
      message: `Successfully deleted product ${productId}`,
      deletedProduct,
      remainingProductsCount: products.length
    });
    
  } catch (error) {
    console.error(`[SERVER] Error deleting product:`, error);
    
    // Return a detailed error response
    res.status(500).json({ 
      success: false, 
      message: 'Server error during product deletion', 
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : String(error)
    });
  }
});

// API endpoint to update product stock
app.patch('/api/products/stock', async (req, res) => {
  try {
    const { productId, size, stock } = req.body;
    
    if (!productId || size === undefined || stock === undefined) {
      console.error('[SERVER] Invalid stock update data received:', req.body);
      return res.status(400).json({ success: false, message: 'Invalid stock update data' });
    }
    
    console.log(`[SERVER] Updating stock for product ${productId}, size ${size} to ${stock}`);
    
    // Read current products
    const products = await readJsonFromFile('src/data/products.json') || [];
    
    // Find the product and update its stock
    let productFound = false;
    const updatedProducts = products.map(product => {
      if (product.id === productId) {
        productFound = true;
        return {
          ...product,
          sizes: {
            ...product.sizes,
            [size]: {
              ...product.sizes[size],
              stock,
              available: stock > 0
            }
          }
        };
      }
      return product;
    });
    
    if (!productFound) {
      console.error(`[SERVER] Product not found: ${productId}`);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Save the updated products
    const result = await saveJsonToFile(updatedProducts, 'src/data/products.json');
    
    if (result) {
      console.log(`[SERVER] Stock updated successfully for ${productId}`);
      res.json({ success: true, message: 'Stock updated successfully' });
    } else {
      console.error('[SERVER] Failed to save updated stock');
      res.status(500).json({ success: false, message: 'Failed to save updated stock' });
    }
  } catch (error) {
    console.error('[SERVER] Error updating stock:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generic API endpoint to save any file
app.post('/api/savefile', async (req, res) => {
  try {
    const { filePath, data } = req.body;
    console.log(`[SERVER] Received save file request for ${filePath} at ${new Date().toISOString()}`);
    
    if (!filePath || data === undefined) {
      console.error('[SERVER] Invalid data received for file save:', JSON.stringify(req.body).substring(0, 200) + '...');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data. filePath and data are required.',
        received: { 
          hasFilePath: !!filePath, 
          hasData: data !== undefined,
          filePathType: typeof filePath,
          dataType: typeof data
        } 
      });
    }
    
    // Security check to prevent saving files outside of src/data
    if (!filePath.startsWith('src/data/') || filePath.includes('..')) {
      console.error(`[SERVER] Security violation: Attempted to save to unauthorized path: ${filePath}`);
      return res.status(403).json({ success: false, message: 'Unauthorized file path' });
    }
    
    console.log(`[SERVER] Preparing to save data to file: ${filePath}`);
    
    // Data validation
    if (Array.isArray(data)) {
      console.log(`[SERVER] Saving array with ${data.length} items`);
      
      // Check for duplicate IDs if data has id property
      if (data.length > 0 && 'id' in data[0]) {
        const ids = data.map(item => item.id);
        const uniqueIds = new Set(ids);
        
        if (ids.length !== uniqueIds.size) {
          // Log the duplicate IDs
          const counts = {};
          const duplicates = ids.filter(id => {
            counts[id] = (counts[id] || 0) + 1;
            return counts[id] > 1;
          });
          
          console.warn(`[SERVER] Found duplicate IDs in data: ${duplicates.join(', ')}`);
          // Continue anyway but log the warning
        }
      }
    }
    
    // Save with retries
    let saveResult = false;
    let retryCount = 3;
    let lastError = null;
    
    while (retryCount > 0 && !saveResult) {
      try {
        console.log(`[SERVER] Attempt ${4 - retryCount} to save ${filePath}`);
        saveResult = await saveJsonToFile(data, filePath);
        
        if (!saveResult) {
          console.error(`[SERVER] Save attempt ${4 - retryCount} failed, retries left: ${retryCount - 1}`);
          retryCount--;
          
          if (retryCount > 0) {
            // Wait before retrying
            console.log(`[SERVER] Waiting 500ms before next save attempt`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (saveError) {
        lastError = saveError;
        console.error(`[SERVER] Error during save attempt ${4 - retryCount}:`, saveError);
        retryCount--;
        
        if (retryCount > 0) {
          // Wait before retrying
          console.log(`[SERVER] Waiting 500ms before next save attempt`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    if (saveResult) {
      console.log(`[SERVER] File saved successfully: ${filePath} at ${new Date().toISOString()}`);
      
      // Double-check that file was actually saved properly
      try {
        const savedData = await readJsonFromFile(filePath);
        const validationPassed = savedData !== null && 
          (Array.isArray(data) ? Array.isArray(savedData) && savedData.length === data.length : true);
        
        if (!validationPassed) {
          console.warn(`[SERVER] Validation check: File may not have saved correctly. Expected ${Array.isArray(data) ? data.length : 'object'}, got ${Array.isArray(savedData) ? savedData.length : 'null/non-array'}`);
        } else {
          console.log(`[SERVER] Validation check passed: File saved correctly`);
        }
      } catch (validationError) {
        console.warn(`[SERVER] Could not validate saved file:`, validationError);
      }
      
      // Broadcast data change if relevant file types
      if (filePath.includes('coupons.json')) {
        broadcastDataChange('coupon');
      }
      if (filePath.includes('banner.json')) {
        broadcastDataChange('banner');
      }
      if (filePath.includes('banner-admin.json')) {
        broadcastDataChange('bannerAdmin');
      }
      if (filePath.includes('hero-images.json')) {
        broadcastDataChange('heroImages');
      }
      
      res.json({ 
        success: true, 
        message: 'File saved successfully',
        filePath,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`[SERVER] All attempts to save file failed: ${filePath}`);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save file after multiple attempts',
        error: lastError ? (lastError.message || String(lastError)) : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[SERVER] Unhandled error saving file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Serve built frontend (Vite) from `dist` when available
try {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log(`[SERVER] Serving static frontend from ${distPath}`);
    // static assets
    app.use(express.static(distPath));

    // SPA fallback for client-side routing — exclude API and socket paths
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.log('[SERVER] No dist folder found; static frontend will not be served');
  }
} catch (err) {
  console.warn('[SERVER] Error while configuring static file serving:', err);
}

// Server is already started with Socket.IO at the top, no need to call listen again
// Log that Socket.IO is ready
console.log(`Socket.IO server is running and ready for real-time updates`);
