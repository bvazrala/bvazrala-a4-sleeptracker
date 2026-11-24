import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonDatetime,
  IonDatetimeButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonText, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { SleepService } from '../../services/sleep.service';
import { FeedbackService } from '../../services/feedback.service';
import { OvernightSleepData } from '../../data/overnight-sleep-data';
import { MS_PER_HOUR, formatDuration, formatTime, toLocalISO } from '../../data/format';

/**
 * Sleep tab. Two ways to log a night:
 *  1. Bedtime mode: tap "I'm going to bed" at night, then "I'm awake" in the morning.
 *  2. Log it in the morning: pick bedtime + wake-up time (pre-filled with sensible guesses).
 * Bedtime mode feeds into the same form, so the person always reviews before saving.
 */
@Component({
  selector: 'app-sleep',
  templateUrl: 'sleep.page.html',
  styleUrls: ['sleep.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonDatetime, IonDatetimeButton, IonModal,
    IonTextarea, IonText,
  ],
})
export class SleepPage implements OnInit, OnDestroy {
  readonly sleep = inject(SleepService);
  private feedback = inject(FeedbackService);

  @ViewChild('logCard', { read: ElementRef }) logCard?: ElementRef<HTMLElement>;

  // Form state
  bedISO = '';
  wakeISO = '';
  quality: number | null = null;
  note = '';
  maxISO = toLocalISO(new Date());
  /** True after "I'm awake" pre-filled the form from bedtime mode. */
  fromBedtimeMode = false;

  readonly qualityOptions = [1, 2, 3, 4, 5].map(value => ({
    value,
    emoji: OvernightSleepData.QualityEmoji[value],
    label: OvernightSleepData.QualityLabels[value],
  }));

  /** Ticks every 30 s so "Sleeping for 2h 03m" stays current. */
  readonly now = signal(new Date());
  private clock?: ReturnType<typeof setInterval>;

  readonly formatDuration = formatDuration;
  readonly formatTime = formatTime;

  ngOnInit() {
    this.resetForm();
    this.clock = setInterval(() => this.now.set(new Date()), 30_000);
  }

  ngOnDestroy() {
    clearInterval(this.clock);
  }

  ionViewWillEnter() {
    this.now.set(new Date());
    this.maxISO = toLocalISO(new Date());
  }

  get greeting(): string {
    const hour = this.now().getHours();
    if (hour < 5) { return 'Up late?'; }
    if (hour < 12) { return 'Good morning'; }
    if (hour < 18) { return 'Good afternoon'; }
    return 'Good evening';
  }

  // ------------------------------------------------------------- validation

  get formDurationMs(): number {
    return new Date(this.wakeISO).getTime() - new Date(this.bedISO).getTime();
  }

  /** Problems that block saving. */
  get formError(): string | null {
    if (!this.bedISO || !this.wakeISO) {
      return 'Pick a bedtime and a wake-up time.';
    }
    const ms = this.formDurationMs;
    if (isNaN(ms)) {
      return 'Pick a bedtime and a wake-up time.';
    }
    if (ms === 0) {
      return 'Bedtime and wake-up time are the same. Adjust one of them.';
    }
    if (ms < 0) {
      return 'Wake-up time needs to be after bedtime. Check the dates.';
    }
    if (ms > 20 * MS_PER_HOUR) {
      return 'That\'s more than 20 hours. Check the dates.';
    }
    if (new Date(this.wakeISO).getTime() > Date.now() + 60_000) {
      return 'Wake-up time can\'t be in the future.';
    }
    return null;
  }

  /** Unusual but allowed values: shown as a gentle double-check. */
  get formWarning(): string | null {
    const ms = this.formDurationMs;
    if (this.formError || isNaN(ms)) {
      return null;
    }
    if (ms < MS_PER_HOUR) {
      return 'Under an hour. Was that a nap? Double-check the times.';
    }
    if (ms > 13 * MS_PER_HOUR) {
      return 'That\'s a long sleep. Double-check the times.';
    }
    return null;
  }

  // ------------------------------------------------------------- form input

  setBed(value: string | string[] | null | undefined) {
    if (typeof value === 'string') { this.bedISO = value; }
  }

  setWake(value: string | string[] | null | undefined) {
    if (typeof value === 'string') { this.wakeISO = value; }
  }

  selectQuality(value: number) {
    this.quality = this.quality === value ? null : value; // tap again to clear
    void this.feedback.tap();
  }

  // ----------------------------------------------------------- bedtime mode

  async goToBed() {
    await this.sleep.startSleep();
    void this.feedback.tap();
    await this.feedback.toast('Good night 🌙 Tap "I\'m awake" when you get up.', () => this.sleep.clearActiveSleep());
  }

  /** Fills the form from bedtime mode so the person can rate the night and save. */
  wakeUp() {
    const start = this.sleep.activeSleepStart();
    if (!start) { return; }
    const now = new Date();
    this.maxISO = toLocalISO(now);
    this.bedISO = toLocalISO(start);
    this.wakeISO = toLocalISO(now);
    this.fromBedtimeMode = true;
    this.logCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async cancelBedtime() {
    const start = this.sleep.activeSleepStart();
    await this.sleep.clearActiveSleep();
    this.fromBedtimeMode = false;
    await this.feedback.toast('Bedtime cancelled', async () => {
      if (start) { await this.sleep.startSleep(start); }
    });
  }

  // ------------------------------------------------------------------- save

  async save() {
    if (this.formError) { return; }
    const bed = new Date(this.bedISO);
    const wake = new Date(this.wakeISO);

    // The assignment assumes one night per day, so offer to replace rather than duplicate.
    const existing = this.sleep.findNightEndingOn(wake);
    if (existing) {
      const replace = await this.feedback.confirm(
        'Replace this night?',
        `You already logged ${existing.durationString()} (${existing.timeRangeString()}) for that morning.`,
        'Replace',
      );
      if (!replace) { return; }
    }

    const entry = new OvernightSleepData(bed, wake, this.quality, this.note.trim());
    if (existing) {
      await this.sleep.replace(existing.id, entry);
    } else {
      await this.sleep.logOvernightData(entry);
    }

    const activeStart = this.fromBedtimeMode ? this.sleep.activeSleepStart() : null;
    if (activeStart) {
      await this.sleep.clearActiveSleep();
    }

    void this.feedback.tap();
    this.resetForm();
    await this.feedback.toast(`Saved ${entry.durationString()} of sleep`, async () => {
      if (existing) {
        await this.sleep.replace(entry.id, existing);
      } else {
        await this.sleep.remove(entry.id);
      }
      if (activeStart) {
        await this.sleep.startSleep(activeStart);
      }
    });
  }

  /** Default guess for logging in the morning: in bed 11:00 PM, up at 7:00 AM (or now, if earlier). */
  resetForm() {
    const now = new Date();
    const wake = new Date(now);
    wake.setHours(7, 0, 0, 0);
    if (wake > now) {
      wake.setTime(now.getTime());
    }
    const bed = new Date(wake);
    bed.setDate(wake.getDate() - 1);
    bed.setHours(23, 0, 0, 0);

    this.maxISO = toLocalISO(now);
    this.bedISO = toLocalISO(bed);
    this.wakeISO = toLocalISO(wake);
    this.quality = null;
    this.note = '';
    this.fromBedtimeMode = false;
  }
}
