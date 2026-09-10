import { Component, inject, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './components/toast/toast.component';
import { SocketService } from './services/socket.service';
import { AuthService } from './services/auth.service';

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

  showGlobalHeader = signal(true);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      const url = e.urlAfterRedirects || e.url;
      // Hide standard global header on landing page ('/' or '')
      this.showGlobalHeader.set(url !== '/' && url !== '');
    });

    // Connect socket when user logs in, disconnect on logout
    effect(() => {
      if (this.auth.isLoggedIn()) {
        // Defer until after Socket.IO CDN loads
        setTimeout(() => this.socket.connect(), 1000);
      } else {
        this.socket.disconnect();
      }
    });
  }

  ngOnInit(): void {
    const initialUrl = this.router.url;
    this.showGlobalHeader.set(initialUrl !== '/' && initialUrl !== '');
  }
}
