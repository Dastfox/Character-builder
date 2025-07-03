import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';

interface Character {
  id?: number;
  name: string;
  description: string;
  license: string;
  abilities: Record<string, string>;
  skills: string[];
  interactions: string[];
}

@Component({
    selector: 'character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.css'],
    standalone: false
})
export class CharacterFormComponent implements OnInit {
  licenses: string[] = [];
  skills: string[] = [];
  interactions: string[] = [];
  abilityKeys = ['Observation', 'Exploration', 'Deduction', 'Traversal'];
  model: Character = {
    name: '',
    description: '',
    license: '',
    abilities: {
      Observation: '',
      Exploration: '',
      Deduction: '',
      Traversal: ''
    },
    skills: [],
    interactions: []
  };
  created: Character | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getLicenses().subscribe(l => this.licenses = l);
  }

  onLicenseChange() {
    if (!this.model.license) return;
    this.api.getSkills(this.model.license).subscribe(s => this.skills = s);
    this.api.getInteractions(this.model.license).subscribe(i => this.interactions = i);
  }

  toggleSkill(skill: string, checked: boolean) {
    if (checked) {
      this.model.skills = [...this.model.skills, skill];
    } else {
      this.model.skills = this.model.skills.filter(x => x !== skill);
    }
  }

  toggleInteraction(interaction: string, checked: boolean) {
    if (checked) {
      this.model.interactions = [...this.model.interactions, interaction];
    } else {
      this.model.interactions = this.model.interactions.filter(x => x !== interaction);
    }
  }

  save() {
    this.api.createCharacter(this.model).subscribe({
      next: res => {
        this.created = res as Character;
      },
      error: err => {
        alert('Error: ' + (err.error?.detail || 'unknown'));
      }
    });
  }
}
