<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { onMount, createEventDispatcher, onDestroy, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let geofences: any[] = [];
	const dispatch = createEventDispatcher();

	let showGeoForm = false;
	let geoForm: any = {
		id: undefined,
		name: '',
		latitude: '',
		longitude: '',
		radiusMeters: 100,
		isActive: true
	};

	let map: any;
	let markers: any[] = [];
	let Leaflet: any = null;

	// Alert Mmessage
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => {
		if (t) clearTimeout(t);
	});

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 10000);
	}

	onMount(async () => {
		const mod = await import('leaflet');
		const L = mod.default ?? mod;
		Leaflet = L;
		await import('leaflet/dist/leaflet.css');

		try {
			const iconUrl = (await import('leaflet/dist/images/marker-icon.png')).default;
			const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
			const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png')).default;

			delete (L.Icon.Default.prototype as any)._getIconUrl;

			L.Icon.Default.mergeOptions({
				iconUrl,
				iconRetinaUrl,
				shadowUrl
			});
		} catch (err) {
			console.warn('⚠️ Leaflet marker image fix failed', err);
		}

		map = L.map('geofenceMap').setView([3.139, 101.6869], 10);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20}).addTo(map);
		await tick();
        map.invalidateSize();
		updateMap();
	});

	function updateMap(L?: any) {
		const lib = L ?? Leaflet;
		if (!map || !lib) return;

		markers.forEach((m) => {
			try {
				m.remove();
			} catch {}
		});
		markers = [];

		geofences.forEach((g) => {
			const lat = Number(g.latitude);
			const lng = Number(g.longitude);
			const radius = Number(g.radiusMeters) || 0;
			if (isNaN(lat) || isNaN(lng)) return;

			const circle = lib
				.circle([lat, lng], {
					radius,
					color: g.isActive ? 'green' : 'red',
					fillOpacity: 0.3
				})
				.addTo(map);

			const marker = lib.marker([lat, lng]).addTo(map);
			const popupContent = `
				<b>${g.name}</b><br>
				Lat: ${lat}<br>
				Lng: ${lng}<br>
				Radius: ${radius} m<br>
				Active: ${g.isActive ? 'Yes' : 'No'}
			`;
			circle.bindPopup(popupContent);
			marker.bindPopup(popupContent);

			markers.push(circle, marker);
		});

		if (markers.length > 0) {
			const group = lib.featureGroup(markers);
			map.fitBounds(group.getBounds().pad(0.2));
		}
	}

	function addGeo() {
		geoForm = {
			id: undefined,
			name: '',
			latitude: '',
			longitude: '',
			radiusMeters: 100,
			isActive: true
		};
		showGeoForm = true;
	}

	function editGeo(id: number) {
		const g = geofences.find((x) => x.id === id);
		if (g) geoForm = { ...g };
		showGeoForm = true;
	}

	function cancelForm() {
		showGeoForm = false;
	}

	function handleFormEnhance() {
		return async ({ result }: any) => {
			if (result?.type === 'success') {
				showAlert(result.data?.message || 'Geofence saved successfully.', 'success');
				await invalidateAll();
				showGeoForm = false;
			} else {
				showAlert(result.data?.error || 'Failed to save geofence.', 'error');
			}
		};
	}

	async function deleteGeo(id: number) {
		if (!confirm('Delete this geofence?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const res = await fetch('?/deleteGeofence', { method: 'POST', body: formData });

		if (res.ok) {
			await invalidateAll();
			showAlert('Geofence deleted successfully.', 'success');
		} else {
			showAlert('Failed to delete geofence.', 'error');
		}
	}

	$: if (map && Leaflet) {
		updateMap();
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Geofence</Card.Title>
			<Card.Description>Define location boundaries for attendance tracking.</Card.Description>
			<br />
		</div>
		<Button on:click={addGeo}><Plus class="w-4 h-4" /></Button>
	</Card.Header>

	<Card.Content>
		<!-- Inline Alert -->
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if showGeoForm}
			<form
				method="POST"
				action={geoForm.id ? '?/updateGeofence' : '?/createGeofence'}
				use:enhance={handleFormEnhance}
				class="mb-4 rounded-md border p-4 space-y-3"
			>
				{#if geoForm.id}
					<input type="hidden" name="id" value={geoForm.id} />
				{/if}
				
				<h3 class="font-semibold mb-3">
					{geoForm.id ? 'Edit Geofence Location' : 'Add New Geofence Location'}
				</h3>

				<div class="grid sm:grid-cols-3 gap-3">
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="font-medium text-sm mb-1 block">Location Name</label>
						<Input name="name" placeholder="e.g. HQ Office" bind:value={geoForm.name} required />
					</div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<div>
						<label class="font-medium text-sm mb-1 block">Latitude</label>
						<Input
							name="latitude"
							placeholder="e.g. 3.139"
							bind:value={geoForm.latitude}
							required
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="font-medium text-sm mb-1 block">Longitude</label>
						<Input
							name="longitude"
							placeholder="e.g. 101.6869"
							bind:value={geoForm.longitude}
							required
						/>
					</div>
				</div>

				<div class="grid sm:grid-cols-2 gap-3">
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="font-medium text-sm mb-1 block">Radius (m)</label>
						<Input type="number" name="radiusMeters" bind:value={geoForm.radiusMeters} required />
					</div>

					<div class="flex items-center gap-3 mt-6">
						<label class="flex items-center gap-2">
							<input type="checkbox" name="isActive" bind:checked={geoForm.isActive} /> Active
						</label>
					</div>
				</div>

				{#if geoForm.id}
					<input type="hidden" name="id" value={geoForm.id} />
				{/if}

				<div class="flex justify-end gap-2 mt-3">
					<Button type="button" variant="secondary" on:click={cancelForm}>Cancel</Button>
					<Button type="submit">{geoForm.id ? 'Update' : 'Save'}</Button>
				</div>
			</form>
		{/if}

		<div id="geofenceMap" class="h-[400px] w-full md:h-[500px] rounded-md border"></div><br/>

		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Latitude</Table.Head>
						<Table.Head>Longitude</Table.Head>
						<Table.Head>Radius (m)</Table.Head>
						<Table.Head>Active</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each geofences as g, idx (g.id)}
						<Table.Row>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>{g.name}</Table.Cell>
							<Table.Cell>{g.latitude}</Table.Cell>
							<Table.Cell>{g.longitude}</Table.Cell>
							<Table.Cell>{g.radiusMeters}</Table.Cell>
							<Table.Cell>{g.isActive ? 'Yes' : 'No'}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editGeo(g.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									on:click={() => deleteGeo(g.id)}
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="7" class="text-center text-muted-foreground h-16">
								No geofences defined.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
