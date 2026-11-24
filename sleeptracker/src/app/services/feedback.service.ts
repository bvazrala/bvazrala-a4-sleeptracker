import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Shared confirmation UI so every screen behaves the same way:
 *  - toast(): short message at the bottom, optionally with an "Undo" button (the "uh-oh" button)
 *  - confirm(): an alert for actions that are hard to undo (error prevention)
 *  - tap(): a light haptic tick on phones (does nothing in desktop browsers)
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
	private toastCtrl = inject(ToastController);
	private alertCtrl = inject(AlertController);
	private currentToast: HTMLIonToastElement | null = null;

	async toast(message: string, undo?: () => void | Promise<void>) {
		await this.currentToast?.dismiss();
		const toast = await this.toastCtrl.create({
			message,
			duration: undo ? 5000 : 2500,
			position: 'bottom',
			positionAnchor: 'app-tab-bar',
			cssClass: 'app-toast',
			buttons: undo ? [{ text: 'Undo', role: 'cancel', handler: () => { void undo(); } }] : [],
		});
		this.currentToast = toast;
		await toast.present();
	}

	async confirm(header: string, message: string, confirmText: string, destructive = false): Promise<boolean> {
		const alert = await this.alertCtrl.create({
			header,
			message,
			buttons: [
				{ text: 'Cancel', role: 'cancel' },
				{ text: confirmText, role: destructive ? 'destructive' : 'confirm' },
			],
		});
		await alert.present();
		const { role } = await alert.onDidDismiss();
		return role === 'confirm' || role === 'destructive';
	}

	async tap() {
		try {
			await Haptics.impact({ style: ImpactStyle.Light });
		} catch {
			// Haptics aren't available in every browser; that's fine.
		}
	}
}
