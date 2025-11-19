<script lang="ts">
	import type { PageData } from './$types';

	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import GeneralTab from './GeneralTab.svelte';
	import DepartmentTab from './DepartmentTab.svelte';
	import LeaveEntitlementTab from './LeaveEntitlementTab.svelte';
	import LeaveTypeTab from './LeaveTypeTab.svelte';
	import HolidayTab from './HolidayTab.svelte';
	import WorkingHourTab from './WorkingHourTab.svelte';
	import GeofenceTab from './GeofenceTab.svelte';
	import WorkingPatternTab from './WorkingPatternTab.svelte';
	import NotificationTab from './NotificationTab.svelte';

	const tabLabels: Record<string, string> = {
		general: 'General',
		departments: 'Departments',
		geofence: 'Geofence',
		'working-hours': 'Working Hours',
		patterns: 'Working Pattern',
		'leave-types': 'Leave Types',
		'leave-entitlements': 'Leave Entitlements',
		holidays: 'Public Holidays',
		notifications: 'Notifications'
	};

	export let data: PageData;

	let companySettings =
		data.generalSettings && Array.isArray(data.generalSettings)
			? Object.fromEntries(data.generalSettings.map((s) => [s.keyName, s.value ?? '']))
			: (data.generalSettings ?? {});

	let departments = (data.departments ?? []).map((d) => ({
		...d,
		description: d.description ?? undefined
	}));

	let leaveTypes = data.leaveTypes ?? [];
	let leaveEntitlementRules = data.leaveEntitlementRules ?? [];
	let holidays = data.holidays ?? [];
	let workingHours = data.workingHours ?? [];
	let geofences = data.geofences ?? [];

	let patterns = Array.isArray(data.workingPatterns) ? data.workingPatterns : [];

	let notifications = data.notifications ?? {
		leaveEvents: { email: true, inApp: true },
		attendanceAlerts: { email: true, inApp: false },
		systemUpdates: { email: true, inApp: true },
		reminders: { email: false, inApp: true }
	};

	let activeTab: string = 'general';
	const baseTitle = 'Settings | MyBM Hub';

	function handleUpdate(key: string, payload: any) {
		switch (key) {
			case 'company':
				companySettings = { ...companySettings, ...payload };
				break;
			case 'departments':
				departments = payload;
				break;
			case 'leaveTypes':
				leaveTypes = payload;
				break;
			case 'leaveEntitlementRules':
				leaveEntitlementRules = payload;
				break;
			case 'holidays':
				holidays = payload;
				break;
			case 'workingHours':
				workingHours = payload;
				break;
			case 'geofences':
				geofences = payload;
				break;
			case 'patterns':
				patterns = payload;
				break;
			case 'notifications':
				notifications = payload;
				break;
		}
	}
</script>

<svelte:head>
  <title>{activeTab && tabLabels[activeTab]
    ? `${tabLabels[activeTab]} – ${baseTitle}`
    : baseTitle}</title>
  <meta name="description" content="Manage organization-wide system settings in MyBM Hub." />
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/manager/dashboard">Dashboard</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator />

					<BreadcrumbItem>
						<BreadcrumbLink href="/manager/system-settings">Settings</BreadcrumbLink>
					</BreadcrumbItem>

					{#if activeTab && tabLabels[activeTab]}
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{tabLabels[activeTab]}</BreadcrumbPage>
						</BreadcrumbItem>
					{/if}
				</BreadcrumbList>
			</Breadcrumb><br />
			<div>
				<Card.Title>Settings</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400" >Manage organization-wide configurations and defaults.</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		<Tabs.Root bind:value={activeTab} onValueChange={(v) => (activeTab = v)} class="w-full">
			<Tabs.List
				class="w-full flex overflow-x-auto sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
				<Tabs.Trigger value="general">General</Tabs.Trigger>
				<Tabs.Trigger value="departments">Departments</Tabs.Trigger>
				<Tabs.Trigger value="geofence">Geofence</Tabs.Trigger>
				<Tabs.Trigger value="working-hours">Working Hours</Tabs.Trigger>
				<Tabs.Trigger value="patterns">Working Pattern</Tabs.Trigger>
				<Tabs.Trigger value="leave-types">Leave Types</Tabs.Trigger>
				<Tabs.Trigger value="leave-entitlements">Leave Entitlements</Tabs.Trigger>
				<Tabs.Trigger value="holidays">Public Holidays</Tabs.Trigger>
				<Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
			</Tabs.List>

			<div class="mt-4 space-y-4">
				<Tabs.Content value="general">
					<GeneralTab {companySettings} on:save={(e) => handleUpdate('company', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="departments">
					<DepartmentTab {departments} on:save={(e) => handleUpdate('departments', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="geofence">
					<GeofenceTab {geofences} on:save={(e) => handleUpdate('geofences', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="working-hours">
					<WorkingHourTab {workingHours} on:save={(e) => handleUpdate('workingHours', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="patterns">
					<WorkingPatternTab {patterns} on:save={(e) => handleUpdate('patterns', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="leave-types">
					<LeaveTypeTab {leaveTypes} on:save={(e) => handleUpdate('leaveTypes', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="leave-entitlements">
					<LeaveEntitlementTab
						leaveTypes={data.leaveTypes}
						{leaveEntitlementRules}
						on:save={(e) => handleUpdate('leaveEntitlementRules', e.detail)}
					/>
				</Tabs.Content>

				<Tabs.Content value="holidays">
					<HolidayTab {holidays} on:save={(e) => handleUpdate('holidays', e.detail)} />
				</Tabs.Content>

				<Tabs.Content value="notifications">
					<NotificationTab
						{notifications}
						on:save={(e) => handleUpdate('notifications', e.detail)}
					/>
				</Tabs.Content>
			</div>
		</Tabs.Root>
	</Card.Content>
</Card.Root>
