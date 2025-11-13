import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-40 !bg-white !text-slate-900 border-b border-slate-200">
      <div class="max-w-7xl mx-auto flex-1 px-4 sm:px-6 lg:px-8 flex items-center gap-4">
        <a class="flex items-center gap-2 font-semibold text-slate-900" href="#">
          <button mat-icon-button class="!bg-brand-500 !text-white"><mat-icon>storefront</mat-icon></button>
          <span class="text-lg">Mercadito</span>
        </a>
        <div class="flex-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Buscar productos..." (input)="onSearch($any($event.target).value)" />
          </mat-form-field>
        </div>
        <nav class="hidden md:flex items-center gap-2">
          <button mat-stroked-button color="primary">Vender</button>
          <button mat-raised-button color="primary">Comprar</button>
          <button mat-icon-button aria-label="Carrito">
            <mat-icon>shopping_cart</mat-icon>
          </button>
        </nav>
      </div>
    </mat-toolbar>
  `
})
export class HeaderComponent {
  @Output() search = new EventEmitter<string>();
  onSearch(q: string) { this.search.emit(q); }
}
