<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	export let employee;
</script>

<div class="space-y-6">
	<!-- Personal & Employment Details -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title class="text-lg font-semibold text-gray-900 dark:text-gray-100">
				Personal & Employment Details
			</Card.Title>
		</Card.Header>

		<Card.Content>
			<div class="grid md:grid-cols-2 gap-6">
				<!-- Left Column -->
				<div class="space-y-4">
					<div>
						<p class="text-sm text-gray-500">Employee ID</p>
						<p class="font-medium text-gray-900 dark:text-gray-100">{employee.id}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Email</p>
						<p class="font-medium text-gray-900 dark:text-gray-100">{employee.email}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Role</p>
						<p class="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
							{employee.role}
						</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Phone Number</p>
						<p class="font-medium text-gray-900 dark:text-gray-100">{employee.phoneNumber || '—'}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Address</p>
						<p class="font-medium text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
							{employee.address || '—'}
						</p>
					</div>
				</div>

				<!-- Right Column -->
				<div class="space-y-4">
					<div>
						<p class="text-sm text-gray-500">Date of Joining</p>
						<p class="font-medium text-gray-900 dark:text-gray-100">
							{employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '—'}
						</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Probation End</p>
						<p class="font-medium text-gray-900 dark:text-gray-100">
							{employee.probationEnd ? new Date(employee.probationEnd).toLocaleDateString() : '—'}
						</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Created At (System)</p>
						<p class="font-medium text-gray-700 dark:text-gray-300">
							{employee.createdAt ? new Date(employee.createdAt).toLocaleString() : '—'}
						</p>
					</div>

					<div>
						<p class="text-sm text-gray-500">Last Login (System)</p>
						<p class="font-medium text-gray-700 dark:text-gray-300">
							{employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : '—'}
						</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

