import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { CharacterFormComponent } from './character-form.component';
import { ScenarioFormComponent } from './scenario-form.component';
import { SkillLookupComponent } from './skill-lookup.component';
import { CharacterSheetComponent } from './character-sheet.component';
import { AppRoutingModule } from './app-routing.module';
import { ApiService } from './api.service';

@NgModule({
  declarations: [
    AppComponent,
    CharacterFormComponent,
    ScenarioFormComponent,
    SkillLookupComponent,
    CharacterSheetComponent
  ],
  bootstrap: [AppComponent],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  providers: [ApiService]
})
export class AppModule {}
