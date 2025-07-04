import { Component, Input } from '@angular/core';

export interface Character {
  id?: number;
  name: string;
  description: string;
  license: string;
  abilities: Record<string, string>;
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
    const entry = Object.entries(c.abilities).find(([_, v]) => v === 'd6');
    return entry ? entry[0] : '';
  }

  weaknessAbility(c: Character): string {
    const entry = Object.entries(c.abilities).find(([_, v]) => v === 'd4');
    return entry ? entry[0] : '';
  }
}
