// src/lib/server/cron.js
import cron from 'node-cron';
import { autoPunchOutJob } from './autoPunchOutJob';

export function startCronJobs() {
	if (process.env.NODE_ENV === 'development') {
		// Development: Run every 30 minutes for testing
		cron.schedule('*/30 * * * *', () => {
			console.log(`[DEV CRON] ${new Date().toISOString()}: Running auto-punch job`);
			autoPunchOutJob().catch((error) => {
				console.error('[DEV CRON] Error:', error);
			});
		});
		console.log('🔄 DEV: Auto-punch cron scheduled every 30 minutes');
	} else {
		// Production: Run at 2 AM daily (10 AM Malaysia time)
		cron.schedule('0 2 * * *', () => {
			console.log(`[CRON] ${new Date().toISOString()}: Starting auto-punch job`);
			autoPunchOutJob().catch((error) => {
				console.error('[CRON] Error:', error);
				// Send alert email/notification here
			});
		});
		console.log('✅ PROD: Auto-punch cron scheduled for 2 AM UTC (10 AM MYT)');
	}
}
