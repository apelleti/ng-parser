import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, interval } from 'rxjs';
import { UserService } from '../services/user.service';

/**
 * User list component
 * WARNING: Intentional memory leak for demo purposes
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2>Users</h2>
      <div *ngFor="let user of users">
        {{ user.name }}
      </div>
    </div>
  `
})
export class UserListComponent implements OnInit, OnDestroy {
  users: any[] = [];

  // ISSUE: Observable without unsubscribe - memory leak
  timer$: Observable<number> = interval(1000);

  constructor(private userService: UserService) {}

  ngOnInit() {
    // ISSUE: Subscription without cleanup
    this.timer$.subscribe(val => {
      console.log('Timer:', val);
    });

    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  ngOnDestroy() {
    // Missing unsubscribe
  }
}
