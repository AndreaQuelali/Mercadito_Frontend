import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <a routerLink="/" class="flex items-center gap-2 font-semibold text-slate-900">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
            </svg>
          </span>
          <span class="text-lg">Mercadito</span>
        </a>
        <div class="flex-1">
          <label class="relative block">
            <span class="sr-only">Buscar</span>
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.235 12.03l3.743 3.742a.75.75 0 1 0 1.06-1.06l-3.742-3.743A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clip-rule="evenodd" />
              </svg>
            </span>
            <input
              type="text"
              class="w-full rounded-full border border-slate-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Buscar productos..."
              (input)="onSearch($any($event.target).value)"
            />
          </label>
        </div>
        <nav class="hidden md:flex items-center gap-2">
          <a routerLink="/" class="px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path fill-rule="evenodd" d="M12 2.25a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm-8.25 18a8.25 8.25 0 1 1 16.5 0v.75H3.75V20.25Z" clip-rule="evenodd" /></svg>
            Comprar
          </a>
          <a routerLink="/seller" class="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/></svg>
            Vender
          </a>
          <a routerLink="/cart" class="p-2 rounded-full border border-slate-300 hover:bg-slate-50" aria-label="Carrito">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M2.25 2.25a.75.75 0 0 0 0 1.5H4.5l.401 1.605 1.2 4.8A2.25 2.25 0 0 0 7.875 11.25h8.4a2.25 2.25 0 0 0 2.174-1.644l1.101-4.141A.75.75 0 0 0 18.825 4.5H6.226l-.3-1.2A1.5 1.5 0 0 0 4.5 2.25H2.25Z"/><path d="M6.75 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>
          </a>
        </nav>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Output() search = new EventEmitter<string>();
  private searchSvc = inject(SearchService);
  onSearch(q: string) {
    this.search.emit(q);
    this.searchSvc.setQuery(q);
  }
}
