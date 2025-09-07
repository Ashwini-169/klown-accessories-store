// src/services/InventoryService.ts
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';

export interface StockTransaction {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  orderId?: string;
  customerInfo?: {
    name: string;
    phone: string;
  };
  timestamp: Date;
  type: 'decrease' | 'increase' | 'adjustment';
  note?: string;
}

class InventoryService {
  private static instance: InventoryService;
  private stockTransactions: StockTransaction[] = [];

  private constructor() {
    // Load from local storage if available
    const savedTransactions = localStorage.getItem('stockTransactions');
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions);
        // Convert string dates back to Date objects
        this.stockTransactions = parsed.map((transaction: any) => ({
          ...transaction,
          timestamp: new Date(transaction.timestamp)
        }));
      } catch (error) {
        console.error('Error loading stock transactions:', error);
        this.stockTransactions = [];
      }
    }
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  // Record a stock transaction and save to localStorage
  public recordTransaction(transaction: Omit<StockTransaction, 'id' | 'timestamp'>): StockTransaction {
    const newTransaction: StockTransaction = {
      ...transaction,
      id: this.generateTransactionId(),
      timestamp: new Date()
    };

    this.stockTransactions.push(newTransaction);
    this.saveTransactions();
    return newTransaction;
  }

  // Process checkout and update inventory
  public processCheckout(
    items: Array<{ productId: string; size: string; quantity: number }>,
    customerInfo: { name: string; phone: string },
    orderId: string
  ): void {
    items.forEach(item => {
      this.recordTransaction({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        orderId,
        customerInfo,
        type: 'decrease',
        note: 'Checkout completed'
      });
    });
  }

  // Get transaction history for a specific product
  public getProductTransactions(productId: string): StockTransaction[] {
    return this.stockTransactions
      .filter(transaction => transaction.productId === productId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get all transactions
  public getAllTransactions(): StockTransaction[] {
    return [...this.stockTransactions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Generate a unique ID for transactions
  private generateTransactionId(): string {
    return 'txn-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  // Save transactions to localStorage
  private saveTransactions(): void {
    try {
      localStorage.setItem('stockTransactions', JSON.stringify(this.stockTransactions));
    } catch (error) {
      console.error('Error saving stock transactions:', error);
    }
  }

  // Clear all transaction history (for testing or admin purposes)
  public clearTransactions(): void {
    this.stockTransactions = [];
    this.saveTransactions();
  }

  // Generate a stock report
  public generateStockReport(): any {
    // This could be expanded to provide more detailed reports
    const report = {
      totalTransactions: this.stockTransactions.length,
      decreases: this.stockTransactions.filter(t => t.type === 'decrease').length,
      increases: this.stockTransactions.filter(t => t.type === 'increase').length,
      adjustments: this.stockTransactions.filter(t => t.type === 'adjustment').length,
      lastTransaction: this.stockTransactions.length > 0 
        ? this.stockTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
        : null
    };
    return report;
  }
  
  // Get low stock products - needs to be implemented with product data
  public getLowStockProducts(): any[] {
    // This would need to be implemented with access to the actual product data
    // For now, we'll return an empty array
    return [];
  }

  // Get product stock history over time
  public getProductStockHistory(productId: string, size: string): any[] {
    const transactions = this.getProductTransactions(productId)
      .filter(t => t.size === size)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (transactions.length === 0) return [];
    
    let currentStock = 0;
    return transactions.map(t => {
      if (t.type === 'increase') {
        currentStock += t.quantity;
      } else if (t.type === 'decrease') {
        currentStock = Math.max(0, currentStock - t.quantity);
      } else if (t.type === 'adjustment') {
        currentStock = t.quantity;
      }
      
      return {
        date: t.timestamp,
        stock: currentStock,
        transaction: t
      };
    });
  }
}

// Create a React hook to use the inventory service
export function useInventory() {
  const inventoryService = InventoryService.getInstance();
  const { decreaseStock } = useProducts();
  const { items } = useCart();

  // Process checkout and update inventory
  const processInventoryCheckout = (
    customerInfo: { name: string; phone: string; address?: string },
    orderId: string = `ORD-${Date.now()}`
  ) => {
    // Record transaction for each item
    items.forEach(item => {
      // Update stock in ProductContext
      decreaseStock(item.productId, item.size, item.quantity);
    });

    // Record the entire order as a transaction
    inventoryService.processCheckout(
      items,
      { name: customerInfo.name, phone: customerInfo.phone },
      orderId
    );

    return orderId;
  };

  return {
    recordTransaction: inventoryService.recordTransaction.bind(inventoryService),
    getProductTransactions: inventoryService.getProductTransactions.bind(inventoryService),
    getAllTransactions: inventoryService.getAllTransactions.bind(inventoryService),
    generateStockReport: inventoryService.generateStockReport.bind(inventoryService),
    clearTransactions: inventoryService.clearTransactions.bind(inventoryService),
    getProductStockHistory: inventoryService.getProductStockHistory.bind(inventoryService),
    processInventoryCheckout
  };
}
