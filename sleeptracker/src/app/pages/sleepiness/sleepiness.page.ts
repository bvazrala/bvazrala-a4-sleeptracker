import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonContent, IonDatetime,
  IonDatetimeButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonNote, IonText, IonTextarea, IonTitle,
  IonToggle, IonToolbar,
} from '@ionic/angular/standalone';
import { SleepService } from '../../services/sleep.service';
import { FeedbackService } from '../../services/feedback.service';
import { ReminderService } from '../../services/reminder.service';
import { StanfordSleepinessData } from '../../data/stanford-sleepiness-data';
import { formatTime, toLocalISO } from '../../data/format';

/**
 * Sleepiness tab: one tap on the 1-7 Stanford Sleepiness Scale, then "Log".
 * Time defaults to "now" (the common case for experience sampling) but can be changed.
 * Also holds the check-in reminder settings (local notifications).
 */
@Component({
  selector: 'app-sleepiness',
  templateUrl: 'sleepiness.page.html',
  styleUrls: ['sleepiness.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonList, IonItem, IonLabel, IonIcon, IonButton, IonChip, IonTextarea, IonDatetime, IonDatetimeButton,
    IonModal, IonToggle, IonNote, IonText,
  ],
})
export class SleepinessPage {
  readonly sleep = inject(SleepService);
  readonly reminders = inject(ReminderService);
  private feedback = inject(FeedbackService);

  readonly scale = [1, 2, 3, 4, 5, 6, 7].map(value => ({
    value,
    short: StanfordSleepinessData.ShortLabels[value],
    full: StanfordSleepinessData.ScaleValues[value] ?? '',
  }));

  readonly tagOptions = [
    'Just woke up', 'Before coffee', 'After coffee', 'After a nap', 'After a meal', 'In class', 'Studying', 'After exercise',
  ];

  readonly reminderHours = [9, 11, 13, 15, 17, 19, 21];

  selected: number | null = null;
  tags: string[] = [];
  note = '';
  whenISO = toLocalISO(new Date());
  maxISO = toLocalISO(new Date());
  /** False until the person changes the time; then we keep their choice instead of "now". */
  private timeChanged = false;

  readonly formatTime = formatTime;

  ionViewWillEnter() {
    this.maxISO = toLocalISO(new Date());
    if (!this.timeChanged) {
      this.whenISO = this.maxISO;
    }
  }

  select(value: number) {
    this.selected = value;
    void this.feedback.tap();
  }

  toggleTag(tag: string) {
    this.tags = this.tags.includes(tag) ? this.tags.filter(t => t !== tag) : [...this.tags, tag];
  }

  setWhen(value: string | string[] | null | undefined) {
    if (typeof value === 'string') {
      this.whenISO = value;
      this.timeChanged = true;
    }
  }

  async save() {
    if (this.selected === null) { return; }
    const when = this.timeChanged ? new Date(this.whenISO) : new Date();
    if (when.getTime() > Date.now() + 60_000) {
      await this.feedback.toast('That time is in the future. Pick an earlier time.');
      return;
    }
    const entry = new StanfordSleepinessData(this.selected, when, [...this.tags], this.note.trim());
    await this.sleep.logSleepinessData(entry);
    void this.feedback.tap();
    this.reset();
    await this.feedback.toast(`Logged ${entry.loggedValue} · ${entry.shortLabel()}`, () => this.sleep.remove(entry.id));
  }

  reset() {
    this.selected = null;
    this.tags = [];
    this.note = '';
    this.timeChanged = false;
    this.whenISO = toLocalISO(new Date());
    this.maxISO = this.whenISO;
  }

  // -------------------------------------------------------------- reminders

  hourLabel(hour: number): string {
    const suffix = hour < 12 ? 'AM' : 'PM';
    return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
  }

  async onRemindersToggle(event: CustomEvent<{ checked: boolean }>) {
    const toggle = event.target as HTMLIonToggleElement;
    const ok = await this.reminders.setEnabled(event.detail.checked);
    if (!ok) {
      toggle.checked = false;
      await this.feedback.toast('Notifications are blocked. Allow them in your browser or phone settings.');
    }
  }

  async toggleHour(hour: number) {
    await this.reminders.toggleHour(hour);
  }

  async testReminder() {
    const ok = await this.reminders.sendTestReminder();
    await this.feedback.toast(ok
      ? 'Test reminder coming in 5 seconds…'
      : 'Notifications are blocked. Allow them in your browser or phone settings.');
  }
}
