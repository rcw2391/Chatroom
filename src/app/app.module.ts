import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from './auth.service';
import { RoomComponent } from './room/room.component';

@NgModule({
  declarations: [
    AppComponent,
    RoomComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }
