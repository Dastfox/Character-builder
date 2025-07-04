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
  currentIndex = 0;
  answers: Record<string, string> = {};
  license = '';
  name = '';
  description = '';
  result: any | null = null;

  constructor(private api: ApiService) {}

  exportPdf() {
    if (!this.result) return;
    const { jsPDF } = (window as any);
    const doc = new jsPDF();
    const c = this.result;
    let y = 10;
    doc.text(`Name: ${c.name}`, 10, y);
    y += 10;
    doc.text(`Description: ${c.description}`, 10, y);
    y += 10;
    doc.text(`License: ${c.license}`, 10, y);
    y += 10;
    doc.text('Abilities:', 10, y);
    for (const a of ['Observation','Exploration','Deduction','Traversal']) {
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
    this.api.getScenarioQuestions().subscribe(q => {
      this.questions = q;
      this.autoAdvanceSingle();
    });
  }


  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  get currentOptions() {
    const q = this.currentQuestion;
    if (!q) {
      return [] as any[];
    }
    if (this.license && (q.skill || q.interaction)) {
      return q.options.filter((o: any) => o.license === this.license);
    }
    return q.options;
  }

  next() {
    const q = this.currentQuestion;
    if (!q) return;
    const opts = this.currentOptions;
    if (opts.length === 1) {
      this.answers[q.id] = opts[0].id;
    } else if (!this.answers[q.id]) {
      alert('Please select an option');
      return;
    }
    if (q.id === 'q4') {
      this.determineLicense();
    }
    this.currentIndex++;
    this.autoAdvanceSingle();
  }

  private autoAdvanceSingle() {
    while (
      this.currentQuestion &&
      this.currentOptions.length === 1 &&
      !this.answers[this.currentQuestion.id]
    ) {
      const q = this.currentQuestion;
      this.answers[q.id] = this.currentOptions[0].id;
      if (q.id === 'q4') {
        this.determineLicense();
      }
      this.currentIndex++;
    }
  }

  determineLicense() {
    const scores: Record<string, number> = { Archivist: 0, Diviner: 0, Fixer: 0, Guardian: 0 };
    for (const q of this.questions.slice(0, 4)) {
      const ans = this.answers[q.id];
      const opt = q.options.find((o: any) => o.id === ans);
      if (opt && opt.license) {
        scores[opt.license]++;
      }
    }
    this.license = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  finished() {
    return this.currentIndex >= this.questions.length;
  }


  submit() {
    const payload = { name: this.name, description: this.description, answers: this.answers };
    this.api.buildFromScenario(payload).subscribe({
      next: res => (this.result = res),
      error: err => alert('Error: ' + (err.error?.detail || 'unknown'))
    });
  }
}
