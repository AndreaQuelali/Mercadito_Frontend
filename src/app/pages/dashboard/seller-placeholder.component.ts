import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-seller-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
    <h1 class="text-2xl font-display font-bold text-text-main">{{ title$ | async }}</h1>
    <p class="mt-3 text-text-muted">Próximamente</p>
  </main>
  `,
})
export class SellerPlaceholderComponent {
  private route = inject(ActivatedRoute);
  title$ = this.route.data.pipe(map((d) => (d['title'] as string) || 'Próximamente'));
}
