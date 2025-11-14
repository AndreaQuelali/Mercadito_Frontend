import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [HeaderComponent, RouterOutlet],
  template: `
    <app-header (search)="query = $event"></app-header>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  query = '';
}
