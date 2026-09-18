import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
  <header class="app-header">
    <div class="app-header__inner">
      <a [routerLink]="auth.isLoggedIn() ? '/home' : '/'" class="app-header__brand" aria-label="Mercadito">
        <span class="brand-dot" aria-hidden="true"></span>
        <span class="brand-text">Mercadito</span>
      </a>

      <div class="app-header__search">
        <label class="search-field">
          <span class="sr-only">Buscar</span>
          <svg class="search-field__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.235 12.03l3.743 3.742a.75.75 0 1 0 1.06-1.06l-3.742-3.743A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clip-rule="evenodd"/>
          </svg>
          <input
            type="search"
            placeholder="Buscar productos..."
            (input)="onSearch($any($event.target).value)"
          />
        </label>
      </div>

      <nav class="app-header__nav" aria-label="Acciones">
        <ng-container *ngIf="!auth.isLoggedIn()">
          <a routerLink="/auth/login" class="nav-text hidden-sm">Entrar</a>
          <a routerLink="/auth/register" class="btn-nav-primary">Crear cuenta</a>
        </ng-container>

        <ng-container *ngIf="auth.isLoggedIn()">
          <a *ngIf="auth.isAdmin()" routerLink="/admin/sellers" class="nav-text hidden-md">Sellers</a>

          <a
            routerLink="/orders"
            routerLinkActive="is-active"
            class="nav-text hidden-sm"
          >Mis pedidos</a>

          <a routerLink="/cart" class="icon-btn" aria-label="Carrito">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/>
              <path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
            </svg>
            <span *ngIf="cartSvc.itemCount() > 0" class="cart-badge">
              {{ cartSvc.itemCount() > 9 ? '9+' : cartSvc.itemCount() }}
            </span>
          </a>

          <div class="user-menu" (click)="$event.stopPropagation()">
            <button
              type="button"
              class="user-menu__trigger"
              (click)="toggleMenu($event)"
              [attr.aria-expanded]="menuOpen()"
            >
              <span class="user-menu__name">{{ auth.currentUser()?.name }}</span>
              <span class="user-menu__avatar">{{ initial() }}</span>
            </button>
            <div class="user-menu__panel" *ngIf="menuOpen()">
              <a routerLink="/home" (click)="closeMenu()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/><path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>
                Comprar en Mercadito
              </a>
              <a *ngIf="auth.hasSeller()" routerLink="/dashboard" (click)="closeMenu()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/></svg>
                Ir a mi tienda
              </a>
              <a *ngIf="!auth.hasSeller() && !auth.isAdmin()" routerLink="/seller/onboarding" (click)="closeMenu()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5A.75.75 0 0 1 12 3.75Z" clip-rule="evenodd"/></svg>
                Quiero vender
              </a>
              <a *ngIf="auth.isAdmin()" routerLink="/admin/sellers" (click)="closeMenu()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 5.69 3.117.75.75 0 0 1-1.076 1.05A5.25 5.25 0 0 0 12 13.5a5.25 5.25 0 0 0-4.614 2.618.75.75 0 1 1-1.076-1.05Z" clip-rule="evenodd"/></svg>
                Sellers
              </a>
              <a routerLink="/orders" class="only-sm" (click)="closeMenu()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Z" clip-rule="evenodd"/></svg>
                Mis pedidos
              </a>
              <hr>
              <button type="button" class="user-menu__logout" (click)="auth.logout()">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </ng-container>
      </nav>
    </div>
  </header>
  `,
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  private searchSvc = inject(SearchService);
  private router = inject(Router);
  auth = inject(AuthService);
  cartSvc = inject(CartService);

  menuOpen = signal(false);
  private ignoreNextDocClick = false;

  initial(): string {
    return (this.auth.currentUser()?.name ?? 'U').charAt(0).toUpperCase();
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.ignoreNextDocClick = true;
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.ignoreNextDocClick) {
      this.ignoreNextDocClick = false;
      return;
    }
    this.menuOpen.set(false);
  }

  onSearch(q: string) {
    this.searchSvc.setQuery(q);
    const trimmed = q.trim();
    if (!this.router.url.startsWith('/products')) {
      this.router.navigate(['/products'], {
        queryParams: trimmed ? { q: trimmed } : {},
      });
      return;
    }
    this.router.navigate([], {
      queryParams: { q: trimmed || null },
      queryParamsHandling: 'merge',
    });
  }
}
