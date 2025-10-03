import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightDirective } from '../directives/highlight.directive';

/**
 * User profile component
 * Demonstrates multiple style files and complex template
 */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, HighlightDirective],
  templateUrl: './user-profile.component.html',
  styleUrls: [
    './user-profile.component.scss',
    './user-profile-responsive.scss',
    './user-profile-theme.scss'
  ]
})
export class UserProfileComponent implements OnInit {
  @Input() userId: string = '';
  @Input() username: string = '';
  @Input() email: string = '';
  @Input() avatarUrl: string = '';

  isLoading = false;
  profileData: any = null;

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.profileData = {
        bio: 'Software developer',
        location: 'Paris, France',
        followers: 1250,
        following: 340
      };
      this.isLoading = false;
    }, 1000);
  }

  onFollowClick() {
    console.log('Follow user:', this.username);
  }

  onMessageClick() {
    console.log('Message user:', this.username);
  }
}
