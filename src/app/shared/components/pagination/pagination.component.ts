import { Component, computed, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  totalRecords = input<number>(0);
  pageSize = model<number>(10);
  currentPage = model<number>(1);
  pageSizeOptions = input<number[]>([5, 10, 20, 50]);

  pageChange = output<number>();
  pageSizeChange = output<number>();

  totalPages = computed(() => {
    const total = this.totalRecords();
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  startIndex = computed(() => {
    if (this.totalRecords() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalRecords());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (current < total - 2) pages.push('...');
      pages.push(total);
    }

    return pages;
  });

  goToPage(page: number | string) {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.pageChange.emit(page);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  onPageSizeSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.pageSizeChange.emit(newSize);
    this.pageChange.emit(1);
  }
}
