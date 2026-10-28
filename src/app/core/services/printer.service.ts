import { Injectable, signal } from '@angular/core';

export interface PrintableReceipt {
  businessName: string;
  storeName: string;
  storeAddress: string;
  trn: string;
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
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

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  public readonly isPrinterConnected = signal<boolean>(true);
  public readonly activePrintJob = signal<PrintableReceipt | null>(null);

  /**
   * Sends the receipt to the connected standard thermal printer or browser print.
   */
  printReceipt(receipt: PrintableReceipt): Promise<boolean> {
    return new Promise((resolve) => {
      this.activePrintJob.set(receipt);

      if (typeof window !== 'undefined') {
        // Allow microtask queue for DOM render
        setTimeout(() => {
          window.print();
          resolve(true);
        }, 100);
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Generates standard ESC/POS bytes for raw thermal network / USB receipt printers.
   */
  generateEscPosBytes(receipt: PrintableReceipt): Uint8Array {
    const encoder = new TextEncoder();
    const commands: number[] = [
      0x1b, 0x40,        // ESC @: Initialize printer
      0x1b, 0x61, 0x01,  // ESC a 1: Center justification
    ];

    // Header text
    const headerStr = `${receipt.businessName}\n${receipt.storeAddress}\nTRN: ${receipt.trn}\nTAX INVOICE\n\n`;
    commands.push(...encoder.encode(headerStr));

    // Left align for items
    commands.push(0x1b, 0x61, 0x00);
    const metaStr = `Inv: ${receipt.invoiceNumber}\nDate: ${receipt.date}\nCashier: ${receipt.cashierName}\n--------------------------------\n`;
    commands.push(...encoder.encode(metaStr));

    for (const item of receipt.items) {
      const line = `${item.quantity}x ${item.name.padEnd(20).substring(0, 20)} ${item.total.toFixed(2)}\n`;
      commands.push(...encoder.encode(line));
    }

    commands.push(...encoder.encode(`--------------------------------\n`));
    commands.push(...encoder.encode(`Subtotal:    ${receipt.subtotal.toFixed(2)} AED\n`));
    commands.push(...encoder.encode(`VAT (5%):    ${receipt.vatAmount.toFixed(2)} AED\n`));
    commands.push(...encoder.encode(`TOTAL:       ${receipt.grandTotal.toFixed(2)} AED\n\n`));
    commands.push(0x1d, 0x56, 0x41, 0x03); // GS V: Cut paper

    return new Uint8Array(commands);
  }
}
