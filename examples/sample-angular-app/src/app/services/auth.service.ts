import { Injectable } from '@angular/core';

/**
 * Authentication service
 * WARNING: Contains security issues for demo
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ISSUE: Hardcoded credentials - security risk
  private apiKey = 'sk-1234567890abcdef';
  private secret = 'my-super-secret-key';

  constructor() {}

  authenticate(username: string, password: string): boolean {
    // ISSUE: Using eval() - security risk
    const result = eval(`"${username}" === "admin"`);
    return result && password === this.secret;
  }

  validateToken(token: string): boolean {
    // ISSUE: Insecure token validation
    return token.includes(this.apiKey);
  }
}
