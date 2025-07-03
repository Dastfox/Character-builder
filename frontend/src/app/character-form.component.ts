import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';

interface Character {
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
  diceOptions = ['D4', 'D6'];
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

  lastId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getLicenses().subscribe(l => this.licenses = l);
  }

  onLicenseChange() {
    if (!this.model.license) return;
    this.api.getSkills(this.model.license).subscribe(s => this.skills = s);
    this.api.getInteractions(this.model.license).subscribe(i => this.interactions = i);

    // preset strength and weakness according to the chosen license
    const reset = () => this.abilityKeys.forEach(k => this.model.abilities[k] = '');
    reset();
    switch (this.model.license) {
      case 'Archivist':
        this.model.abilities['Observation'] = 'D6';
        this.model.abilities['Traversal'] = 'D4';
        break;
      case 'Fixer':
        this.model.abilities['Deduction'] = 'D6';
        this.model.abilities['Traversal'] = 'D4';
        break;
      case 'Guardian':
        this.model.abilities['Traversal'] = 'D6';
        this.model.abilities['Deduction'] = 'D4';
        break;
      case 'Diviner':
        // strength/weakness will be rolled
        break;
    }
  }

  rollDiviner() {
    if (this.model.license !== 'Diviner') return;
    const abilities = [...this.abilityKeys];
    const strength = abilities.splice(Math.floor(Math.random() * abilities.length), 1)[0];
    const weakness = abilities[Math.floor(Math.random() * abilities.length)];
    this.abilityKeys.forEach(k => this.model.abilities[k] = '');
    this.model.abilities[strength] = 'D6';
    this.model.abilities[weakness] = 'D4';
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
        this.lastId = res.id;
        alert('Character saved with id ' + res.id);
        window.location.href = this.exportUrl();
      },
      error: err => alert(err.error.detail || 'Error saving character')
    });
  }

  exportUrl(): string {
    return `http://localhost:8000/characters/${this.lastId}/export`;
  }
}
