import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  selectedPeriod = signal<string>('today');

  vatAudit = {
    standardSuppliesGross: 14820.0,
    standardSuppliesTaxable: 14114.28,
    outputVat5Percent: 705.72,
    zeroRatedSupplies: 0.0,
    totalVatPayable: 705.72,
    filingPeriod: '2026-Q4 (Oct - Dec 2026)',
    taxRegNumber: '100234892300003',
  };

  paymentBreakdown = [
    { method: 'Credit & Debit Cards', total: 9480.0, count: 265, percentage: 64, icon: 'pi pi-credit-card', color: '#3b82f6' },
    { method: 'Cash', total: 3840.0, count: 112, percentage: 26, icon: 'pi pi-money-bill', color: '#10b981' },
    { method: 'Apple Pay & NFC', total: 1500.0, count: 35, percentage: 10, icon: 'pi pi-wallet', color: '#8b5cf6' },
  ];

  topSelling = [
    { rank: 1, name: 'Spanish Latte (Iced)', category: 'Beverages', soldQty: 84, revenue: 2016.0 },
    { rank: 2, name: 'Truffle Chicken Panini', category: 'Main Meals', soldQty: 42, revenue: 1428.0 },
    { rank: 3, name: 'Butter Croissant', category: 'Bakery', soldQty: 68, revenue: 952.0 },
    { rank: 4, name: 'San Sebastian Cheesecake', category: 'Desserts', soldQty: 26, revenue: 832.0 },
    { rank: 5, name: 'Caramel Macchiato', category: 'Beverages', soldQty: 35, revenue: 770.0 },
  ];

  printReport() {
    window.print();
  }
}
