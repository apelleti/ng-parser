import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dashboard component
 * WARNING: Contains XSS vulnerability for demo
 */
@Component({
  selector: 'app-dashboard',
  standalone: false, // Part of a module
  // ISSUE: Missing OnPush for performance
  template: `
    <div>
      <h1>Dashboard</h1>
      <div [id]="containerId"></div>
    </div>
  `
})
export class DashboardComponent {
  containerId = 'dashboard-container';

  displayMessage(htmlContent: string) {
    // ISSUE: XSS vulnerability - using innerHTML directly
    const element = document.getElementById(this.containerId);
    if (element) {
      element.innerHTML = htmlContent;
    }
  }

  // ISSUE: Function in template causes performance issues
  getTimestamp() {
    return new Date().getTime();
  }
}
