import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alarmOutline, bedOutline, cafe, cafeOutline, checkmarkCircle, closeCircleOutline, moon, moonOutline,
  notificationsOutline, sparklesOutline, statsChart, statsChartOutline, sunnyOutline, timeOutline, trashOutline,
} from 'ionicons/icons';
import { ReminderService } from './services/reminder.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private reminders = inject(ReminderService);

  constructor() {
    // Standalone Ionic needs every icon used in the templates registered once.
    addIcons({
      alarmOutline, bedOutline, cafe, cafeOutline, checkmarkCircle, closeCircleOutline, moon, moonOutline,
      notificationsOutline, sparklesOutline, statsChart, statsChartOutline, sunnyOutline, timeOutline, trashOutline,
    });
    void this.reminders.init();
  }
}
