import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { OrderRepository } from '../../data-access/repositories/order.repository';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly productRepo = inject(ProductRepository);
  private readonly orderRepo = inject(OrderRepository);

  stats = [
    { title: "Today's Gross Sales", value: '14,820 AED', sub: '+12.4% vs yesterday', icon: 'pi pi-chart-line', color: '#3b82f6' },
    { title: 'Total Orders', value: '412', sub: 'Average 36.00 AED / ticket', icon: 'pi pi-receipt', color: '#10b981' },
    { title: 'VAT Collected (5%)', value: '741.00 AED', sub: 'UAE FTA Accountable', icon: 'pi pi-percentage', color: '#f59e0b' },
    { title: 'Low Stock Items', value: '3 SKUs', sub: 'Reorder required soon', icon: 'pi pi-exclamation-triangle', color: '#ef4444' },
  ];

  fastMovingProducts = signal<any[]>([]);
  recentSales = signal<any[]>([]);

  async ngOnInit() {
    await Promise.all([
      this.loadFastMovingProducts(),
      this.loadRecentSales(),
    ]);
  }

  private async loadFastMovingProducts() {
    try {
      const data = await this.productRepo.getProductsWithInventory();
      if (data && data.length > 0) {
        const top4 = data.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          price: Number(p.selling_price),
          stock: p.quantity_on_hand != null ? Number(p.quantity_on_hand) : 25,
          category: p.category_name || 'General',
          icon: this.getProductIcon(p.name),
          color: '#3b82f6',
        }));
        this.fastMovingProducts.set(top4);
      }
    } catch (err) {
      console.warn('Dashboard product loading deferred:', err);
    }
  }

  private async loadRecentSales() {
    try {
      const sales = await this.orderRepo.getSalesByStore('a0000000-0000-0000-0000-000000000001', 4);
      if (sales && sales.length > 0) {
        const mapped = sales.map((s) => {
          const notesParts = (s.notes || '').split('|');
          const cashier = notesParts[1]?.replace('Cashier:', '').trim() || 'Kasun B.';
          const timeStr = s.created_at ? new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '17:15';
          return {
            invoice: s.invoice_number,
            cashier: cashier,
            items: 3,
            total: Number(s.grand_total),
            status: s.status === 'completed' ? 'Completed' : 'Refunded',
            time: timeStr,
          };
        });
        this.recentSales.set(mapped);
      }
    } catch (err) {
      console.warn('Dashboard sales loading deferred:', err);
    }
  }

  private getProductIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('latte') || lower.includes('coffee') || lower.includes('brew')) return '☕';
    if (lower.includes('croissant') || lower.includes('bread')) return '🥐';
    if (lower.includes('panini') || lower.includes('sandwich')) return '🥪';
    if (lower.includes('cake') || lower.includes('kunafa')) return '🍰';
    return '📦';
  }

  goToPos() {
    this.router.navigate(['/pos']);
  }
}
