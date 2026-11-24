import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { SleepData } from '../data/sleep-data';
import { OvernightSleepData, OvernightSleepJSON } from '../data/overnight-sleep-data';
import { StanfordSleepinessData, SleepinessJSON } from '../data/stanford-sleepiness-data';
import { MS_PER_HOUR, isSameDay, startOfDay } from '../data/format';

/** Storage keys. The "v1" suffix lets the data format change later without breaking old saves. */
const ENTRIES_KEY = 'sleeptracker.entries.v1';
const ACTIVE_SLEEP_KEY = 'sleeptracker.activeSleepStart.v1';

export interface NightBar {
	label: string;        // "Mon"
	date: Date;
	hours: number | null; // null when that night wasn't logged
	isToday: boolean;
}

/**
 * Holds every logged entry and keeps it backed up with Capacitor Preferences.
 * Preferences uses localStorage in the browser and native key-value storage on iOS/Android,
 * so everything a user logs is still there after the app (or browser tab) is reloaded.
 */
@Injectable({
	providedIn: 'root'
})
export class SleepService {
	private readonly entries = signal<SleepData[]>([]);

	/** When "I'm going to bed" was tapped, or null if bedtime mode isn't running. */
	readonly activeSleepStart = signal<Date | null>(null);

	/** Every entry, newest first. */
	readonly allSleepData = computed(() =>
		[...this.entries()].sort((a, b) => b.timelineDate().getTime() - a.timelineDate().getTime()));

	readonly overnightData = computed(() =>
		this.allSleepData().filter((e): e is OvernightSleepData => e instanceof OvernightSleepData));

	readonly sleepinessData = computed(() =>
		this.allSleepData().filter((e): e is StanfordSleepinessData => e instanceof StanfordSleepinessData));

	/** Most recent night. */
	readonly lastNight = computed(() => this.overnightData()[0] ?? null);

	/** Average sleep over nights that ended in the last 7 days. */
	readonly weekAverageMs = computed(() => {
		const cutoff = startOfDay(new Date());
		cutoff.setDate(cutoff.getDate() - 6);
		const nights = this.overnightData().filter(n => n.sleepEnd >= cutoff);
		if (nights.length === 0) {
			return null;
		}
		return nights.reduce((sum, n) => sum + n.durationMs(), 0) / nights.length;
	});

	/** One bar per day for the last 7 days (oldest first), used by the History chart. */
	readonly last7Nights = computed<NightBar[]>(() => {
		const today = new Date();
		const bars: NightBar[] = [];
		for (let i = 6; i >= 0; i--) {
			const day = new Date(today);
			day.setDate(today.getDate() - i);
			const nights = this.overnightData().filter(n => isSameDay(n.sleepEnd, day));
			const totalMs = nights.reduce((sum, n) => sum + n.durationMs(), 0);
			bars.push({
				label: day.toLocaleDateString('en-US', { weekday: 'short' }),
				date: day,
				hours: nights.length ? totalMs / MS_PER_HOUR : null,
				isToday: i === 0,
			});
		}
		return bars;
	});

	/** Average sleepiness rating over the last 7 days. */
	readonly sleepinessWeekAverage = computed(() => {
		const cutoff = startOfDay(new Date());
		cutoff.setDate(cutoff.getDate() - 6);
		const recent = this.sleepinessData().filter(s => s.loggedAt >= cutoff);
		if (recent.length === 0) {
			return null;
		}
		return recent.reduce((sum, s) => sum + s.loggedValue, 0) / recent.length;
	});

	/** Today's sleepiness check-ins, newest first. */
	readonly todaysSleepiness = computed(() =>
		this.sleepinessData().filter(s => isSameDay(s.loggedAt, new Date())));

	/** Resolves once saved data has been read from storage. */
	readonly ready: Promise<void>;

	constructor() {
		this.ready = this.load();
	}

	// ---------------------------------------------------------------- logging

	public async logOvernightData(sleepData: OvernightSleepData) {
		this.entries.update(list => [...list, sleepData]);
		await this.saveEntries();
	}

	public async logSleepinessData(sleepData: StanfordSleepinessData) {
		this.entries.update(list => [...list, sleepData]);
		await this.saveEntries();
	}

	/** Swaps one entry for another (used when a night is logged twice for the same morning). */
	public async replace(oldId: string, newEntry: SleepData) {
		this.entries.update(list => [...list.filter(e => e.id !== oldId), newEntry]);
		await this.saveEntries();
	}

	public async remove(id: string) {
		this.entries.update(list => list.filter(e => e.id !== id));
		await this.saveEntries();
	}

	/** Puts back entries that were removed (powers the "Undo" buttons). */
	public async restore(entries: SleepData[]) {
		const ids = new Set(entries.map(e => e.id));
		this.entries.update(list => [...list.filter(e => !ids.has(e.id)), ...entries]);
		await this.saveEntries();
	}

	public async clearAll(): Promise<SleepData[]> {
		const removed = this.entries();
		this.entries.set([]);
		await this.saveEntries();
		return removed;
	}

	/** The night (if any) that ended on the same calendar day as `wakeUp`. */
	public findNightEndingOn(wakeUp: Date): OvernightSleepData | undefined {
		return this.overnightData().find(n => isSameDay(n.sleepEnd, wakeUp));
	}

	// ---------------------------------------------------------- bedtime mode

	public async startSleep(at: Date = new Date()) {
		this.activeSleepStart.set(at);
		await Preferences.set({ key: ACTIVE_SLEEP_KEY, value: at.toISOString() });
	}

	public async clearActiveSleep() {
		this.activeSleepStart.set(null);
		await Preferences.remove({ key: ACTIVE_SLEEP_KEY });
	}

	// ------------------------------------------------------------ sample data

	/** Fills an empty app with a believable week so the History screen can be explored. */
	public async loadSampleWeek() {
		const bedtimes = [[23, 40], [0, 55], [23, 10], [1, 30], [22, 50], [0, 20], [23, 35]];
		const sleepHours = [7.4, 6.1, 8.0, 5.3, 8.6, 6.8, 7.2];
		const qualities = [4, 3, 5, 2, 5, 3, 4];
		const samples: SleepData[] = [];

		for (let i = 0; i < 7; i++) {
			const daysAgo = 7 - i; // the night that ended `daysAgo - 1` days ago
			const [h, m] = bedtimes[i];
			const bed = new Date();
			bed.setDate(bed.getDate() - daysAgo + (h < 12 ? 1 : 0));
			bed.setHours(h, m, 0, 0);
			const wake = new Date(bed.getTime() + sleepHours[i] * MS_PER_HOUR);
			if (wake > new Date()) {
				continue;
			}
			samples.push(new OvernightSleepData(bed, wake, qualities[i], i === 3 ? 'Up late finishing a problem set' : ''));

			const morning = new Date(wake.getTime() + 0.5 * MS_PER_HOUR);
			const afternoon = new Date(wake);
			afternoon.setHours(14, 30 + i, 0, 0);
			samples.push(new StanfordSleepinessData(Math.min(7, 3 + (qualities[i] < 3 ? 2 : 0)), morning, ['Before coffee']));
			samples.push(new StanfordSleepinessData(qualities[i] < 3 ? 5 : 3, afternoon, ['In class']));
		}
		await this.restore(samples);
	}

	// ---------------------------------------------------------------- storage

	private async load() {
		try {
			const { value } = await Preferences.get({ key: ENTRIES_KEY });
			const raw: unknown = value ? JSON.parse(value) : [];
			const parsed = Array.isArray(raw)
				? raw.map(item => SleepService.fromJSON(item)).filter((e): e is SleepData => e !== null)
				: [];
			this.entries.set(parsed);

			const active = await Preferences.get({ key: ACTIVE_SLEEP_KEY });
			if (active.value) {
				const start = new Date(active.value);
				this.activeSleepStart.set(isNaN(start.getTime()) ? null : start);
			}
		} catch (err) {
			console.error('Could not load saved sleep data', err);
			this.entries.set([]);
		}
	}

	private async saveEntries() {
		const json = JSON.stringify(this.entries().map(e => e.toJSON()));
		await Preferences.set({ key: ENTRIES_KEY, value: json });
	}

	/** Rebuilds the right class from a stored object. Skips anything malformed. */
	private static fromJSON(item: unknown): SleepData | null {
		if (!item || typeof item !== 'object') {
			return null;
		}
		const kind = (item as { kind?: unknown }).kind;
		let entry: SleepData | null = null;
		if (kind === 'overnight') {
			entry = OvernightSleepData.fromJSON(item as OvernightSleepJSON);
			const night = entry as OvernightSleepData;
			if (isNaN(night.sleepStart.getTime()) || isNaN(night.sleepEnd.getTime())) {
				return null;
			}
		} else if (kind === 'sleepiness') {
			entry = StanfordSleepinessData.fromJSON(item as SleepinessJSON);
			const value = (entry as StanfordSleepinessData).loggedValue;
			if (!(value >= 1 && value <= 7)) {
				return null;
			}
		}
		if (entry && isNaN(entry.loggedAt.getTime())) {
			return null;
		}
		return entry;
	}
}
