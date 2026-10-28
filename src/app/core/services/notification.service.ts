import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number; // in milliseconds
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly toastsList = signal<ToastMessage[]>([]);
  public readonly toasts = this.toastsList.asReadonly();

  show(type: NotificationType, title: string, message: string, duration = 4000) {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = { id, type, title, message, duration };

    this.toastsList.update((current) => [...current, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, title = 'Success') {
    this.show('success', title, message);
  }

  error(message: string, title = 'Error') {
    this.show('error', title, message, 6000);
  }

  warning(message: string, title = 'Warning') {
    this.show('warning', title, message, 5000);
  }

  info(message: string, title = 'Information') {
    this.show('info', title, message);
  }

  dismiss(id: string) {
    this.toastsList.update((current) => current.filter((t) => t.id !== id));
  }
}
