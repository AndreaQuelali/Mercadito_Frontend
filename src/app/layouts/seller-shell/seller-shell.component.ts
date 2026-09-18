import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

@Component({
  selector: 'app-seller-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './seller-shell.component.html',
  styleUrls: ['./seller-shell.component.css'],
})
export class SellerShellComponent implements OnInit {
  private sellerSvc = inject(SellerService);
  private router = inject(Router);
  auth = inject(AuthService);

  drawerOpen = signal(false);
  menuOpen = signal(false);
  private ignoreNextDocClick = false;

  readonly navItems: {
    label: string;
    path: string;
    icon: 'home' | 'box' | 'orders' | 'chart' | 'stock' | 'store' | 'gear';
    exact?: boolean;
    soon?: boolean;
  }[] = [
    { label: 'Inicio', path: '/dashboard', icon: 'home', exact: true },
    { label: 'Productos', path: '/dashboard/products', icon: 'box' },
    { label: 'Pedidos', path: '/dashboard/orders', icon: 'orders' },
    { label: 'Ventas', path: '/dashboard/sales', icon: 'chart', soon: true },
    { label: 'Inventario', path: '/dashboard/inventory', icon: 'stock', soon: true },
    { label: 'Mi tienda', path: '/dashboard/store', icon: 'store' },
    { label: 'Configuración', path: '/dashboard/settings', icon: 'gear', soon: true },
  ];

  storeName = () => this.sellerSvc.mine()?.businessName || 'Mi tienda';
  initial = () => (this.auth.currentUser()?.name ?? 'U').charAt(0).toUpperCase();

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.drawerOpen.set(false);
        this.menuOpen.set(false);
      });
  }

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({ error: () => undefined });
  }

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.ignoreNextDocClick = true;
    this.menuOpen.update((v) => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.ignoreNextDocClick) {
      this.ignoreNextDocClick = false;
      return;
    }
    this.menuOpen.set(false);
  }
}
