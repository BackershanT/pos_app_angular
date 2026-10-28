import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export type StaffRole = 'Head Cashier' | 'Store Cashier' | 'Store Manager' | 'Inventory Specialist';

export interface StaffMember {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  assignedTerminal: string;
  hasPin: boolean;
  isOnShift: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.css',
})
export class StaffListComponent {
  searchQuery = signal<string>('');
  selectedRole = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  isAddModalOpen = signal<boolean>(false);
  isPinModalOpen = signal<boolean>(false);
  selectedStaffForPin = signal<StaffMember | null>(null);

  pinForm = new FormGroup({
    pin: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(4),
      Validators.pattern('^[0-9]{4}$'),
    ]),
  });

  readonly availableRoles: StaffRole[] = [
    'Head Cashier',
    'Store Cashier',
    'Store Manager',
    'Inventory Specialist',
  ];

  readonly terminals = [
    'Terminal 01 (Flagship Express)',
    'Terminal 02 (Drive-Thru / Takeaway)',
    'Terminal 03 (Bakery Counter)',
    'Mobile Tablet 01',
  ];

  staffList = signal<StaffMember[]>([
    {
      id: 'st-1',
      employeeCode: 'EMP-0101',
      fullName: 'Kasun Backer',
      email: 'kasun.b@aeropos.ae',
      phone: '+971 50 112 3344',
      role: 'Head Cashier',
      assignedTerminal: 'Terminal 01 (Flagship Express)',
      hasPin: true,
      isOnShift: true,
      isActive: true,
    },
    {
      id: 'st-2',
      employeeCode: 'EMP-0102',
      fullName: 'Sarah Mansoor',
      email: 'sarah.m@aeropos.ae',
      phone: '+971 55 223 4455',
      role: 'Store Cashier',
      assignedTerminal: 'Terminal 02 (Drive-Thru / Takeaway)',
      hasPin: true,
      isOnShift: true,
      isActive: true,
    },
    {
      id: 'st-3',
      employeeCode: 'EMP-0103',
      fullName: 'Tariq Al-Hashemi',
      email: 'tariq.h@aeropos.ae',
      phone: '+971 52 334 5566',
      role: 'Store Manager',
      assignedTerminal: 'All Terminals (Supervisor)',
      hasPin: true,
      isOnShift: true,
      isActive: true,
    },
    {
      id: 'st-4',
      employeeCode: 'EMP-0104',
      fullName: 'Layla Al-Khouri',
      email: 'layla.k@aeropos.ae',
      phone: '+971 56 445 6677',
      role: 'Inventory Specialist',
      assignedTerminal: 'Mobile Tablet 01',
      hasPin: true,
      isOnShift: false,
      isActive: true,
    },
    {
      id: 'st-5',
      employeeCode: 'EMP-0105',
      fullName: 'Zubair Qasim',
      email: 'zubair.q@aeropos.ae',
      phone: '+971 54 556 7788',
      role: 'Store Cashier',
      assignedTerminal: 'Terminal 03 (Bakery Counter)',
      hasPin: true,
      isOnShift: false,
      isActive: false,
    },
  ]);

  staffForm = new FormGroup({
    fullName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('+971 ', [Validators.required]),
    role: new FormControl<StaffRole>('Store Cashier', [Validators.required]),
    assignedTerminal: new FormControl('Terminal 01 (Flagship Express)', [Validators.required]),
    pin: new FormControl('1234', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(4),
      Validators.pattern('^[0-9]{4}$'),
    ]),
  });

  filteredStaff = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();

    return this.staffList().filter((s) => {
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q);

      const matchesRole = role === 'all' || s.role === role;

      return matchesQ && matchesRole;
    });
  });

  totalRecords = computed(() => this.filteredStaff().length);

  paginatedStaff = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredStaff().slice(start, start + this.pageSize());
  });

  openAddModal() {
    this.staffForm.reset({
      fullName: '',
      email: '',
      phone: '+971 50 ',
      role: 'Store Cashier',
      assignedTerminal: 'Terminal 01 (Flagship Express)',
      pin: '1234',
    });
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  saveStaff() {
    if (this.staffForm.invalid) return;

    const val = this.staffForm.value;
    const count = this.staffList().length + 1;
    const empCode = `EMP-01${count < 10 ? '0' + count : count}`;

    const newStaff: StaffMember = {
      id: `st-${Date.now()}`,
      employeeCode: empCode,
      fullName: val.fullName!,
      email: val.email!,
      phone: val.phone!,
      role: val.role!,
      assignedTerminal: val.assignedTerminal!,
      hasPin: true,
      isOnShift: false,
      isActive: true,
    };

    this.staffList.update((list) => [newStaff, ...list]);
    this.closeAddModal();
  }

  toggleShift(staff: StaffMember) {
    this.staffList.update((list) =>
      list.map((s) => (s.id === staff.id ? { ...s, isOnShift: !s.isOnShift } : s))
    );
  }

  toggleActive(staff: StaffMember) {
    this.staffList.update((list) =>
      list.map((s) => (s.id === staff.id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  openPinModal(staff: StaffMember) {
    this.selectedStaffForPin.set(staff);
    this.pinForm.reset({ pin: '' });
    this.isPinModalOpen.set(true);
  }

  closePinModal() {
    this.isPinModalOpen.set(false);
    this.selectedStaffForPin.set(null);
  }

  saveNewPin() {
    if (this.pinForm.invalid) return;
    const staff = this.selectedStaffForPin();
    if (staff) {
      this.staffList.update((list) =>
        list.map((s) => (s.id === staff.id ? { ...s, hasPin: true } : s))
      );
    }
    this.closePinModal();
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onRoleSelect(role: string) {
    this.selectedRole.set(role);
    this.currentPage.set(1);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
