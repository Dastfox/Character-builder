import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CharacterFormComponent } from './character-form.component';
import { SkillLookupComponent } from './skill-lookup.component';
import { AppRoutingModule } from './app-routing.module';
import { ApiService } from './api.service';

@NgModule({
  declarations: [AppComponent, CharacterFormComponent, SkillLookupComponent],
  bootstrap: [AppComponent],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  providers: [ApiService, provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule {}
