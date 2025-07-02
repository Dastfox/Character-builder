import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CharacterFormComponent } from './character-form.component';
import { ApiService } from './api.service';

@NgModule({
  declarations: [AppComponent, CharacterFormComponent],
  imports: [BrowserModule, FormsModule, HttpClientModule],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule {}
