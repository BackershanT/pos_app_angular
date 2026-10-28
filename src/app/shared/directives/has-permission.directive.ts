import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthState } from '../../core/auth/auth.state';

/**
 * HasPermissionDirective
 * Structural directive that conditionally includes an element in the DOM
 * based on whether the authenticated user has the required permission(s).
 *
 * @example
 * <!-- Single permission check -->
 * <button *appHasPermission="'pos:refund'" class="btn-refund">
 *   Issue Refund
 * </button>
 *
 * <!-- Multiple permissions with default AND logic -->
 * <div *appHasPermission="['reports:view', 'reports:export']">
 *   Audited Financials
 * </div>
 *
 * <!-- Multiple permissions with OR logic -->
 * <div *appHasPermission="['inventory:edit', 'inventory:admin']; op: 'OR'">
 *   Inventory Adjustment Controls
 * </div>
 *
 * <!-- With fallback template when unauthorized -->
 * <button *appHasPermission="'settings:edit'; else lockedTpl">
 *   Edit Settings
 * </button>
 * <ng-template #lockedTpl>
 *   <span class="locked-hint">Admin clearance required</span>
 * </ng-template>
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authState = inject(AuthState);

  /**
   * Required permission string or array of permissions.
   */
  readonly appHasPermission = input.required<string | string[]>();

  /**
   * Evaluation strategy when multiple permissions are provided:
   * - 'AND': User must possess ALL specified permissions.
   * - 'OR': User must possess AT LEAST ONE specified permission.
   */
  readonly appHasPermissionOp = input<'AND' | 'OR'>('AND');

  /**
   * Optional template to render when user lacks permission.
   */
  readonly appHasPermissionElse = input<TemplateRef<unknown> | null>(null);

  private hasView = false;
  private hasElseView = false;

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const op = this.appHasPermissionOp();
      const elseTpl = this.appHasPermissionElse();
      const userPermissions = this.authState.permissions();
      const userRole = this.authState.currentSession()?.role;

      const isAuthorized = this.checkAuthorization(required, op, userPermissions, userRole);

      if (isAuthorized) {
        if (!this.hasView) {
          this.viewContainer.clear();
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
          this.hasElseView = false;
        }
      } else {
        if (!this.hasElseView || this.hasView) {
          this.viewContainer.clear();
          this.hasView = false;
          if (elseTpl) {
            this.viewContainer.createEmbeddedView(elseTpl);
            this.hasElseView = true;
          } else {
            this.hasElseView = false;
          }
        }
      }
    });
  }

  private checkAuthorization(
    required: string | string[],
    op: 'AND' | 'OR',
    userPermissions: string[],
    userRole?: string
  ): boolean {
    // Administrator role or superuser wildcard bypass
    if (userRole === 'Administrator' || userPermissions.includes('*')) {
      return true;
    }

    if (typeof required === 'string') {
      return userPermissions.includes(required);
    }

    if (Array.isArray(required)) {
      if (required.length === 0) return true;

      if (op === 'AND') {
        return required.every((perm) => userPermissions.includes(perm));
      } else {
        return required.some((perm) => userPermissions.includes(perm));
      }
    }

    return false;
  }
}
