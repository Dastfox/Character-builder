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
  locked: Set<string> = new Set();
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
    this.setTrainingDefaults();
  }

  setTrainingDefaults() {
    this.locked.clear();
    this.abilityKeys.forEach(k => (this.model.abilities[k] = ''));
    const rules: any = {
      Archivist: { strength: 'Observation', weakness: 'Traversal' },
      Fixer: { strength: 'Deduction', weakness: 'Traversal' },
      Guardian: { strength: 'Traversal', weakness: 'Deduction' },

    };
    const r = rules[this.model.license as keyof typeof rules];
    if (r) {
      this.locked.add(r.strength);
      this.locked.add(r.weakness);
      this.model.abilities[r.strength] = 'd6';
      this.model.abilities[r.weakness] = 'd4';
      const rest = this.abilityKeys.filter(k => !this.locked.has(k));
      // default remaining assignments
      this.model.abilities[rest[0]] = 'd6';
      this.model.abilities[rest[1]] = 'd4';
    }
  }

  randomizeDiviner() {
    if (this.model.license !== 'Diviner') return;
    this.locked.clear();
    const pool = [...this.abilityKeys];
    const strength = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const weakness = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    this.locked.add(strength);
    this.locked.add(weakness);
    this.model.abilities[strength] = 'd6';
    this.model.abilities[weakness] = 'd4';
    // leave remaining abilities empty so the player must assign them
    this.model.abilities[pool[0]] = '';
    this.model.abilities[pool[1]] = '';
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

  isDieDisabled(key: string, die: string): boolean {
    let d4 = 0,
      d6 = 0;
    for (const k of this.abilityKeys) {
      if (k === key) continue;
      if (this.model.abilities[k] === 'd4') d4++;
      if (this.model.abilities[k] === 'd6') d6++;
    }
    if (die === 'd4') return d4 >= 2;
    return d6 >= 2;
  }

  save() {
    for (const key of this.abilityKeys) {
      if (!this.model.abilities[key]) {
        alert('Please assign dice to all abilities.');
        return;
      }
    }

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
