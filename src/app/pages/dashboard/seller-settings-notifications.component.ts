import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { NotificationSettings, SellerEventKey, SellerService } from '../../services/seller.service';
import { ToastService } from '../../services/toast.service';

const EVENTS: { key: SellerEventKey; title: string; description: string }[] = [
  {
    key: 'order:new',
    title: 'Pedidos nuevos',
    description: 'Cuando un cliente compra uno de tus productos.',
  },
  {
    key: 'stock:low',
    title: 'Stock bajo',
    description: 'Cuando una venta deja un producto con poco stock o agotado.',
  },
  {
    key: 'review:new',
    title: 'Reseñas nuevas',
    description: 'Cuando un cliente califica uno de tus productos.',
  },
];

@Component({
  selector: 'app-seller-settings-notifications',
  standalone: true,
  imports: [CommonModule, UiEmptyComponent],
  template: `
  <main class="ui-page space-y-8">
    <header class="space-y-3">
      <h1 class="ui-title">Configuración</h1>
      <p class="ui-lead">Elige qué avisos quieres recibir de tu puesto en tiempo real.</p>
    </header>

    <!-- Loading -->
    <div *ngIf="loading()" class="max-w-3xl space-y-3" aria-busy="true" aria-label="Cargando configuración">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-20"></div>
    </div>

    <!-- Error -->
    <ui-empty *ngIf="!loading() && !settings()" variant="error" title="No pudimos cargar tu configuración" text="Revisa tu conexión e inténtalo de nuevo.">
      <button type="button" id="settings-retry" (click)="load()" class="ui-btn ui-btn-ghost">Reintentar</button>
    </ui-empty>

    <section *ngIf="!loading() && settings() as s" aria-labelledby="notif-title" class="ui-panel max-w-3xl space-y-2">
      <h2 id="notif-title" class="ui-h2 mb-3">Notificaciones</h2>

      <div *ngFor="let e of events" class="flex items-center justify-between gap-4 rounded-[var(--radius)] bg-base px-4 py-3.5">
        <div>
          <p [id]="'label-' + e.key" class="text-[16px] font-semibold text-text-main">{{ e.title }}</p>
          <p class="text-text-muted">{{ e.description }}</p>
        </div>

        <button type="button" role="switch" [id]="'toggle-' + e.key"
                [attr.aria-checked]="s.preferences[e.key]"
                [attr.aria-labelledby]="'label-' + e.key"
                [disabled]="saving() === e.key"
                (click)="toggle(e.key)"
                class="relative h-8 w-[60px] shrink-0 rounded-full transition disabled:opacity-60"
                [ngClass]="s.preferences[e.key] ? 'bg-accent-green' : 'bg-text-muted'">
          <span class="absolute left-1 top-1 h-6 w-6 rounded-full bg-base transition-transform"
                [ngClass]="s.preferences[e.key] ? 'translate-x-7' : ''"></span>
        </button>
      </div>

      <p class="pt-3 text-[13px] text-text-muted">
        El aviso de stock bajo salta cuando una venta deja un producto con
        <strong class="text-text-main">{{ s.lowStockThreshold }}</strong> unidades o menos.
        Este valor lo define el servidor.
      </p>
    </section>
  </main>
  `,
})
export class SellerSettingsNotificationsComponent implements OnInit {
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);

  readonly events = EVENTS;
  settings = signal<NotificationSettings | null>(null);
  loading = signal(true);
  saving = signal<SellerEventKey | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.sellerSvc.getNotificationSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.settings.set(null);
        this.loading.set(false);
      },
    });
  }

  /** Applies the change right away and rolls it back if the server refuses it */
  toggle(key: SellerEventKey): void {
    const current = this.settings();
    if (!current || this.saving() !== null) return;

    const next = !current.preferences[key];
    this.settings.set({ ...current, preferences: { ...current.preferences, [key]: next } });
    this.saving.set(key);

    this.sellerSvc.updateNotificationSettings({ [key]: next }).subscribe({
      next: (saved) => {
        this.settings.set(saved);
        this.saving.set(null);
      },
      error: () => {
        this.settings.set(current);
        this.saving.set(null);
        this.toast.error('No se pudo guardar el cambio. Intenta nuevamente.');
      },
    });
  }
}
