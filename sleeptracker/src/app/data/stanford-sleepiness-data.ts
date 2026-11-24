/* from the Stanford Sleepiness Scale */
/* https://web.stanford.edu/~dement/sss.html */

import { SleepData, SleepDataJSON } from './sleep-data';

export interface SleepinessJSON extends SleepDataJSON {
	kind: 'sleepiness';
	value: number; // 1-7
	tags: string[];
}

/** One sleepiness check-in on the 1-7 Stanford Sleepiness Scale. */
export class StanfordSleepinessData extends SleepData {
	public static ScaleValues = [undefined,//Sleepiness scale starts at 1
	'Feeling active, vital, alert, or wide awake', //1
	'Functioning at high levels, but not at peak; able to concentrate', //2
	'Awake, but relaxed; responsive but not fully alert', //3
	'Somewhat foggy, let down', //4
	'Foggy; losing interest in remaining awake; slowed down', //5
	'Sleepy, woozy, fighting sleep; prefer to lie down', //6
	'No longer fighting sleep, sleep onset soon; having dream-like thoughts']; //7

	/** Short names so the scale can be scanned quickly on a small screen. */
	public static ShortLabels = ['', 'Wide awake', 'Alert', 'Relaxed', 'Foggy', 'Slowing down', 'Fighting sleep', 'Nodding off'];

	loggedValue: number;
	/** Optional context such as "After coffee" or "In class". */
	tags: string[];

	constructor(loggedValue: number, loggedAt: Date = new Date(), tags: string[] = [], note: string = '') {
		super();
		this.loggedValue = loggedValue;
		this.loggedAt = loggedAt;
		this.tags = tags;
		this.note = note;
	}

	shortLabel(): string {
		return StanfordSleepinessData.ShortLabels[this.loggedValue] ?? '';
	}

	override summaryString(): string {
		return this.loggedValue + ': ' + StanfordSleepinessData.ScaleValues[this.loggedValue];
	}

	override toJSON(): SleepinessJSON {
		return {
			...super.toJSON(),
			kind: 'sleepiness',
			value: this.loggedValue,
			tags: this.tags,
		};
	}

	static fromJSON(json: SleepinessJSON): StanfordSleepinessData {
		const entry = new StanfordSleepinessData(json.value, new Date(json.loggedAt), json.tags ?? [], json.note ?? '');
		entry.id = json.id;
		return entry;
	}
}
