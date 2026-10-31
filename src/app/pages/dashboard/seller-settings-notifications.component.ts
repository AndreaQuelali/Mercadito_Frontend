import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  template: `
  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <header>
      <p class="text-sm text-text-muted">Panel de gestión</p>
      <h1 class="text-2xl font-display font-bold text-text-main mt-1">Configuración</h1>
      <p class="text-text-muted mt-1 text-sm">Elige qué avisos quieres recibir en tiempo real.</p>
    </header>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-3 animate-pulse" aria-busy="true" aria-label="Cargando configuración">
      <div *ngFor="let i of [1,2,3]" class="h-20 rounded-2xl border border-border-subtle bg-surface"></div>
    </div>

    <!-- Error -->
    <div *ngIf="!loading() && !settings()" role="alert"
         class="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger flex items-center justify-between gap-3 flex-wrap">
      <span>No pudimos cargar tu configuración.</span>
      <button type="button" id="settings-retry" (click)="load()"
              class="font-semibold underline underline-offset-2">Reintentar</button>
    </div>

    <section *ngIf="!loading() && settings() as s" aria-labelledby="notif-title"
             class="rounded-2xl border border-border-subtle bg-surface">
      <h2 id="notif-title" class="px-5 pt-5 font-display font-semibold text-text-main">Notificaciones</h2>

      <ul class="divide-y divide-border-subtle mt-2">
        <li *ngFor="let e of events" class="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p [id]="'label-' + e.key" class="font-medium text-text-main">{{ e.title }}</p>
            <p class="text-sm text-text-muted">{{ e.description }}</p>
          </div>

          <button type="button" role="switch" [id]="'toggle-' + e.key"
                  [attr.aria-checked]="s.preferences[e.key]"
                  [attr.aria-labelledby]="'label-' + e.key"
                  [disabled]="saving() === e.key"
                  (click)="toggle(e.key)"
                  class="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60"
                  [ngClass]="s.preferences[e.key] ? 'bg-primary' : 'bg-border-medium'">
            <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  [ngClass]="s.preferences[e.key] ? 'translate-x-5' : ''"></span>
          </button>
        </li>
      </ul>

      <p class="px-5 py-4 border-t border-border-subtle text-sm text-text-muted">
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
