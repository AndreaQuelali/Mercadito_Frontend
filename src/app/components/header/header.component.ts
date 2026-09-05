import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../../services/search.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
  <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">

      <!-- Logo -->
      <a routerLink="/" class="flex items-center gap-2 font-semibold text-slate-900 shrink-0">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
          </svg>
        </span>
        <span class="text-lg hidden sm:inline">Mercadito</span>
      </a>

      <!-- Search -->
      <div class="flex-1">
        <label class="relative block">
          <span class="sr-only">Buscar</span>
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.235 12.03l3.743 3.742a.75.75 0 1 0 1.06-1.06l-3.742-3.743A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clip-rule="evenodd"/>
            </svg>
          </span>
          <input
            type="text"
            class="w-full rounded-full border border-slate-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
            placeholder="Buscar productos..."
            (input)="onSearch($any($event.target).value)"
          />
        </label>
      </div>

      <!-- Nav -->
      <nav class="flex items-center gap-1 shrink-0">

        <!-- Not logged in -->
        <ng-container *ngIf="!auth.isLoggedIn()">
          <a routerLink="/auth/login"
             class="hidden sm:inline-flex px-3 py-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition">
            Iniciar sesión
          </a>
          <a routerLink="/auth/register"
             class="inline-flex px-3 py-2 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition">
            Registrarse
          </a>
        </ng-container>

        <!-- Logged in -->
        <ng-container *ngIf="auth.isLoggedIn()">
          <!-- Admin sellers -->
          <a *ngIf="auth.isAdmin()" routerLink="/admin/sellers"
             class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition">
            Sellers
          </a>

          <!-- Become seller -->
          <a *ngIf="!auth.hasSeller() && !auth.isAdmin()" routerLink="/seller/onboarding"
             class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition">
            Quiero vender
          </a>

          <!-- Seller dashboard link -->
          <a *ngIf="auth.hasSeller()" routerLink="/seller"
             class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
            </svg>
            Mi tienda
            <span *ngIf="auth.sellerStatus() === 'suspended'"
                  class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Suspendida
            </span>
          </a>

          <!-- Orders -->
          <a routerLink="/orders"
             class="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd"/>
              <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375ZM6 12a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 12Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 15a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 15Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 18a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 18Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
            </svg>
            Mis pedidos
          </a>

          <!-- Cart -->
          <a routerLink="/cart" class="relative p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition" aria-label="Carrito">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-slate-700">
              <path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/>
              <path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>
            </svg>
            <span *ngIf="cartSvc.itemCount() > 0"
              class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold leading-none">
              {{ cartSvc.itemCount() > 9 ? '9+' : cartSvc.itemCount() }}
            </span>
          </a>

          <!-- Avatar / logout -->
          <div class="relative group">
            <button class="flex items-center gap-2 pl-3 pr-2 py-2 rounded-full border border-slate-200 hover:bg-slate-50 transition text-sm">
              <span class="hidden sm:inline text-slate-700 font-medium max-w-[80px] truncate">{{ auth.currentUser()?.name }}</span>
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs shrink-0">
                {{ (auth.currentUser()?.name ?? 'U').charAt(0).toUpperCase() }}
              </span>
            </button>
            <div class="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <a *ngIf="!auth.hasSeller() && !auth.isAdmin()" routerLink="/seller/onboarding"
                 class="flex items-center gap-2 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50">
                Quiero vender
              </a>
              <a *ngIf="auth.isAdmin()" routerLink="/admin/sellers"
                 class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Sellers
              </a>
              <a *ngIf="auth.hasSeller()" routerLink="/seller/orders"
                 class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Órdenes de mi tienda
              </a>
              <a *ngIf="auth.hasSeller()" routerLink="/seller/settings"
                 class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Configuración del puesto
              </a>
              <a routerLink="/orders"
                 class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Mis pedidos
              </a>
              <hr class="my-1 border-slate-100">
              <button (click)="auth.logout()"
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
                  <path fill-rule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </ng-container>
      </nav>
    </div>
  </header>
  `
})
export class HeaderComponent {
  private searchSvc = inject(SearchService);
  auth = inject(AuthService);
  cartSvc = inject(CartService);

  onSearch(q: string) {
    this.searchSvc.setQuery(q);
  }
}
