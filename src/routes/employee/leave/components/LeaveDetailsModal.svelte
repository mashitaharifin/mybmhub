<script lang="ts">
	import { format } from '$lib/utils/formatHelpers';
	import LeaveStatusBadge from './LeaveStatusBadge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Eye } from 'lucide-svelte';

	export let application: any;
	export let onClose: () => void;
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
	<div
		class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
	>
		<h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
			Leave Application Details
		</h3>

		<div class="space-y-4">
			<!-- Basic Information -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Leave Type</p>
					<p class="text-gray-800 dark:text-gray-200">{application.leaveTypeName}</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
					<p><LeaveStatusBadge status={application.status} /></p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</p>
					<p class="text-gray-800 dark:text-gray-200">
						{application.duration} day{application.duration > 1 ? 's' : ''}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Applied On</p>
					<p class="text-gray-800 dark:text-gray-200">
						{format.timestamp(application.applicationDate)}
					</p>
				</div>
			</div>

			<!-- Dates -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</p>
					<p class="text-gray-800 dark:text-gray-200">
						{new Date(application.startDate).toLocaleDateString()}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</p>
					<p class="text-gray-800 dark:text-gray-200">
						{new Date(application.endDate).toLocaleDateString()}
					</p>
				</div>
			</div>

			<!-- Half Day Information -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Half Day</p>
					<p class="text-gray-800 dark:text-gray-200">{application.halfDay ? 'Yes' : 'No'}</p>
				</div>
				{#if application.halfDay}
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Session</p>
						<p class="text-gray-800 dark:text-gray-200">{application.halfDaySession || '-'}</p>
					</div>
				{/if}
			</div>

			<!-- Reason (only if leave type requires it) -->
			{#if application.leaveTypeName === 'Emergency Leave' && application.reason}
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Reason</p>
					<p
						class="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-3 rounded-md mt-1"
					>
						{application.reason}
					</p>
				</div>
			{/if}

			<!-- Document (if applicable) -->
			{#if (application.leaveTypeName === 'Medical Leave' || application.leaveTypeName === 'Hospitalization Leave' || application.leaveTypeName === 'Emergency Leave') && application.docImg}
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Document</p>
					<div class="mt-1">
						<a
							href={application.docImg}
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
						>
							<Eye class="w-4 h-4" />
							View Document
						</a>
					</div>
				</div>
			{:else if application.leaveTypeName === 'Medical Leave' || application.leaveTypeName === 'Hospitalization Leave' || application.leaveTypeName === 'Emergency Leave'}
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Document</p>
					<p class="text-gray-500 dark:text-gray-400 italic">No document uploaded</p>
				</div>
			{/if}

			<!-- Approval/Rejection/Cancellation info -->
			{#if application.status === 'Approved'}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Approved By</p>
						<p class="text-gray-800 dark:text-gray-200">{application.approvedByName || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Approval Date</p>
						<p class="text-gray-800 dark:text-gray-200">
							{application.approvalDate
								? new Date(application.approvalDate).toLocaleDateString()
								: '-'}
						</p>
					</div>
				</div>
			{:else if application.status === 'Rejected'}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected By</p>
						<p class="text-gray-800 dark:text-gray-200">{application.rejectedByName || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Rejected Date</p>
						<p class="text-gray-800 dark:text-gray-200">
							{application.rejectedDate
								? new Date(application.rejectedDate).toLocaleDateString()
								: '-'}
						</p>
					</div>
				</div>
			{:else if application.status === 'Cancelled'}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Cancelled By</p>
						<p class="text-gray-800 dark:text-gray-200">{application.cancelledByName || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Cancelled Date</p>
						<p class="text-gray-800 dark:text-gray-200">
							{application.cancelledDate
								? new Date(application.cancelledDate).toLocaleDateString()
								: '-'}
						</p>
					</div>
				</div>
			{/if}

			<!-- Manager Remark (if exists) -->
			{#if application.managerRemark}
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Manager Remark</p>
					<p
						class="text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mt-1"
					>
						{application.managerRemark}
					</p>
				</div>
			{/if}
		</div>

		<!-- Close Button -->
		<div class="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
			<Button on:click={onClose} class="px-4">Close</Button>
		</div>
	</div>
</div>
