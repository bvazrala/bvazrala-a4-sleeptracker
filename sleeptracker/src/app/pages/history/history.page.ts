import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemGroup, IonItemOption, IonItemOptions, IonItemSliding,
  IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { SleepService } from '../../services/sleep.service';
import { FeedbackService } from '../../services/feedback.service';
import { SleepData } from '../../data/sleep-data';
import { OvernightSleepData } from '../../data/overnight-sleep-data';
import { StanfordSleepinessData } from '../../data/stanford-sleepiness-data';
import { dayLabel, formatDuration, formatTime, startOfDay } from '../../data/format';

type Filter = 'all' | 'sleep' | 'sleepiness';

interface DayGroup {
  label: string;
  entries: SleepData[];
}

/**
 * History tab: a 7-night chart plus a day-by-day timeline of both kinds of entries.
 * Entries can be deleted by swiping left or tapping them; every delete can be undone.
 */
@Component({
  selector: 'app-history',
  templateUrl: 'history.page.html',
  styleUrls: ['history.page.scss'],
  imports: [
    RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSegment, IonSegmentButton,
    IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItemGroup, IonItemDivider,
    IonItemSliding, IonItem, IonItemOptions, IonItemOption,
  ],
})
export class HistoryPage {
  readonly sleep = inject(SleepService);
  private feedback = inject(FeedbackService);
  private actionSheetCtrl = inject(ActionSheetController);

  readonly filter = signal<Filter>('all');

  readonly groups = computed<DayGroup[]>(() => {
    const filter = this.filter();
    const entries = this.sleep.allSleepData().filter(e =>
      filter === 'all'
      || (filter === 'sleep' && e instanceof OvernightSleepData)
      || (filter === 'sleepiness' && e instanceof StanfordSleepinessData));

    const groups: DayGroup[] = [];
    let currentKey = -1;
    for (const entry of entries) { // already sorted newest first
      const key = startOfDay(entry.timelineDate()).getTime();
      if (key !== currentKey) {
        groups.push({ label: dayLabel(entry.timelineDate()), entries: [] });
        currentKey = key;
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  });

  /** Chart scale: at least 10 hours tall so normal nights don't fill the whole chart. */
  readonly chartMaxHours = computed(() =>
    Math.max(10, ...this.sleep.last7Nights().map(b => b.hours ?? 0)));

  readonly formatDuration = formatDuration;
  readonly formatTime = formatTime;
  readonly sleepinessLabels = StanfordSleepinessData.ShortLabels;
  readonly qualityEmoji = OvernightSleepData.QualityEmoji;
  readonly qualityLabels = OvernightSleepData.QualityLabels;

  setFilter(value: unknown) {
    if (value === 'all' || value === 'sleep' || value === 'sleepiness') {
      this.filter.set(value);
    }
  }

  /** Template helpers: Angular templates can't use `instanceof`. */
  asNight(entry: SleepData): OvernightSleepData | null {
    return entry instanceof OvernightSleepData ? entry : null;
  }

  asSleepiness(entry: SleepData): StanfordSleepinessData | null {
    return entry instanceof StanfordSleepinessData ? entry : null;
  }

  roundValue(value: number): number {
    return Math.round(value);
  }

  barHeight(hours: number | null): string {
    return hours === null ? '0%' : `${Math.min(100, (hours / this.chartMaxHours()) * 100)}%`;
  }

  goalLinePosition(): string {
    return `${(8 / this.chartMaxHours()) * 100}%`;
  }

  async openEntry(entry: SleepData) {
    const night = this.asNight(entry);
    const sheet = await this.actionSheetCtrl.create({
      header: night ? `${night.durationString()} · ${night.timeRangeString()}` : entry.summaryString(),
      subHeader: night ? night.dateString() : `${entry.dateString()} at ${formatTime(entry.loggedAt)}`,
      buttons: [
        { text: 'Delete entry', role: 'destructive', icon: 'trash-outline', handler: () => { void this.delete(entry); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async delete(entry: SleepData, sliding?: IonItemSliding) {
    await sliding?.close();
    await this.sleep.remove(entry.id);
    await this.feedback.toast('Entry deleted', () => this.sleep.restore([entry]));
  }

  async clearAll() {
    const ok = await this.feedback.confirm(
      'Delete all data?',
      'This removes every night and sleepiness check-in you have logged.',
      'Delete all',
      true,
    );
    if (!ok) { return; }
    const removed = await this.sleep.clearAll();
    await this.feedback.toast(`Deleted ${removed.length} entries`, () => this.sleep.restore(removed));
  }

  async loadSample() {
    await this.sleep.loadSampleWeek();
    await this.feedback.toast('Added a sample week', async () => { await this.sleep.clearAll(); });
  }
}
