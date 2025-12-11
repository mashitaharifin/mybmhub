// src/lib/server/notifications/types.ts
export interface NotificationRecord {
	id: number;
	recipientID: number;
	title: string;
	message: string;
	type: 'LeaveStatus' | 'MedicalReminder' | 'SystemAlert' | 'General' | 'Attendance';
	relatedLeaveID?: number | null;
	triggerDate?: Date | null;
	sentAt?: Date | null;
	sentInApp?: boolean;
	sentEmail?: boolean;
	isRead: boolean;
	createdAt?: Date;
	link?: string;
}

export interface BroadcastMessage {
	type: 'notification';
	data: NotificationRecord;
}
