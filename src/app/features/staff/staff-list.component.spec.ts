import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { StaffListComponent } from './staff-list.component';

describe('StaffListComponent', () => {
  let fixture: ComponentFixture<StaffListComponent>;
  let component: StaffListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaffListComponent],
    });

    fixture = TestBed.createComponent(StaffListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with staff members list', () => {
    expect(component).toBeTruthy();
    expect(component.staffList().length).toBeGreaterThan(0);
    expect(component.totalRecords()).toBe(component.staffList().length);
  });

  it('should filter staff members by role', () => {
    component.onRoleSelect('Head Cashier');
    expect(component.filteredStaff().every((s) => s.role === 'Head Cashier')).toBe(true);
  });

  it('should toggle staff shift status between on shift and off shift', () => {
    const staff = component.staffList()[0];
    const initialShift = staff.isOnShift;
    component.toggleShift(staff);
    const updated = component.staffList().find((s) => s.id === staff.id);
    expect(updated?.isOnShift).toBe(!initialShift);
  });

  it('should register a new staff cashier with employee code and PIN', () => {
    const initialCount = component.staffList().length;
    component.openAddModal();
    component.staffForm.patchValue({
      fullName: 'Amina Al-Mansoor',
      email: 'amina.m@aeropos.ae',
      phone: '+971 50 998 8776',
      role: 'Store Cashier',
      assignedTerminal: 'Terminal 01 (Flagship Express)',
      pin: '5678',
    });
    component.saveStaff();

    expect(component.staffList().length).toBe(initialCount + 1);
    expect(component.staffList()[0].fullName).toBe('Amina Al-Mansoor');
    expect(component.staffList()[0].hasPin).toBe(true);
  });

  it('should update 4-digit security PIN for a staff member', () => {
    const staff = component.staffList()[0];
    component.openPinModal(staff);
    component.pinForm.patchValue({ pin: '9876' });
    component.saveNewPin();

    expect(component.isPinModalOpen()).toBe(false);
  });
});
