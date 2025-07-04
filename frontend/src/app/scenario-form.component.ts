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
  licenseDesc = '';
  name = '';
  description = '';
  result: any | null = null;

  licenseDescriptions: Record<string, string> = {
    Archivist:
      'Training: Strength in Observation, Weakness in Traversal. Starting Skills: Two Observation skills, one Deduction skill, one Exploration skill. Interactions: Choose three from Diagnose, Sketch, Study, Take Samples, Talk.',
    Diviner:
      'Training: Strength and Weakness determined by Fate. Starting Skills: Two Deduction skills, one Observation skill, one Exploration skill. Interactions: Choose three from Gift, Read, Sing, Soothe, Touch.',
    Fixer:
      'Training: Strength in Deduction, Weakness in Traversal. Starting Skills: Two Deduction skills, one Exploration skill, one Observation skill. Interactions: Choose three from Bait, Gift, Provoke, Read, Touch.',
    Guardian:
      'Training: Strength in Traversal, Weakness in Deduction. Starting Skills: Two Traversal skills, one Exploration skill, one Observation skill. Interactions: Choose three from Explore, Feed, Play, Protect, Provoke.'
  };

  constructor(private api: ApiService) {}

  exportPdf() {
    if (!this.result) return;
    // jsPDF imported from CDN. The UMD build exposes `window.jspdf.jsPDF`.
    const { jsPDF } = (window as any).jspdf || (window as any);
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
    this.api.getScenarioQuestions().subscribe(q => (this.questions = q));
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
    if (!this.answers[q.id]) {
      alert('Please select an option');
      return;
    }
    if (q.id === 'q4') {
      this.determineLicense();
    }
    this.currentIndex++;
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
    this.licenseDesc = this.licenseDescriptions[this.license];
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
