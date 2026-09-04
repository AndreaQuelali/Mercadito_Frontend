import { Component, inject, OnInit, effect } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { SocketService } from './services/socket.service';
import { AuthService } from './services/auth.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [HeaderComponent, RouterOutlet, ToastComponent],
  template: `
    <app-header></app-header>
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `,
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  constructor() {
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

  ngOnInit(): void {}
}
