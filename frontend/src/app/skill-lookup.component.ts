import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';

interface SkillDetail {
  name: string;
  license: string;
  ability: string;
  description: string;
  level: string;
  specialisation?: string | null;
}

@Component({
  selector: 'skill-lookup',
  templateUrl: './skill-lookup.component.html',
  styleUrls: ['./skill-lookup.component.css'],
  standalone: false
})
export class SkillLookupComponent implements OnInit {
  skills: SkillDetail[] = [];
  search = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getSkills().subscribe(s => (this.skills = s));
  }

  get filteredSkills(): SkillDetail[] {
    const term = this.search.toLowerCase();
    return this.skills.filter(s => s.name.toLowerCase().includes(term));
  }
}
