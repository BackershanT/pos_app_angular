import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CustomerRepository } from '../../data-access/repositories/customer.repository';

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
export class CustomerListComponent implements OnInit {
  private readonly customerRepo = inject(CustomerRepository);

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  readonly isCloudConnected = signal<boolean>(false);

  async ngOnInit() {
    await this.loadCustomersFromSupabase();
  }

  async loadCustomersFromSupabase() {
    try {
      const data = await this.customerRepo.getCustomers();
      if (data && data.length > 0) {
        const mapped: CustomerRecord[] = data.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          loyaltyPoints: Number(c.loyalty_points || 0),
          totalOrders: 0,
          totalSpent: 0,
          taxId: c.tax_id || undefined,
        }));
        this.customers.set(mapped);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase customer load deferred:', err);
    }
  }

  customers = signal<CustomerRecord[]>([]);

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
