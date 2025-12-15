// src/lib/server/notifications/broadcaster.ts
export interface NotificationRecord {
	id: number;
	recipientID: number; // This should match your database schema
	title: string;
	message: string;
	type: 'LeaveStatus' | 'MedicalReminder' | 'SystemAlert' | 'General' | 'Attendance';
	relatedLeaveID?: number | null;
	triggerDate?: Date | null;
	sentAt?: Date | null;
	sentInApp?: boolean;
	sentEmail?: boolean;
	isRead: boolean;
	createdAt?: Date | null;
	link?: string;
}

type Callback = (payload: NotificationRecord) => void;

// Use Map<string, Set<Callback>> if user IDs are strings
const subscribers = new Map<number, Set<Callback>>();

export function subscribe(userId: number, cb: Callback) {
	if (!subscribers.has(userId)) {
		subscribers.set(userId, new Set());
	}
	subscribers.get(userId)!.add(cb);
	return () => unsubscribe(userId, cb);
}

export function unsubscribe(userId: number, cb: Callback) {
	const set = subscribers.get(userId);
	if (!set) return;
	set.delete(cb);
	if (set.size === 0) subscribers.delete(userId);
}

export function publishNotification(recipientID: number, payload: NotificationRecord) {
	console.log(
		`[Broadcaster] Publishing to user ${recipientID}, has subscribers: ${subscribers.has(recipientID)}`
	);

	const set = subscribers.get(recipientID);
	if (!set || set.size === 0) {
		console.log(`[Broadcaster] No subscribers for user ${recipientID}`);
		return;
	}

	console.log(`[Broadcaster] Sending to ${set.size} subscriber(s) for user ${recipientID}`);
	for (const cb of set) {
		try {
			cb(payload);
			console.log(
				`[Broadcaster] Successfully sent notification ${payload.id} to user ${recipientID}`
			);
		} catch (err) {
			console.error('[Broadcaster] Subscriber callback error:', err);
		}
	}
}

// Helper to check subscribers (for debugging)
export function getSubscriberCount() {
	return subscribers.size;
}

export function getUserSubscriberCount(userId: number) {
	return subscribers.get(userId)?.size || 0;
}
