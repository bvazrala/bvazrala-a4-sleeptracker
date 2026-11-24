import { SleepData, SleepDataJSON } from './sleep-data';
import { formatDuration, formatTime } from './format';

export interface OvernightSleepJSON extends SleepDataJSON {
	kind: 'overnight';
	sleepStart: string; // ISO string
	sleepEnd: string;   // ISO string
	quality: number | null;
}

/** One night of sleep: when the person went to bed, when they woke up, and how it felt. */
export class OvernightSleepData extends SleepData {
	/** Optional 1-5 rating of how restful the night felt. Index 0 is unused. */
	public static QualityLabels = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'];
	public static QualityEmoji = ['', '😫', '😕', '😐', '🙂', '😄'];

	sleepStart: Date;
	sleepEnd: Date;
	quality: number | null;

	constructor(sleepStart: Date, sleepEnd: Date, quality: number | null = null, note: string = '') {
		super();
		this.sleepStart = sleepStart;
		this.sleepEnd = sleepEnd;
		this.quality = quality;
		this.note = note;
	}

	durationMs(): number {
		return this.sleepEnd.getTime() - this.sleepStart.getTime();
	}

	/** e.g. "7h 32m" */
	durationString(): string {
		return formatDuration(this.durationMs());
	}

	/** e.g. "11:41 PM → 7:13 AM" */
	timeRangeString(): string {
		return `${formatTime(this.sleepStart)} → ${formatTime(this.sleepEnd)}`;
	}

	override summaryString(): string {
		const difference_ms = this.durationMs();
		return Math.floor(difference_ms / (1000 * 60 * 60)) + ' hours, ' + Math.floor(difference_ms / (1000 * 60) % 60) + ' minutes.';
	}

	override dateString(): string {
		return 'Night of ' + this.sleepStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	/** A night is filed under the morning the person woke up. */
	override timelineDate(): Date {
		return this.sleepEnd;
	}

	override toJSON(): OvernightSleepJSON {
		return {
			...super.toJSON(),
			kind: 'overnight',
			sleepStart: this.sleepStart.toISOString(),
			sleepEnd: this.sleepEnd.toISOString(),
			quality: this.quality,
		};
	}

	static fromJSON(json: OvernightSleepJSON): OvernightSleepData {
		const entry = new OvernightSleepData(new Date(json.sleepStart), new Date(json.sleepEnd), json.quality ?? null, json.note ?? '');
		entry.id = json.id;
		entry.loggedAt = new Date(json.loggedAt);
		return entry;
	}
}
