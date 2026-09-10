import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/products.service';
import { ProductCard } from '../../components/product-card/product-card.component';

const CATEGORIES = [
  { key: 'verduras', label: 'Verduras' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'panaderia', label: 'Panadería' },
  { key: 'lacteos', label: 'Lácteos' },
  { key: 'artesanias', label: 'Artesanías' },
];

const TESTIMONIALS = [
  {
    quote: 'Compro las verduras del mismo puesto que veía los sábados, pero sin madrugar.',
    name: 'María L.',
    role: 'Vecina del centro',
  },
  {
    quote: 'En una tarde armé mi puesto digital y esa misma semana llegaron los primeros pedidos.',
    name: 'Don Héctor',
    role: 'Vendedor de frutas',
  },
  {
    quote: 'Mis clientes del barrio ahora me encuentran aunque no puedan venir al mercado.',
    name: 'Lucía R.',
    role: 'Panadera artesanal',
  },
];

const FAQ = [
  {
    q: '¿Cómo compro en Mercadito?',
    a: 'Explora el catálogo, agrega productos al carrito e inicia sesión para confirmar tu pedido. Recibes el estado del pedido desde tu cuenta.',
  },
  {
    q: '¿Puedo comprar y vender con la misma cuenta?',
    a: 'Sí. Todos los usuarios pueden comprar. Cuando quieras vender, activa tu puesto con “Quiero vender” y publicas productos sin crear otra cuenta.',
  },
  {
    q: '¿Cómo empiezo a vender?',
    a: 'Regístrate, elige “Quiero vender”, completa el nombre de tu puesto y publica tus productos con precio, stock e imagen.',
  },
  {
    q: '¿Mercadito procesa pagos en línea?',
    a: 'En esta etapa los pedidos se gestionan entre comprador y vendedor según el acuerdo del puesto. El catálogo y el flujo de órdenes ya están en la app.',
  },
  {
    q: '¿Puedo retirar en el mercado?',
    a: 'Sí: muchos puestos coordinan retiro en el mercado o entrega en la zona. Revisa la comunicación con el vendedor al confirmar el pedido.',
  },
  {
    q: '¿Qué pasa si mi puesto queda suspendido?',
    a: 'Puedes ver tus productos y órdenes, y editar la configuración del puesto. La publicación y los cambios de estado se reactivan cuando un admin levante la suspensión.',
  },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private productSvc = inject(ProductService);
  private host = inject(ElementRef<HTMLElement>);

  categories = CATEGORIES;
  testimonials = TESTIMONIALS;
  faq = FAQ;

  allProducts = signal<ProductCard[]>([]);
  selectedCategory = signal<string | null>(null);
  loadingProducts = signal(true);
  activeMode = signal<'buyer' | 'seller'>('buyer');
  addedToast = signal<string | null>(null);

  // Mobile menu & dark mode signals
  mobileMenuOpen = signal(false);
  isDarkMode = signal(false);

  // Cursor Aura tracking
  auraX = signal(0);
  auraY = signal(0);
  showAura = signal(false);

  private observer?: IntersectionObserver;

  readonly heroImage =
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=2000&q=80';
  readonly communityImage =
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80';

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleDarkMode(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        localStorage.setItem('mercadito-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('mercadito-theme', 'light');
      }
    }
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('mercadito-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
    }
  }

  sellLink(): string {
    if (!this.auth.isLoggedIn()) return '/auth/register';
    if (this.auth.isAdmin()) return '/productos';
    if (this.auth.hasSeller()) return '/seller';
    return '/seller/onboarding';
  }

  sellLabel(): string {
    if (this.auth.hasSeller()) return 'Ir a mi tienda';
    return 'Quiero vender';
  }

  filteredProducts(): ProductCard[] {
    const cat = this.selectedCategory();
    const items = this.allProducts();
    if (!cat) return items.slice(0, 4);
    const filtered = items.filter(
      (p) => p.category?.toLowerCase() === cat.toLowerCase()
    );
    return filtered.length > 0 ? filtered.slice(0, 4) : items.slice(0, 4);
  }

  selectCategory(catKey: string | null): void {
    this.selectedCategory.set(catKey);
  }

  setMode(mode: 'buyer' | 'seller'): void {
    this.activeMode.set(mode);
  }

  addToQuickCart(productName: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.addedToast.set(`¡${productName} agregado al carrito!`);
    setTimeout(() => this.addedToast.set(null), 2500);
  }

  onMouseMove(e: MouseEvent): void {
    this.auraX.set(e.clientX);
    this.auraY.set(e.clientY);
    if (!this.showAura()) this.showAura.set(true);
  }

  ngOnInit(): void {
    this.initTheme();
    this.productSvc.list().subscribe({
      next: (items) => {
        this.allProducts.set(items);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.allProducts.set([]);
        this.loadingProducts.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.host.nativeElement
        .querySelectorAll('.fade-up')
        .forEach((el: Element) => el.classList.add('is-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    );

    this.host.nativeElement
      .querySelectorAll('.fade-up')
      .forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
