import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Seller, SellerService } from '../../services/seller.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-seller-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="ui-page max-w-2xl">
    <header class="space-y-3 mb-8">
      <h1 class="ui-title">Mi puesto</h1>
      <p class="ui-lead">Edita los datos de tu perfil de vendedor.</p>
    </header>

    <p *ngIf="seller()?.status === 'suspended'" class="ui-alert-warn mb-6">
      Tu puesto está suspendido. Puedes editar estos datos, pero no publicar ni gestionar productos hasta que un administrador lo reactive.
    </p>

    <div *ngIf="loading()" class="ui-skel h-64"></div>

    <form *ngIf="!loading() && seller()" (ngSubmit)="onSubmit()" class="ui-panel space-y-5">
      <label class="block">
        <span class="ui-label">Nombre del puesto *</span>
        <input id="st-name" [(ngModel)]="model.businessName" name="businessName" type="text" required class="ui-field" />
      </label>
      <label class="block">
        <span class="ui-label">Descripción</span>
        <textarea id="st-desc" [(ngModel)]="model.description" name="description" rows="3" class="ui-field"></textarea>
      </label>
      <label class="block">
        <span class="ui-label">Ubicación</span>
        <input id="st-location" [(ngModel)]="model.location" name="location" type="text" class="ui-field" />
      </label>
      <label class="block">
        <span class="ui-label">URL del logo o avatar</span>
        <input id="st-avatar" [(ngModel)]="model.avatarUrl" name="avatarUrl" type="url" class="ui-field" />
      </label>

      <fieldset class="space-y-4 border-t-2 border-dotted border-text-main pt-5" id="st-payments">
        <legend class="ui-h2">Cobro</legend>
        <label class="flex items-center gap-3">
          <input id="st-cash" type="checkbox" [(ngModel)]="model.acceptsCash" name="acceptsCash" />
          <span>Acepto pago contra entrega</span>
        </label>
        <label class="flex items-center gap-3">
          <input id="st-qr" type="checkbox" [(ngModel)]="model.acceptsQr" name="acceptsQr" />
          <span>Acepto QR o transferencia</span>
        </label>
        <ng-container *ngIf="model.acceptsQr">
          <label class="block">
            <span class="ui-label">URL de tu imagen de QR</span>
            <input id="st-qr-url" [(ngModel)]="model.paymentQrUrl" name="paymentQrUrl" type="url" class="ui-field" placeholder="https://..." />
          </label>
          <label class="block">
            <span class="ui-label">Instrucciones de pago</span>
            <textarea id="st-pay-instr" [(ngModel)]="model.paymentInstructions" name="paymentInstructions" rows="3" maxlength="500" class="ui-field"
                      placeholder="Titular, banco, número de cuenta o celular"></textarea>
          </label>
          <p class="ui-alert-warn">Estos datos son visibles para los compradores que elijan pagar por QR o transferencia.</p>
        </ng-container>
      </fieldset>

      <p *ngIf="errorMsg()" class="ui-alert-error" role="alert">{{ errorMsg() }}</p>

      <button id="st-submit" type="submit" [disabled]="saving()" class="ui-btn">
        <span *ngIf="saving()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        Guardar cambios
      </button>
    </form>
  </main>
  `,
})
export class SellerSettingsComponent implements OnInit {
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);

  seller = signal<Seller | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  model = {
    businessName: '',
    description: '',
    location: '',
    avatarUrl: '',
    acceptsCash: true,
    acceptsQr: false,
    paymentQrUrl: '',
    paymentInstructions: '',
  };

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({
      next: (s) => {
        this.seller.set(s);
        this.model = {
          businessName: s.businessName,
          description: s.description ?? '',
          location: s.location ?? '',
          avatarUrl: s.avatarUrl ?? '',
          acceptsCash: s.acceptsCash ?? true,
          acceptsQr: s.acceptsQr ?? false,
          paymentQrUrl: s.paymentQrUrl ?? '',
          paymentInstructions: s.paymentInstructions ?? '',
        };
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    this.saving.set(true);
    this.errorMsg.set(null);
    this.sellerSvc
      .updateMine({
        businessName: this.model.businessName.trim(),
        description: this.model.description.trim() || null,
        location: this.model.location.trim() || null,
        avatarUrl: this.model.avatarUrl.trim() || null,
        acceptsCash: this.model.acceptsCash,
        acceptsQr: this.model.acceptsQr,
        paymentQrUrl: this.model.paymentQrUrl.trim() || null,
        paymentInstructions: this.model.paymentInstructions.trim() || null,
      })
      .subscribe({
        next: (s) => {
          this.seller.set(s);
          this.toast.success('Perfil actualizado');
          this.saving.set(false);
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message ?? 'No se pudieron guardar los cambios.');
          this.saving.set(false);
        },
      });
  }
}
