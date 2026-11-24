import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const SETTINGS_KEY = 'sleeptracker.reminders.v1';
const FIRST_REMINDER_ID = 100; // IDs 100-199 are the recurring check-ins
const TEST_REMINDER_ID = 999;
const DAYS_AHEAD = 3;          // schedule this many days of reminders at a time

export interface ReminderSettings {
	enabled: boolean;
	hours: number[]; // 24-hour clock, e.g. [10, 14, 18]
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * NATIVE DEVICE RESOURCE: local notifications (Capacitor LocalNotifications plugin).
 *
 * Experience sampling works best when the app asks the person to check in, rather than
 * relying on them to remember. This service schedules "How sleepy are you?" notifications at
 * the times the user picks; tapping one opens the Sleepiness tab ready to log.
 *
 * On iOS/Android these are real system notifications. In a desktop browser Capacitor uses the
 * Web Notifications API, which only fires while the app's tab is open.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
	private router = inject(Router);

	readonly settings = signal<ReminderSettings>({ enabled: false, hours: [10, 14, 18] });
	readonly permission = signal<PermissionState>('prompt');

	/** Called once from AppComponent when the app starts. */
	async init() {
		try {
			const { value } = await Preferences.get({ key: SETTINGS_KEY });
			if (value) {
				const saved = JSON.parse(value) as Partial<ReminderSettings>;
				this.settings.set({
					enabled: !!saved.enabled,
					hours: Array.isArray(saved.hours) ? saved.hours.filter(h => typeof h === 'number') : [10, 14, 18],
				});
			}
		} catch (err) {
			console.warn('Could not read reminder settings', err);
		}

		await this.refreshPermission();

		// Tapping a notification takes the person straight to the sleepiness logger.
		try {
			await LocalNotifications.addListener('localNotificationActionPerformed', () => {
				window.focus();
				void this.router.navigateByUrl('/tabs/sleepiness');
			});
		} catch (err) {
			console.warn('Notifications are not supported here', err);
		}

		if (this.settings().enabled && this.permission() === 'granted') {
			await this.reschedule();
		}
	}

	/** Turns reminders on or off. Returns false if the user blocked notification permission. */
	async setEnabled(enabled: boolean): Promise<boolean> {
		if (enabled && !(await this.ensurePermission())) {
			return false;
		}
		this.settings.update(s => ({ ...s, enabled }));
		await this.saveAndReschedule();
		return true;
	}

	async toggleHour(hour: number) {
		this.settings.update(s => {
			const hours = s.hours.includes(hour) ? s.hours.filter(h => h !== hour) : [...s.hours, hour];
			return { ...s, hours: hours.sort((a, b) => a - b) };
		});
		await this.saveAndReschedule();
	}

	/** Fires a reminder 5 seconds from now so the feature can be tried (and shown in the demo). */
	async sendTestReminder(): Promise<boolean> {
		if (!(await this.ensurePermission())) {
			return false;
		}
		await LocalNotifications.schedule({
			notifications: [{
				id: TEST_REMINDER_ID,
				title: 'Sleepiness check-in 😴',
				body: 'How sleepy do you feel right now? Tap to log it in 5 seconds.',
				schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
			}],
		});
		return true;
	}

	private async saveAndReschedule() {
		await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(this.settings()) });
		await this.reschedule();
	}

	/** Cancels the old schedule and books the next few days of reminders. */
	private async reschedule() {
		try {
			const pending = await LocalNotifications.getPending();
			const ours = pending.notifications.filter(n => n.id >= FIRST_REMINDER_ID && n.id < FIRST_REMINDER_ID + 100);
			if (ours.length) {
				await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
			}

			const { enabled, hours } = this.settings();
			if (!enabled || hours.length === 0 || this.permission() !== 'granted') {
				return;
			}

			const now = new Date();
			const notifications = [];
			let id = FIRST_REMINDER_ID;
			for (let day = 0; day < DAYS_AHEAD; day++) {
				for (const hour of hours) {
					const at = new Date(now);
					at.setDate(now.getDate() + day);
					at.setHours(hour, 0, 0, 0);
					if (at > now) {
						notifications.push({
							id: id++,
							title: 'Sleepiness check-in 😴',
							body: 'How sleepy do you feel right now? Logging takes 5 seconds.',
							schedule: { at, allowWhileIdle: true },
						});
					}
				}
			}
			if (notifications.length) {
				await LocalNotifications.schedule({ notifications });
			}
		} catch (err) {
			console.warn('Could not schedule reminders', err);
		}
	}

	private async ensurePermission(): Promise<boolean> {
		try {
			let { display } = await LocalNotifications.checkPermissions();
			if (display !== 'granted' && display !== 'denied') {
				({ display } = await LocalNotifications.requestPermissions());
			}
			this.permission.set(display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt');
			return display === 'granted';
		} catch {
			this.permission.set('unsupported');
			return false;
		}
	}

	private async refreshPermission() {
		try {
			const { display } = await LocalNotifications.checkPermissions();
			this.permission.set(display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt');
		} catch {
			this.permission.set('unsupported');
		}
	}
}
