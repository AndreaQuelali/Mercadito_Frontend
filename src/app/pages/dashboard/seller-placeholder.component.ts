import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-seller-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
  <main class="ui-page max-w-3xl">
    <h1 class="ui-title">{{ title$ | async }}</h1>
    <p class="ui-lead mt-3">Esta sección llega en una próxima versión.</p>
  </main>
  `,
})
export class SellerPlaceholderComponent {
  private route = inject(ActivatedRoute);
  title$ = this.route.data.pipe(map((d) => (d['title'] as string) || 'Próximamente'));
}
