import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';

@Component({
  selector: 'scenario-form',
  templateUrl: './scenario-form.component.html',
  styleUrls: ['./character-form.component.css'],
  standalone: false
})
export class ScenarioFormComponent implements OnInit {
  questions: any[] = [];
  answers: Record<string, string> = {};
  name = '';
  description = '';
  result: any | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getScenarioQuestions().subscribe(q => (this.questions = q));
  }

  submit() {
    const payload = { name: this.name, description: this.description, answers: this.answers };
    this.api.buildFromScenario(payload).subscribe({
      next: res => (this.result = res),
      error: err => alert('Error: ' + (err.error?.detail || 'unknown'))
    });
  }
}
