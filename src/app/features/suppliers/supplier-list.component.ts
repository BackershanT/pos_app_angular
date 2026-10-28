import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SupplierRepository } from '../../data-access/repositories/supplier.repository';

export interface SupplierRecord {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  activeOrders: number;
}

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.css',
})
export class SupplierListComponent implements OnInit {
  private readonly supplierRepo = inject(SupplierRepository);

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  readonly isCloudConnected = signal<boolean>(false);

  suppliers = signal<SupplierRecord[]>([]);

  async ngOnInit() {
    await this.loadSuppliersFromSupabase();
  }

  async loadSuppliersFromSupabase() {
    try {
      const data = await this.supplierRepo.getSuppliers();
      if (data && data.length > 0) {
        const mapped: SupplierRecord[] = data.map((s) => {
          const details = (s.contact_details as any) || {};
          return {
            id: s.id,
            name: s.name,
            contactPerson: details.contactPerson || details.contact_person || 'Procurement Rep',
            phone: details.phone || '+971 4 000 0000',
            email: details.email || 'vendor@example.ae',
            taxNumber: s.tax_number || '100000000000003',
            activeOrders: details.activeOrders ?? 0,
          };
        });
        this.suppliers.set(mapped);
        this.isCloudConnected.set(true);
      }
    } catch (err) {
      console.warn('Supabase supplier load deferred:', err);
    }
  }

  supplierForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    contactPerson: new FormControl('', [Validators.required]),
    phone: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    taxNumber: new FormControl('', [Validators.required]),
  });

  filteredSuppliers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.suppliers().filter((s) => {
      return !q || s.name.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q) || s.taxNumber.includes(q);
    });
  });

  totalRecords = computed(() => this.filteredSuppliers().length);

  paginatedSuppliers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredSuppliers().slice(start, start + this.pageSize());
  });

  openAddModal() {
    this.supplierForm.reset();
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  async saveSupplier() {
    if (this.supplierForm.invalid) return;

    const val = this.supplierForm.value;
    const newSupplier: SupplierRecord = {
      id: 'sp-' + Date.now(),
      name: val.name!,
      contactPerson: val.contactPerson!,
      phone: val.phone!,
      email: val.email!,
      taxNumber: val.taxNumber!,
      activeOrders: 0,
    };

    this.suppliers.update((list) => [newSupplier, ...list]);
    this.closeAddModal();

    try {
      await this.supplierRepo.createSupplier({
        business_id: 'b0000000-0000-0000-0000-000000000001',
        name: val.name!,
        tax_number: val.taxNumber!,
        contact_details: {
          contactPerson: val.contactPerson,
          phone: val.phone,
          email: val.email,
          activeOrders: 0,
        },
      });
    } catch (err) {
      console.warn('Supplier Supabase persist deferred:', err);
    }
  }
}
