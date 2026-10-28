import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly router = inject(Router);

  stats = [
    { title: "Today's Gross Sales", value: '14,820 AED', sub: '+12.4% vs yesterday', icon: 'pi pi-chart-line', color: '#3b82f6' },
    { title: 'Total Orders', value: '412', sub: 'Average 36.00 AED / ticket', icon: 'pi pi-receipt', color: '#10b981' },
    { title: 'VAT Collected (5%)', value: '741.00 AED', sub: 'UAE FTA Accountable', icon: 'pi pi-percentage', color: '#f59e0b' },
    { title: 'Low Stock Items', value: '3 SKUs', sub: 'Reorder required soon', icon: 'pi pi-exclamation-triangle', color: '#ef4444' },
  ];

  fastMovingProducts = [
    { id: '1', name: 'Spanish Latte (Iced)', sku: 'CF-001', barcode: '6291041001', price: 24.0, stock: 45, category: 'Beverages', icon: '☕', color: '#3b82f6' },
    { id: '4', name: 'Butter Croissant', sku: 'BK-001', barcode: '6291041004', price: 14.0, stock: 20, category: 'Bakery', icon: '🥐', color: '#f59e0b' },
    { id: '7', name: 'Truffle Chicken Panini', sku: 'SW-001', barcode: '6291041007', price: 34.0, stock: 18, category: 'Main Meals', icon: '🥪', color: '#10b981' },
    { id: '9', name: 'San Sebastian Cheesecake', sku: 'DS-001', barcode: '6291041009', price: 32.0, stock: 8, category: 'Desserts', icon: '🍰', color: '#ec4899' },
  ];

  recentSales = [
    { invoice: 'INV-20261028-0412', cashier: 'Kasun B.', items: 3, total: 68.0, status: 'Completed', time: '17:15' },
    { invoice: 'INV-20261028-0411', cashier: 'Kasun B.', items: 1, total: 24.0, status: 'Completed', time: '17:10' },
    { invoice: 'INV-20261028-0410', cashier: 'Sarah M.', items: 4, total: 112.0, status: 'Completed', time: '17:02' },
    { invoice: 'INV-20261028-0409', cashier: 'Sarah M.', items: 2, total: 46.0, status: 'Completed', time: '16:55' },
  ];

  goToPos() {
    this.router.navigate(['/pos']);
  }
}
