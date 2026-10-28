import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

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
export class SupplierListComponent {
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);

  suppliers = signal<SupplierRecord[]>([
    { id: 'sp1', name: 'Al-Ain Dairy Farms LLC', contactPerson: 'Khaled Saeed', phone: '+971 3 700 1122', email: 'orders@alaindairy.ae', taxNumber: '100456789000003', activeOrders: 2 },
    { id: 'sp2', name: 'Gulf Specialty Coffee Roasters', contactPerson: 'Hamad Mansoori', phone: '+971 4 340 5566', email: 'sales@gulfcoffee.ae', taxNumber: '100892345600003', activeOrders: 1 },
    { id: 'sp3', name: 'Emirates Bakery Supplies', contactPerson: 'David Miller', phone: '+971 4 285 9900', email: 'david@ebs.ae', taxNumber: '100123987400003', activeOrders: 0 },
    { id: 'sp4', name: 'Fresh Greens Wholesale LLC', contactPerson: 'Tariq Aziz', phone: '+971 6 543 2100', email: 'supply@freshgreens.ae', taxNumber: '100654321900003', activeOrders: 3 },
  ]);

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

  saveSupplier() {
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
  }
}
