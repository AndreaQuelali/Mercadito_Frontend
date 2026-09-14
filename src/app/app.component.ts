import { Component, inject, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './components/toast/toast.component';
import { SocketService } from './services/socket.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [CommonModule, HeaderComponent, RouterOutlet, ToastComponent],
  template: `
    <app-header *ngIf="showGlobalHeader()"></app-header>
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `,
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private router = inject(Router);
  private theme = inject(ThemeService);

  showGlobalHeader = signal(true);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.updateHeaderVisibility(e.urlAfterRedirects || e.url);
    });

    effect(() => {
      if (this.auth.isLoggedIn()) {
        setTimeout(() => this.socket.connect(), 1000);
      } else {
        this.socket.disconnect();
      }
    });
  }

  ngOnInit(): void {
    this.theme.init();
    this.updateHeaderVisibility(this.router.url);
  }

  private updateHeaderVisibility(url: string): void {
    const path = url.split('?')[0];
    const hide =
      path === '/' ||
      path === '' ||
      path.startsWith('/auth') ||
      path === '/reset-password';
    this.showGlobalHeader.set(!hide);
  }
}
