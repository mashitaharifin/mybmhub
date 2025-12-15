// src/lib/server/notifications/createNotification.ts
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema'; // path to your pgTable
import { publishNotification } from '$lib/server/notifications/broadcaster';

/**
 * NotificationType - use the enum values provided --> LeaveStatus, MedicalReminder, SystemAlert, General, Attendance
 */
export type NotificationType =
	| 'LeaveStatus'
	| 'MedicalReminder'
	| 'SystemAlert'
	| 'General'
	| 'Attendance';

export interface NotificationRecordPayload {
	title: string;
	message: string;
	type: NotificationType;
	recipientID: number;
	relatedLeaveID?: number | null;
	triggerDate?: Date | string | null;
	sentEmail?: boolean;
	// additional optional metadata if you want
	[k: string]: any;
}

export interface NotificationRecord {
	id: number;
	recipientID: number;
	title: string;
	message: string;
	type: NotificationType;
	relatedLeaveID: number | null;
	triggerDate: Date | null;
	sentAt: Date | null;
	sentInApp: boolean;
	sentEmail: boolean;
	isRead: boolean;
	createdAt: Date;
}

/**
 * createNotification
 * - inserts a notification record into DB
 * - publishes via SSE using publishNotification(recipientID, payload)
 * - placeholder spot for email sending integration
 */
export async function createNotification(
	payload: NotificationRecordPayload
): Promise<NotificationRecord> {
	const {
		recipientID,
		title,
		message,
		type,
		relatedLeaveID = null,
		triggerDate = null,
		sentEmail = false
	} = payload;

	// Insert into DB
	try {
		// Adjust this insert according to drizzle usage and return API.
		const inserted = await db
			.insert(notifications)
			.values({
				recipientID,
				title,
				message,
				type,
				relatedLeaveID,
				triggerDate: triggerDate ? new Date(triggerDate) : null,
				// sentAt left null until (optionally) an external send occurs
				sentInApp: true, // since we're publishing to SSE immediately
				sentEmail: !!sentEmail
			})
			.returning();

		// `inserted` might be an array or single depending on driver; normalize:
		const row = Array.isArray(inserted) ? inserted[0] : inserted;

		const record: NotificationRecord = {
			id: row.id!, // id should never be null
			recipientID: row.recipientID!,
			title: row.title!,
			message: row.message!,
			type: row.type as NotificationType, // safe cast from DB enum
			relatedLeaveID: row.relatedLeaveID ?? null,
			triggerDate: row.triggerDate ?? null,
			sentAt: row.sentAt ?? null,
			sentInApp: Boolean(row.sentInApp),
			sentEmail: Boolean(row.sentEmail),
			isRead: Boolean(row.isRead),
			createdAt: row.createdAt!
		};


		// Publish to SSE subscribers if any
		try {
			publishNotification(recipientID, record);
		} catch (err) {
			console.error('[createNotification] SSE publish error', err);
			// we do not rollback DB insert if SSE publish fails - app can retry / log
		}

		// Placeholder for email sending:
		// if (sentEmail) { enqueueEmailJob({ to: userEmail, subject: title, body: message, notificationId: record.id }) }
		// Do NOT implement email sending here; we just store 'sentEmail' flag / support later jobs.

		return record;
	} catch (err) {
		console.error('[createNotification] DB insert error', err);
		throw err;
	}
}
