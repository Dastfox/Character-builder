import { Component, Input } from '@angular/core';

export interface Character {
  id?: number;
  name: string;
  description: string;
  license: string;
  strength: string;
  weakness: string;
  abilities: Record<string, string>;
  training: Record<string, { successes: number; failures: number }>;
  skills: string[];
  interactions: string[];
}

@Component({
  selector: 'character-sheet',
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.css'],
  standalone: false
})
export class CharacterSheetComponent {
  @Input() character!: Character;

  strengthAbility(c: Character): string {
    return c.strength ||
      (Object.entries(c.abilities).find(([_, v]) => v === 'd6')?.[0] || '');
  }

  weaknessAbility(c: Character): string {
    return c.weakness ||
      (Object.entries(c.abilities).find(([_, v]) => v === 'd4')?.[0] || '');
  }
}
