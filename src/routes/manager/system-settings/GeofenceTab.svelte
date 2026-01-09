<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Plus, Pencil, Trash2, Zap } from 'lucide-svelte';
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

	let map: any = null;
	let maplibre: any = null;
	let mapContainer: HTMLElement | null = null;
	let animationFrameId: number | null = null;
	let animationTime = 0;

	// Alert Message
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => {
		if (t) clearTimeout(t);
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		if (map) {
			map.remove();
			map = null;
		}
	});

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 10000);
	}

	// Animation function for pulsing effect
	function animateGeofences() {
		if (!map || !map.loaded()) return;

		animationTime = (animationTime + 0.02) % (2 * Math.PI);
		
		// Calculate pulsing opacity for active geofences
		const pulseIntensity = 0.2; // How strong the pulse is (0-1)
		const pulseSpeed = 2; // How fast the pulse animates
		
		// Create a smooth wave effect
		const waveValue = (Math.sin(animationTime * pulseSpeed) + 1) / 2; // 0 to 1
		const pulseOpacity = 0.3 + (waveValue * pulseIntensity); // 0.3 to 0.5 opacity
		
		// Update the active geofence circle opacity
		if (map.getLayer('geofences-circle')) {
			map.setPaintProperty('geofences-circle', 'circle-opacity', [
				'case',
				['==', ['get', 'isActive'], true],
				pulseOpacity, // Animated opacity for active
				0.2 // Static low opacity for inactive
			]);
			
			// Also animate the stroke width for active geofences
			map.setPaintProperty('geofences-circle', 'circle-stroke-width', [
				'case',
				['==', ['get', 'isActive'], true],
				2 + Math.sin(animationTime * pulseSpeed) * 0.5, // Animated stroke
				1 // Thin stroke for inactive
			]);
		}
		
		// Animate the center point markers
		if (map.getLayer('geofences-points')) {
			map.setPaintProperty('geofences-points', 'circle-radius', [
				'case',
				['==', ['get', 'isActive'], true],
				7 + Math.sin(animationTime * pulseSpeed) * 1.5, // Pulsing size for active
				5 // Smaller for inactive
			]);
		}

		animationFrameId = requestAnimationFrame(animateGeofences);
	}

	onMount(async () => {
		try {
			// Dynamically import MapLibre
			const maplibreModule = await import('maplibre-gl');
			maplibre = maplibreModule.default;
			await import('maplibre-gl/dist/maplibre-gl.css');

			// Wait for DOM to be ready
			await tick();

			// Get map container
			mapContainer = document.getElementById('geofenceMap');
			if (!mapContainer) {
				console.error('Map container not found');
				return;
			}

			// Initialize map with a nicer style
			map = new maplibre.Map({
				container: 'geofenceMap',
				style: {
					version: 8,
					sources: {
						'osm-tiles': {
							type: 'raster',
							tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution: '© OpenStreetMap contributors'
						}
					},
					layers: [
						{
							id: 'osm-tiles',
							type: 'raster',
							source: 'osm-tiles',
							minzoom: 0,
							maxzoom: 19
						}
					]
				},
				center: [101.6869, 3.139], // [longitude, latitude]
				zoom: 10,
				attributionControl: true
			});

			// Add navigation controls
			map.addControl(new maplibre.NavigationControl(), 'top-right');
			
			// Add scale control
			map.addControl(new maplibre.ScaleControl({
				maxWidth: 200,
				unit: 'metric'
			}), 'bottom-left');

			// Wait for map to load
			map.on('load', () => {
				console.log('MapLibre map loaded successfully');
				updateMap();
				// Start animation after map is loaded
				animateGeofences();
			});

			map.on('error', (e: any) => {
				console.error('MapLibre error:', e);
			});

		} catch (error) {
			console.error('Failed to load MapLibre:', error);
			showAlert('Failed to load map library. Please refresh the page.', 'error');
		}
	});

	function updateMap() {
		if (!map || !maplibre || !map.loaded()) {
			console.log('Map not ready for update');
			return;
		}

		// Remove existing layers and sources
		try {
			if (map.getLayer('geofences-circle')) map.removeLayer('geofences-circle');
			if (map.getLayer('geofences-points')) map.removeLayer('geofences-points');
			if (map.getSource('geofences')) map.removeSource('geofences');
		} catch (e) {
			// Layers/sources might not exist yet
			console.log('Cleaning up existing map layers');
		}

		// Create GeoJSON features
		const features = geofences
			.map((g) => {
				const lat = Number(g.latitude);
				const lng = Number(g.longitude);
				const radius = Number(g.radiusMeters) || 0;

				if (isNaN(lat) || isNaN(lng)) {
					console.warn(`Invalid coordinates for geofence ${g.id}: lat=${lat}, lng=${lng}`);
					return null;
				}

				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [lng, lat] // MapLibre uses [lng, lat]
					},
					properties: {
						id: g.id,
						name: g.name,
						latitude: lat,
						longitude: lng,
						radius: radius,
						isActive: g.isActive,
						color: g.isActive ? '#10b981' : '#E82525', // green for active, gray for inactive
						strokeColor: g.isActive ? '#059669' : '#E82525',
						fillColor: g.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.1)'
					}
				};
			})
			.filter((f) => f !== null);

		if (features.length === 0) {
			console.log('No valid geofences to display');
			return;
		}

		// Add geofence data source
		map.addSource('geofences', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: features
			}
		});

		// Add circle layer for geofence radius with initial animation properties
		map.addLayer({
			id: 'geofences-circle',
			type: 'circle',
			source: 'geofences',
			paint: {
				'circle-radius': {
					property: 'radius',
					type: 'identity'
				},
				'circle-color': ['get', 'fillColor'],
				'circle-opacity': [
					'case',
					['==', ['get', 'isActive'], true],
					0.4, // Will be animated
					0.2 // Static for inactive
				],
				'circle-stroke-width': [
					'case',
					['==', ['get', 'isActive'], true],
					2, // Will be animated
					1 // Thin for inactive
				],
				'circle-stroke-color': ['get', 'strokeColor'],
				'circle-stroke-opacity': 0.8
			}
		});

		// Add point layer for geofence centers with initial animation properties
		map.addLayer({
			id: 'geofences-points',
			type: 'circle',
			source: 'geofences',
			paint: {
				'circle-radius': [
					'case',
					['==', ['get', 'isActive'], true],
					7, // Will be animated
					5 // Smaller for inactive
				],
				'circle-color': ['get', 'color'],
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff',
				'circle-stroke-opacity': 0.9
			}
		});

		// Add a highlight layer for active geofences (glow effect)
		map.addLayer({
			id: 'geofences-glow',
			type: 'circle',
			source: 'geofences',
			paint: {
				'circle-radius': [
					'interpolate',
					['linear'],
					['get', 'radius'],
					0, 0,
					1000, ['+', ['get', 'radius'], 10] // Add 10m glow
				],
				'circle-color': [
					'case',
					['==', ['get', 'isActive'], true],
					'rgba(16, 185, 129, 0.1)', // Green glow for active
					'transparent' // No glow for inactive
				],
				'circle-opacity': [
					'case',
					['==', ['get', 'isActive'], true],
					0.3, // Will be animated
					0 // No glow for inactive
				],
				'circle-blur': 5 // Blurry glow effect
			}
		}, 'geofences-circle'); // Place below the main circle

		// Add popup on click
		map.on('click', 'geofences-points', (e: any) => {
			if (!e.features || e.features.length === 0) return;

			const feature = e.features[0];
			const props = feature.properties;
			const coordinates = feature.geometry.coordinates.slice();

			// Ensure popup appears in correct position
			while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
				coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
			}

			const statusBadge = props.isActive 
				? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><Zap class="w-3 h-3" /> Active</span>'
				: '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>';

			const popupContent = `
				<div class="p-3 max-w-xs">
					<div class="flex items-center justify-between mb-2">
						<h3 class="font-bold text-lg text-gray-900">${props.name}</h3>
						${statusBadge}
					</div>
					<div class="space-y-2 text-sm text-gray-600">
						<div class="flex justify-between">
							<span class="font-medium">Latitude:</span>
							<span class="font-mono">${props.latitude.toFixed(6)}</span>
						</div>
						<div class="flex justify-between">
							<span class="font-medium">Longitude:</span>
							<span class="font-mono">${props.longitude.toFixed(6)}</span>
						</div>
						<div class="flex justify-between">
							<span class="font-medium">Radius:</span>
							<span class="font-semibold">${props.radius} meters</span>
						</div>
						<div class="pt-2 border-t">
							<small class="text-gray-500">Click on map to close</small>
						</div>
					</div>
				</div>
			`;

			new maplibre.Popup({
				closeButton: true,
				closeOnClick: true,
				maxWidth: '300px'
			})
				.setLngLat(coordinates)
				.setHTML(popupContent)
				.addTo(map);
		});

		// Change cursor on hover
		map.on('mouseenter', 'geofences-points', () => {
			map.getCanvas().style.cursor = 'pointer';
		});

		map.on('mouseleave', 'geofences-points', () => {
			map.getCanvas().style.cursor = '';
		});

		// Add hover effect for active geofences
		map.on('mouseenter', 'geofences-circle', () => {
			if (map.getLayer('geofences-circle')) {
				map.setPaintProperty('geofences-circle', 'circle-stroke-width', [
					'case',
					['==', ['get', 'isActive'], true],
					['+', 2, ['sin', ['*', animationTime, 2]]], // Keep animation on hover
					2 // Static for inactive
				]);
			}
		});

		// Fit map to show all geofences
		if (features.length > 0) {
			const bounds = new maplibre.LngLatBounds();
			features.forEach((feature: any) => {
				bounds.extend(feature.geometry.coordinates);
			});
			
			// Add padding and animate to bounds
			setTimeout(() => {
				try {
					map.fitBounds(bounds, {
						padding: { top: 50, bottom: 50, left: 50, right: 50 },
						duration: 1000,
						maxZoom: 15
					});
				} catch (e) {
					console.warn('Could not fit bounds:', e);
				}
			}, 500);
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
				
				// Update map after data changes
				setTimeout(() => {
					if (map && map.loaded()) {
						updateMap();
					}
				}, 500);
			} else {
				showAlert(result.data?.error || 'Failed to save geofence.', 'error');
			}
		};
	}

	async function deleteGeo(id: number) {
		if (!confirm('Are you sure you want to delete this geofence?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const res = await fetch('?/deleteGeofence', { method: 'POST', body: formData });

		if (res.ok) {
			await invalidateAll();
			showAlert('Geofence deleted successfully.', 'success');
			
			// Update map after deletion
			setTimeout(() => {
				if (map && map.loaded()) {
					updateMap();
				}
			}, 500);
		} else {
			showAlert('Failed to delete geofence.', 'error');
		}
	}

	// Update map when geofences change
	$: if (map && maplibre && map.loaded()) {
		updateMap();
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Geofence Management</Card.Title>
			<Card.Description>Define location boundaries for attendance tracking.</Card.Description>
			<br />
			<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
					<span>Active</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded-full bg-red-500"></div>
					<span>Inactive</span>
				</div>
			</div>
		</div>
		<Button on:click={addGeo}><Plus class="w-4 h-4" /></Button>
	</Card.Header>
	<br />

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
						<!-- svelte-ignore a11y_label_has_control -->
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
						<!-- svelte-ignore a11y_label_has_control -->
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="font-medium text-sm mb-1 block">Radius (meters)</label>
						<Input 
							type="number" 
							name="radiusMeters" 
							bind:value={geoForm.radiusMeters} 
							min="10"
							max="10000"
							required 
						/>
					</div>

					<div class="flex items-center gap-3 mt-6">
						<label class="flex items-center gap-2">
							<input type="checkbox" name="isActive" bind:checked={geoForm.isActive} /> 
							<span class="text-sm font-medium">Active (will show animation on map)</span>
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

		<!-- MapLibre Map Container -->
		<div id="geofenceMap" class="h-[400px] w-full md:h-[500px] rounded-md border overflow-hidden relative">
			{#if !maplibre}
				<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
					<div class="relative mb-4">
						<div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
						<div class="absolute inset-0 flex items-center justify-center">
							<Zap class="w-8 h-8 text-blue-500" />
						</div>
					</div>
					<p class="text-gray-600 dark:text-gray-300 font-medium">Loading interactive map...</p>
					<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Active geofences will have pulsing animation</p>
				</div>
			{/if}
			<div class="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
				<div class="flex items-center gap-2 text-sm">
					<Zap class="w-4 h-4 text-green-500 animate-pulse" />
					<span class="font-medium">Active geofences pulse</span>
				</div>
			</div>
		</div>
		<br/>

		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Coordinates</Table.Head>
						<Table.Head>Radius (m)</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each geofences as g, idx (g.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{idx + 1}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<div class={`w-3 h-3 rounded-full ${g.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
									<span class="font-medium">{g.name}</span>
									{#if g.isActive}
										<Zap class="w-3 h-3 text-green-500 animate-pulse" />
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="text-sm font-mono space-y-1">
									<div>Lat: {Number(g.latitude).toFixed(6)}</div>
									<div>Lng: {Number(g.longitude).toFixed(6)}</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<span class="font-medium">
									{g.radiusMeters} m
								</span>
							</Table.Cell>
							<Table.Cell>
								<span class="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 w-fit {g.isActive ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'}">
									{g.isActive ? 'Active' : 'Inactive'}
								</span>
							</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editGeo(g.id)}
									class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
									title="Edit"
								>
									<Pencil class="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600" />
								</button>
								<button
									on:click={() => deleteGeo(g.id)}
									class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group"
									title="Delete"
								>
									<Trash2 class="w-4 h-4 text-red-500 group-hover:text-red-700" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="6" class="text-center py-8">
								<div class="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
									<Zap class="w-12 h-12 mb-3 opacity-50" />
									<p class="font-medium">No geofences defined yet</p>
									<p class="text-sm mt-1">Click the + button to add your first geofence</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>

<style>
	/* Custom MapLibre styles */
	:global(.maplibregl-popup) {
		max-width: 300px;
		z-index: 1000;
	}

	:global(.maplibregl-popup-content) {
		padding: 0;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	:global(.maplibregl-popup-close-button) {
		font-size: 18px;
		padding: 6px 10px;
		color: #6b7280;
	}

	:global(.maplibregl-popup-close-button:hover) {
		color: #374151;
		background-color: transparent;
	}

	:global(.maplibregl-ctrl) {
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}

	:global(.maplibregl-ctrl-group:not(:empty)) {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* Ensure map canvas has proper cursor */
	:global(#geofenceMap .maplibregl-canvas) {
		cursor: grab;
	}

	:global(#geofenceMap .maplibregl-canvas:active) {
		cursor: grabbing;
	}

	/* Animation keyframes for additional visual effects */
	@keyframes gentle-pulse {
		0%, 100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.02);
		}
	}

	@keyframes glow {
		0%, 100% {
			box-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
		}
		50% {
			box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
		}
	}

	.glow-active {
		animation: glow 2s ease-in-out infinite;
	}
</style>