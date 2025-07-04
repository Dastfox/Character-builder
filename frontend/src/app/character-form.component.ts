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

interface Skill {
  name: string;
  license: string;
  ability: string;
  description: string;
  level: string;
  specialisation?: string | null;
}

@Component({
    selector: 'character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.css'],
    standalone: false
})
export class CharacterFormComponent implements OnInit {
  licenses: string[] = [];
  skills: Skill[] = [];
  interactions: string[] = [];
  abilityKeys = ['Observation', 'Exploration', 'Deduction', 'Traversal'];
  licenseSkillRules: Record<string, Record<string, number>> = {
    Archivist: { Observation: 2, Deduction: 1, Exploration: 1 },
    Diviner: { Deduction: 2, Observation: 1, Exploration: 1 },
    Fixer: { Deduction: 2, Exploration: 1, Observation: 1 },
    Guardian: { Traversal: 2, Exploration: 1, Observation: 1 }
  };
  ruleText = '';
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
  hoveredSkill: Skill | null = null;

  constructor(private api: ApiService) {}

  exportPdf() {
    if (!this.created) return;
    // jsPDF imported from CDN
    const { jsPDF } = (window as any);
    const doc = new jsPDF();
    const c = this.created;
    let y = 10;
    doc.text(`Name: ${c.name}`, 10, y);
    y += 10;
    doc.text(`Description: ${c.description}`, 10, y);
    y += 10;
    doc.text(`License: ${c.license}`, 10, y);
    y += 10;
    doc.text('Abilities:', 10, y);
    for (const a of this.abilityKeys) {
      y += 10;
      doc.text(`${a}: ${c.abilities[a]}`, 20, y);
    }
    y += 10;
    doc.text('Skills: ' + c.skills.join(', '), 10, y);
    y += 10;
    doc.text('Interactions: ' + c.interactions.join(', '), 10, y);
    doc.save(`character_${c.id}.pdf`);
  }

  ngOnInit() {
    this.api.getLicenses().subscribe(l => this.licenses = l);
  }

  onLicenseChange() {
    if (!this.model.license) return;
    this.api.getSkills({ license: this.model.license, level: 'starting' }).subscribe(s => this.skills = s);
    this.api.getInteractions(this.model.license).subscribe(i => this.interactions = i);
    this.setTrainingDefaults();
    const rule = this.licenseSkillRules[this.model.license];
    if (rule) {
      const parts = Object.entries(rule).map(([a, n]) => `${n} ${a} Skill${n > 1 ? 's' : ''}`);
      this.ruleText = `Choose ${parts.join(', ')} from the ${this.model.license} Skill Path Starting Skills.`;
    } else {
      this.ruleText = '';
    }
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

  toggleSkill(skill: Skill, checked: boolean) {
    if (checked) {
      if (this.model.skills.length >= 4) {
        return;
      }
      this.model.skills = [...this.model.skills, skill.name];
    } else {
      this.model.skills = this.model.skills.filter(x => x !== skill.name);
    }
  }

  private getAbilityCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const name of this.model.skills) {
      const s = this.skills.find(sk => sk.name === name);
      if (s) {
        counts[s.ability] = (counts[s.ability] || 0) + 1;
      }
    }
    return counts;
  }

  toggleInteraction(interaction: string, checked: boolean) {
    if (checked) {
      if (this.model.interactions.length >= 3) {
        return;
      }
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

  isSkillDisabled(skill: Skill): boolean {
    if (this.model.skills.includes(skill.name)) return false;
    const rule = this.licenseSkillRules[this.model.license];
    if (rule) {
      const counts = this.getAbilityCounts();
      const allowed = rule[skill.ability] || 0;
      if ((counts[skill.ability] || 0) >= allowed) {
        return true;
      }
    }
    return this.model.skills.length >= 4;
  }

  isInteractionDisabled(interaction: string): boolean {
    return !this.model.interactions.includes(interaction) && this.model.interactions.length >= 3;
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
