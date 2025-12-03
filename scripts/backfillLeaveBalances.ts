// scripts/backfillLeaveBalances.ts
async function backfillLeaveBalances() {
	try {
		const response = await fetch('http://localhost:5173/api/leave/backfill-leave-balances', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const result = await response.json();

		if (result.success) {
			console.log('Backfill completed successfully');
			console.log('Results:', result.results);
		} else {
			console.error('Backfill failed:', result.error);
		}

		process.exit(0);
	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
}

backfillLeaveBalances();
