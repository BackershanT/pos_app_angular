import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BarcodeInputDirective } from './barcode-input.directive';

@Component({
  standalone: true,
  imports: [BarcodeInputDirective],
  template: `
    <input
      type="text"
      appBarcodeInput
      [autoClear]="true"
      [minBarcodeLength]="3"
      (barcodeScanned)="scannedCode = $event"
    />
  `,
})
class TestBarcodeHostComponent {
  scannedCode = '';
}

describe('BarcodeInputDirective', () => {
  let fixture: ComponentFixture<TestBarcodeHostComponent>;
  let host: TestBarcodeHostComponent;
  let inputElem: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestBarcodeHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestBarcodeHostComponent);
    host = fixture.componentInstance;
    inputElem = fixture.nativeElement.querySelector('input');
    fixture.detectChanges();
  });

  it('should emit scanned barcode when Enter key is pressed and length >= 3', () => {
    inputElem.value = '6291041001';
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    inputElem.dispatchEvent(enterEvent);

    expect(host.scannedCode).toBe('6291041001');
    expect(inputElem.value).toBe(''); // autoClear should clear input
  });

  it('should not emit barcode if length is shorter than minBarcodeLength', () => {
    inputElem.value = '12';
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    inputElem.dispatchEvent(enterEvent);

    expect(host.scannedCode).toBe('');
    expect(inputElem.value).toBe('12');
  });
});
