export interface SalesSummaryReport {
  totalSales: number;
  totalOrders: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  averageOrderValue: number;
}

export interface InventoryValuationReport {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
}

export interface TopSellingProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
}
