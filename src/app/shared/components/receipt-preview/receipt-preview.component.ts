import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { TruncatePipe } from '../../pipes/truncate.pipe';

export interface ReceiptData {
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  trn: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  paymentMethod: string;
  amountTendered: number;
  changeDue: number;
}

@Component({
  selector: 'app-receipt-preview',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, DateFormatPipe, TruncatePipe],
  template: `
    @if (receipt()) {
      <div class="thermal-receipt">
        <div class="receipt-header">
          <h4>AEROPOS CAFE LLC</h4>
          <p>Dubai Mall, Ground Floor, Dubai, UAE</p>
          <p>TRN: {{ receipt()!.trn }}</p>
          <h5>SIMPLIFIED TAX INVOICE / فاتورة ضريبية مبسطة</h5>
          <small>{{ receipt()!.date | dateFormat:'receipt' }}</small>
        </div>

        <hr class="receipt-divider" />

        <div class="receipt-meta">
          <div><span>Invoice #:</span> <strong>{{ receipt()!.invoiceNumber }}</strong></div>
          <div><span>Cashier:</span> <strong>{{ receipt()!.cashierName }}</strong></div>
          @if (receipt()!.customerName) {
            <div><span>Customer:</span> <strong>{{ receipt()!.customerName }}</strong></div>
          }
        </div>

        <hr class="receipt-divider" />

        <div class="receipt-items">
          @for (item of receipt()!.items; track item.name) {
            <div class="receipt-item-row">
              <span class="item-desc">{{ item.quantity }}x {{ item.name | truncate:24:true }}</span>
              <span class="item-amt">{{ item.total | currencyFormat }}</span>
            </div>
          }
        </div>

        <hr class="receipt-divider" />

        <div class="receipt-totals">
          <div class="receipt-row"><span>Subtotal:</span><span>{{ receipt()!.subtotal | currencyFormat }}</span></div>
          <div class="receipt-row"><span>UAE VAT (5%):</span><span>{{ receipt()!.vatAmount | currencyFormat }}</span></div>
          <div class="receipt-row total-bold"><span>TOTAL PAYABLE:</span><span>{{ receipt()!.grandTotal | currencyFormat }}</span></div>
          <div class="receipt-row"><span>Paid via {{ receipt()!.paymentMethod }}:</span><span>{{ receipt()!.amountTendered | currencyFormat }}</span></div>
          @if (receipt()!.changeDue > 0) {
            <div class="receipt-row"><span>Change Due:</span><span>{{ receipt()!.changeDue | currencyFormat }}</span></div>
          }
        </div>

        <div class="receipt-footer">
          <p>شكراً لزيارتكم • Thank You For Visiting</p>
          <div class="mock-qr">
            <i class="pi pi-qrcode"></i>
            <span>UAE FTA Electronic Invoice Verification</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .thermal-receipt {
      background: #fff;
      color: #111;
      padding: 1.5rem;
      border-radius: var(--radius-md);
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.8rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 360px;
      margin: 0 auto;
    }
    .receipt-header { text-align: center; }
    .receipt-header h4 { font-size: 1.05rem; margin-bottom: 0.2rem; }
    .receipt-header h5 { font-size: 0.8rem; margin-top: 0.35rem; color: #333; }
    .receipt-divider { border: 0; border-top: 1px dashed #888; margin: 0.75rem 0; }
    .receipt-meta div, .receipt-row, .receipt-item-row { display: flex; justify-content: space-between; margin: 0.25rem 0; }
    .total-bold { font-weight: 900; font-size: 0.95rem; margin: 0.5rem 0; }
    .receipt-footer { text-align: center; margin-top: 1rem; }
    .mock-qr { margin-top: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; font-size: 0.68rem; color: #666; }
    .mock-qr i { font-size: 2.5rem; color: #111; }
  `],
})
export class ReceiptPreviewComponent {
  receipt = input<ReceiptData | null>(null);
}
