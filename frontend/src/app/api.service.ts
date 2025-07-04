import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface SkillDetail {
  name: string;
  license: string;
  ability: string;
  description: string;
  level: string;
  specialisation?: string | null;
}

export interface Character {
  id?: number;
  name: string;
  description: string;
  license: string;
  abilities: Record<string, string>;
  skills: string[];
  interactions: string[];
}

@Injectable()
export class ApiService {
  private licenses = ['Archivist', 'Diviner', 'Fixer', 'Guardian'];
  private interactions: Record<string, string[]> = {
    Archivist: ['Diagnose', 'Sketch', 'Study', 'Take Samples', 'Talk'],
    Diviner: ['Gift', 'Read', 'Sing', 'Soothe', 'Touch'],
    Fixer: ['Bait', 'Gift', 'Provoke', 'Read', 'Touch'],
    Guardian: ['Explore', 'Feed', 'Play', 'Protect', 'Provoke']
  };
  private skillRules: Record<string, Record<string, number>> = {
    Archivist: { Observation: 2, Deduction: 1, Exploration: 1 },
    Diviner: { Deduction: 2, Observation: 1, Exploration: 1 },
    Fixer: { Deduction: 2, Exploration: 1, Observation: 1 },
    Guardian: { Traversal: 2, Exploration: 1, Observation: 1 }
  };
  private characters: Character[] = [];
  private nextId = 1;
  private allSkills: SkillDetail[] = [];
  private scenarioQuestions: any[] = [];

  constructor(private http: HttpClient) {
    this.http.get<SkillDetail[]>('assets/skills_with_details.json').subscribe(d => (this.allSkills = d));
    this.http.get<any[]>('assets/scenario_questions.json').subscribe(q => (this.scenarioQuestions = q));
  }

  getLicenses(): Observable<string[]> {
    return of(this.licenses);
  }

  getSkills(filters: { license?: string; ability?: string; level?: string } = {}): Observable<SkillDetail[]> {
    const ensure = this.allSkills.length
      ? of(this.allSkills)
      : this.http.get<SkillDetail[]>('assets/skills_with_details.json').pipe(map(d => (this.allSkills = d, d)));
    return ensure.pipe(
      map(skills =>
        skills.filter(s => {
          if (filters.license && s.license !== filters.license) return false;
          if (filters.ability && s.ability !== filters.ability) return false;
          if (filters.level && s.level !== filters.level) return false;
          return true;
        })
      )
    );
  }

  getInteractions(license: string): Observable<string[]> {
    return of(this.interactions[license] || []);
  }

  getScenarioQuestions(): Observable<any[]> {
    return this.scenarioQuestions.length
      ? of(this.scenarioQuestions)
      : this.http.get<any[]>('assets/scenario_questions.json').pipe(map(q => (this.scenarioQuestions = q, q)));
  }

  buildFromScenario(payload: any): Observable<any> {
    return this.getSkills().pipe(
      map(() => null),
      // ensure skills loaded first
      switchMap(() =>
        this.getScenarioQuestions().pipe(
          map(q => this.buildCharacterFromScenario(payload, q))
        )
      )
    );
  }

  createCharacter(char: Character): Observable<Character> {
    try {
      const created = this.validateAndStoreCharacter({ ...char });
      return of(created);
    } catch (err: any) {
      return throwError(() => err);
    }
  }

  private validateAndStoreCharacter(char: Character): Character {
    this.validateCharacter(char);
    char.id = this.nextId++;
    this.characters.push(char);
    return char;
  }

  private validateCharacter(char: Character) {
    if (!this.licenses.includes(char.license)) {
      throw { error: { detail: 'Invalid license' } };
    }

    const dice: Record<string, string> = {};
    for (const [k, v] of Object.entries(char.abilities)) {
      dice[k] = v.trim().toLowerCase();
    }
    const counts: Record<string, number> = { d4: 0, d6: 0 };
    for (const die of Object.values(dice) as string[]) {
      if (!(die in counts)) {
        throw { error: { detail: 'Abilities must use D4 or D6' } };
      }
      counts[die] += 1;
    }
    if (counts.d4 !== 2 || counts.d6 !== 2) {
      throw { error: { detail: 'Assign exactly two D4 and two D6 to abilities' } };
    }

    const allowedSkills = this.skillsForLicense(char.license).filter(s => s.level === 'starting').map(s => s.name);
    if (char.skills.some(s => !allowedSkills.includes(s))) {
      throw { error: { detail: 'Invalid skill for licence' } };
    }
    if (char.skills.length !== 4) {
      throw { error: { detail: 'Choose exactly four starting skills' } };
    }

    const countsByAbility: Record<string, number> = { Observation: 0, Exploration: 0, Deduction: 0, Traversal: 0 };
    for (const name of char.skills) {
      const sk = this.skillsForLicense(char.license).find(s => s.name === name);
      if (sk) countsByAbility[sk.ability] += 1;
    }
    const rule = this.skillRules[char.license];
    for (const ability of Object.keys(rule)) {
      if (countsByAbility[ability] !== rule[ability]) {
        const needed = Object.entries(rule).map(([a,n]) => `${n} ${a}`).join(', ');
        throw { error: { detail: `${char.license} requires ${needed} starting skills` } };
      }
    }

    const allowedInteractions = this.interactions[char.license] || [];
    if (char.interactions.some(i => !allowedInteractions.includes(i))) {
      throw { error: { detail: 'Invalid interaction for licence' } };
    }
    if (char.interactions.length !== 3) {
      throw { error: { detail: 'Choose exactly three interactions' } };
    }
  }

  private skillsForLicense(license: string): SkillDetail[] {
    return this.allSkills.filter(s => s.license === license);
  }

  private buildCharacterFromScenario(payload: any, questions: any[]): any {
    const licenseScores: Record<string, number> = {
      Archivist: 0,
      Diviner: 0,
      Fixer: 0,
      Guardian: 0
    };
    const skills: string[] = [];
    const interactions: string[] = [];
    let abilityChoice: string | null = null;

    const optionLookup: Record<string, Record<string, any>> = {};
    for (const q of questions) {
      optionLookup[q.id] = {};
      for (const o of q.options || []) optionLookup[q.id][o.id] = o;
    }

    for (const [qid, oid] of Object.entries(payload.answers || {})) {
      const oMap = optionLookup[qid as string];
      const option = oMap ? oMap[oid as string] : undefined;
      if (!option) continue;
      if (option.license) licenseScores[option.license] += 1;
      if (option.ability) abilityChoice = option.ability;
      if (option.skill && !skills.includes(option.skill)) skills.push(option.skill);
      if (option.interaction && !interactions.includes(option.interaction)) interactions.push(option.interaction);
    }

    const license = Object.entries(licenseScores).sort((a, b) => b[1] - a[1])[0][0];
    const abilities: Record<string, string> = {
      Observation: '',
      Exploration: '',
      Deduction: '',
      Traversal: ''
    };
    const training: Record<string, { strength: string; weakness: string }> = {
      Archivist: { strength: 'Observation', weakness: 'Traversal' },
      Fixer: { strength: 'Deduction', weakness: 'Traversal' },
      Guardian: { strength: 'Traversal', weakness: 'Deduction' }
    };
    const rules = training[license];
    if (license === 'Diviner') {
      const strength = abilityChoice || 'Deduction';
      const weakness = ['Observation', 'Exploration', 'Deduction', 'Traversal'].find(a => a !== strength) as string;
      abilities[strength] = 'd6';
      abilities[weakness] = 'd4';
    } else if (rules) {
      abilities[rules.strength] = 'd6';
      abilities[rules.weakness] = 'd4';
      if (abilityChoice && abilityChoice !== rules.strength && abilityChoice !== rules.weakness) {
        abilities[abilityChoice] = 'd6';
      }
    }
    for (const a of Object.keys(abilities)) {
      if (!abilities[a]) {
        abilities[a] = Object.values(abilities).filter(d => d === 'd4').length < 2 ? 'd4' : 'd6';
      }
    }

    const char: Character = {
      name: payload.name,
      description: payload.description,
      license,
      abilities,
      skills,
      interactions
    };
    const created = this.validateAndStoreCharacter(char);
    return {
      ...created,
      license_description: this.getLicenseDescription(license)
    };
  }

  private getLicenseDescription(license: string): string {
    const desc: Record<string, string> = {
      Archivist:
        'Training: Strength in Observation, Weakness in Traversal. Starting Skills: Two Observation skills, one Deduction skill, one Exploration skill. Interactions: Choose three from Diagnose, Sketch, Study, Take Samples, Talk.',
      Diviner:
        'Training: Strength and Weakness determined by Fate. Starting Skills: Two Deduction skills, one Observation skill, one Exploration skill. Interactions: Choose three from Gift, Read, Sing, Soothe, Touch.',
      Fixer:
        'Training: Strength in Deduction, Weakness in Traversal. Starting Skills: Two Deduction skills, one Exploration skill, one Observation skill. Interactions: Choose three from Bait, Gift, Provoke, Read, Touch.',
      Guardian:
        'Training: Strength in Traversal, Weakness in Deduction. Starting Skills: Two Traversal skills, one Exploration skill, one Observation skill. Interactions: Choose three from Explore, Feed, Play, Protect, Provoke.'
    };
    return desc[license] || '';
  }
}
