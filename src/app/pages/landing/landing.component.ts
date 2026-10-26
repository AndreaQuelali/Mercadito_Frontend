import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ProductService } from '../../services/products.service';
import { ProductCard } from '../../components/product-card/product-card.component';

interface HeroSlide {
  src: string;
  alt: string;
  caption: string;
}

interface Category {
  key: string;
  label: string;
  image: string;
  alt: string;
  caption: string;
}

interface FaqItem {
  q: string;
  a: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: 'assets/landing/verduras-punata.jpg',
    alt: 'Puesto de verduras con zanahorias, vainitas y pimentones en el mercado de Punata',
    caption: 'Mercado de Punata, Cochabamba',
  },
  {
    src: 'assets/landing/frutas-10enero.jpg',
    alt: 'Granadas y frutillas en un puesto del Mercado 10 de Enero',
    caption: 'Mercado 10 de Enero, La Paz',
  },
  {
    src: 'assets/landing/calle-cliza.jpg',
    alt: 'Una vendedora empuja una carretilla por una calle de mercado en Cliza',
    caption: 'Calle de mercado, Cliza',
  },
  {
    src: 'assets/landing/queso.jpg',
    alt: 'Queso fresco y papayas en un mercado',
    caption: 'Queso fresco en un mercado',
  },
  {
    src: 'assets/landing/pan-horno.jpg',
    alt: 'Pan recién salido del horno',
    caption: 'Pan de horno, La Paz',
  },
  {
    src: 'assets/landing/aguayos.jpg',
    alt: 'Aguayos de colores apilados en un puesto',
    caption: 'Aguayos en un mercado de El Alto',
  },
];

const CATEGORIES: Category[] = [
  {
    key: 'verduras',
    label: 'Verduras',
    image: 'assets/landing/verduras-cliza.jpg',
    alt: 'Puesto de papas, verduras y legumbres en Cliza',
    caption: 'Papas, verduras y legumbres, Cliza',
  },
  {
    key: 'frutas',
    label: 'Frutas',
    image: 'assets/landing/frutas-punata.jpg',
    alt: 'Cajones de frutas en un puesto del mercado de Punata',
    caption: 'Frutas en cajón, mercado de Punata',
  },
  {
    key: 'panaderia',
    label: 'Panadería',
    image: 'assets/landing/pan-horno.jpg',
    alt: 'Pan recién salido del horno',
    caption: 'Pan de horno, La Paz',
  },
  {
    key: 'lacteos',
    label: 'Lácteos',
    image: 'assets/landing/queso.jpg',
    alt: 'Queso fresco sobre una mesa de mercado',
    caption: 'Queso fresco en un mercado',
  },
  {
    key: 'artesanias',
    label: 'Artesanías',
    image: 'assets/landing/aguayos.jpg',
    alt: 'Aguayos de colores en un puesto',
    caption: 'Aguayos en un mercado de El Alto',
  },
];

const FAQ: FaqItem[] = [
  {
    q: '¿Necesito otra cuenta para vender?',
    a: 'No. Una sola cuenta sirve para comprar y para vender. Cuando quieras, eliges “Quiero vender”, completas el nombre de tu puesto y publicas tus productos.',
  },
  {
    q: '¿Cómo compro en Mercadito?',
    a: 'Explora el catálogo, agrega productos al carrito e inicia sesión para confirmar tu pedido. Sigues el estado desde tu cuenta.',
  },
  {
    q: '¿Cómo recibo mi pedido?',
    a: 'Lo acuerdas con el puesto: muchos coordinan retiro en el mercado o entrega en tu zona. Revisa la comunicación con el vendedor al confirmar.',
  },
  {
    q: '¿Mercadito procesa pagos en línea?',
    a: 'En esta etapa los pedidos se gestionan entre comprador y vendedor según el acuerdo del puesto, incluido el pago.',
  },
  {
    q: '¿Qué puedo publicar?',
    a: 'Verduras, frutas, panadería, lácteos y artesanías, con precio, stock e imagen.',
  },
  {
    q: '¿Qué pasa si mi puesto queda suspendido?',
    a: 'Puedes ver tus productos y órdenes, y editar la configuración del puesto. La publicación se reactiva cuando un administrador levante la suspensión.',
  },
];

const SLIDE_INTERVAL_MS = 5500;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);
  private productSvc = inject(ProductService);
  private host = inject(ElementRef<HTMLElement>);

  readonly slides = HERO_SLIDES;
  readonly categories = CATEGORIES;
  readonly faq = FAQ;
  readonly year = new Date().getFullYear();

  slideIndex = signal(0);
  selectedCategory = signal<string>(CATEGORIES[0].key);
  allProducts = signal<ProductCard[]>([]);
  loadingProducts = signal(true);
  mobileMenuOpen = signal(false);

  currentSlide = computed(() => this.slides[this.slideIndex()]);
  currentCategory = computed(
    () => this.categories.find((c) => c.key === this.selectedCategory()) ?? this.categories[0]
  );
  categoryProducts = computed(() => {
    const key = this.selectedCategory();
    return this.allProducts()
      .filter((p) => p.category?.toLowerCase() === key)
      .slice(0, 4);
  });

  private observer?: IntersectionObserver;
  private slideTimer?: ReturnType<typeof setInterval>;

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleDarkMode(): void {
    this.theme.toggle();
  }

  sellLink(): string {
    if (!this.auth.isLoggedIn()) return '/auth/register';
    if (this.auth.isAdmin()) return '/products';
    if (this.auth.hasSeller()) return '/dashboard';
    return '/seller/onboarding';
  }

  sellLabel(): string {
    if (this.auth.hasSeller()) return 'Ir a mi tienda';
    return 'Quiero vender';
  }

  selectCategory(key: string): void {
    this.selectedCategory.set(key);
  }

  goToSlide(index: number): void {
    this.slideIndex.set(index);
    this.startSlideshow();
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/home');
      return;
    }
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
    this.startSlideshow();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = this.host.nativeElement.querySelectorAll('.rv');
    if (reduced || typeof IntersectionObserver === 'undefined') {
      items.forEach((el: Element) => el.classList.add('in'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.stopSlideshow();
  }

  private startSlideshow(): void {
    this.stopSlideshow();
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.slideTimer = setInterval(
      () => this.slideIndex.set((this.slideIndex() + 1) % this.slides.length),
      SLIDE_INTERVAL_MS
    );
  }

  private stopSlideshow(): void {
    if (this.slideTimer) clearInterval(this.slideTimer);
    this.slideTimer = undefined;
  }
}
