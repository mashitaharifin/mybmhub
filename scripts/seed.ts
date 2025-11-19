import { db } from '../src/lib/server/db/client';
import { users } from '../src/lib/server/db/schema/index';
import argon2 from 'argon2';

async function seed() {
	// Clear existing data
	await db.delete(users);

	// Hash passwords using Argon2
	const managerHash = await argon2.hash('manager123');
	const employeeHash = await argon2.hash('employee123');

	// Insert initial users
	await db.insert(users).values({
		name: 'Test Manager',
		username: 'managertest',
		email: 'manager@mybm.com',
		passwordHash: managerHash,
		role: 'Manager'
	});
	await db.insert(users).values({
		name: 'Test Employee',
		username: 'employeetest',
		email: 'employee@mybm.com',
		passwordHash: employeeHash,
		role: 'Employee'
	});

	console.log('✅ Seeded users table with Manager and Employee');
}

// Run the script
seed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('❌ Error while seeding:', err);
		process.exit(1);
	});
