import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'any'
})
export class DataService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  fetchData(): Observable<any> {
    // ISSUE: Insecure HTTP instead of HTTPS
    return this.http.get('http://api.example.com/data');
  }
}
