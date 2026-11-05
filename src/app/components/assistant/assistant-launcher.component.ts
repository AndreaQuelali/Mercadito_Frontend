import { Component, ElementRef, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AssistantService } from '../../services/assistant.service';
import { AssistantPanelComponent } from './assistant-panel.component';

/** Pages that show the buying navbar and, with it, the assistant */
const MARKETPLACE_PATH = /^\/(home|products|product\/[^/]+|cart|checkout|orders)\/?$/;

export function isMarketplacePath(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return MARKETPLACE_PATH.test(path);
}

@Component({
  selector: 'app-assistant-launcher',
  standalone: true,
  imports: [CommonModule, AssistantPanelComponent],
  template: `
    <ng-container *ngIf="visible()">
      <button
        #launcher
        id="assistant-launcher"
        type="button"
        class="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light"
        [ngClass]="{ 'lg:right-[424px]': svc.open() }"
        aria-label="Abrir asistente de compras"
        aria-haspopup="dialog"
        [attr.aria-expanded]="svc.open()"
        aria-controls="assistant-panel"
        (click)="toggle()"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <app-assistant-panel *ngIf="svc.open()" (close)="close()"></app-assistant-panel>
    </ng-container>
  `,
})
export class AssistantLauncherComponent implements OnInit {
  svc = inject(AssistantService);
  private router = inject(Router);

  @ViewChild('launcher') launcher?: ElementRef<HTMLButtonElement>;

  private url = signal(this.router.url);
  readonly visible = computed(() => this.svc.enabled() && isMarketplacePath(this.url()));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.url.set(e.urlAfterRedirects || e.url));

    effect(() => {
      // On large screens the page makes room for the panel instead of sitting under it
      document.body.classList.toggle('assistant-open', this.visible() && this.svc.open());
    });
  }

  ngOnInit(): void {
    this.svc.loadStatus();
  }

  toggle(): void {
    if (this.svc.open()) this.close();
    else this.svc.openPanel();
  }

  close(): void {
    if (!this.svc.open()) return;
    this.svc.closePanel();
    // The panel is gone from the DOM after the next check; the button is always there
    this.launcher?.nativeElement.focus();
  }
}
