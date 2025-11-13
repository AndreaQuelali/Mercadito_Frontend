import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { HomeComponent } from './pages/home/home.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [HeaderComponent, HomeComponent],
  template: `
    <app-header (search)="query = $event"></app-header>
    <app-home [query]="query"></app-home>
  `,
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  query = '';
}
