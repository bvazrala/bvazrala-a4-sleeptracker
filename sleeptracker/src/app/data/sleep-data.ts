/** Fields every saved entry has. Used when writing entries to storage. */
export interface SleepDataJSON {
	kind: string;
	id: string;
	loggedAt: string; // ISO string
	note?: string;
}

/**
 * Base class for any piece of logged sleep data.
 * OvernightSleepData and StanfordSleepinessData extend this class, which lets
 * the History tab show both kinds of entries in one timeline.
 */
export class SleepData {
	id: string;
	loggedAt: Date;
	note: string;

	constructor() {
		// Assign a random (unique) ID so entries can be deleted, replaced, or restored by ID.
		// (The starter code used the `nanoid` package, but it was never listed in package.json.)
		this.id = SleepData.generateId();
		this.loggedAt = new Date();
		this.note = '';
	}

	static generateId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
	}

	summaryString(): string {
		return 'Unknown sleep data';
	}

	dateString(): string {
		return this.loggedAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	/** The moment used to sort and group this entry in the History timeline. */
	timelineDate(): Date {
		return this.loggedAt;
	}

	/** Plain-object version of this entry, safe to JSON.stringify into storage. */
	toJSON(): SleepDataJSON {
		return {
			kind: 'unknown',
			id: this.id,
			loggedAt: this.loggedAt.toISOString(),
			note: this.note,
		};
	}
}
