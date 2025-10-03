import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './user.service';

/**
 * Main application component
 * Demonstrates standalone component with signals
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>{{ title }}</h1>
    <p>Count: {{ count() }}</p>
    <p>Double: {{ doubled() }}</p>
  `,
  styles: [`
    h1 { color: blue; }
  `]
})
export class AppComponent {
  @Input() title = 'Angular App';
  @Output() titleChange = new EventEmitter<string>();

  // Signals (Angular 19+)
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  constructor(private userService: UserService) {}

  ngOnInit() {
    console.log('Component initialized');
  }

  ngOnDestroy() {
    console.log('Component destroyed');
  }

  increment() {
    this.count.update(v => v + 1);
  }
}
