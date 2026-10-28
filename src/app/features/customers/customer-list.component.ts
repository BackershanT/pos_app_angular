import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  taxId?: string;
}

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css',
})
export class CustomerListComponent {
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);

  customers = signal<CustomerRecord[]>([
    { id: 'c1', name: 'Ahmed Al-Maktoum', phone: '+971 50 123 4567', email: 'ahmed@example.ae', loyaltyPoints: 420, totalOrders: 18, totalSpent: 1240.0 },
    { id: 'c2', name: 'Rashid Khan', phone: '+971 52 987 6543', email: 'rashid.k@example.com', loyaltyPoints: 185, totalOrders: 8, totalSpent: 590.0 },
    { id: 'c3', name: 'Fatima Noor', phone: '+971 55 456 7890', email: 'fatima.n@example.ae', loyaltyPoints: 310, totalOrders: 12, totalSpent: 890.0 },
    { id: 'c4', name: 'Zayd Al-Nuaimi', phone: '+971 50 789 0123', email: 'zayd@example.ae', loyaltyPoints: 540, totalOrders: 22, totalSpent: 2150.0 },
    { id: 'c5', name: 'Mariam Al-Zaabi', phone: '+971 56 345 6789', email: 'mariam.z@example.com', loyaltyPoints: 95, totalOrders: 4, totalSpent: 260.0 },
    { id: 'c6', name: 'Omar Mansoor', phone: '+971 54 234 5678', email: 'omar.m@example.ae', loyaltyPoints: 210, totalOrders: 9, totalSpent: 710.0 },
  ]);

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    taxId: new FormControl(''),
  });

  filteredCustomers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.customers().filter((c) => {
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
    });
  });

  totalRecords = computed(() => this.filteredCustomers().length);

  paginatedCustomers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCustomers().slice(start, start + this.pageSize());
  });

  openAddModal() {
    this.customerForm.reset();
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  saveCustomer() {
    if (this.customerForm.invalid) return;

    const val = this.customerForm.value;
    const newCust: CustomerRecord = {
      id: 'c-' + Date.now(),
      name: val.name!,
      phone: val.phone!,
      email: val.email || 'N/A',
      loyaltyPoints: 50, // Welcome points
      totalOrders: 0,
      totalSpent: 0,
      taxId: val.taxId || undefined,
    };

    this.customers.update((list) => [newCust, ...list]);
    this.closeAddModal();
  }
}
