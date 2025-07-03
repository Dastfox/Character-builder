import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiService {
  private base = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getLicenses(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/licenses`);
  }

  getSkills(license: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/skills/${license}`);
  }

  getInteractions(license: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/interactions/${license}`);
  }

  createCharacter(char: any): Observable<any> {
    return this.http.post(`${this.base}/characters`, char);
  }
}
