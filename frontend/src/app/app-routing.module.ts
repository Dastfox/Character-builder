import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CharacterFormComponent } from './character-form.component';
import { ScenarioFormComponent } from './scenario-form.component';
import { SkillLookupComponent } from './skill-lookup.component';

const routes: Routes = [
  { path: '', component: CharacterFormComponent },
  { path: 'scenario', component: ScenarioFormComponent },
  { path: 'skills', component: SkillLookupComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
