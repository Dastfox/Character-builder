import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiService {
  private base = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getLicenses(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/licenses`);
  }

  getSkills(filters: { license?: string; ability?: string; level?: string } = {}): Observable<any[]> {
    let params = new HttpParams();
    if (filters.license) {
      params = params.set('license', filters.license);
    }
    if (filters.ability) {
      params = params.set('ability', filters.ability);
    }
    if (filters.level) {
      params = params.set('level', filters.level);
    }
    return this.http.get<any[]>(`${this.base}/skills`, { params });
  }

  getInteractions(license: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/interactions/${license}`);
  }

  createCharacter(char: any): Observable<any> {
    return this.http.post(`${this.base}/characters`, char);
  }
}
