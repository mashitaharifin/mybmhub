<script lang="ts">
  import { resolveGeofence } from '$lib/utils/geofence';
  
  export let record: any;
  export let type: 'in' | 'out' = 'in';

  let display = '—';

  $: {
    if (type === 'in') {
      const lat = record.checkInLat != null ? Number(record.checkInLat) : null;
      const lng = record.checkInLng != null ? Number(record.checkInLng) : null;

      if (record.checkInLocation?.locationName) {
        display = record.checkInLocation.locationName;
      } else if (lat != null && lng != null) {
        const geofenceStatus = resolveGeofence(lat, lng);
        display = geofenceStatus === 'Inside' 
          ? 'Within geofence' 
          : `Outside geofence (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
      } else {
        display = '—';
      }
    } else {
      const lat = record.checkOutLat != null ? Number(record.checkOutLat) : null;
      const lng = record.checkOutLng != null ? Number(record.checkOutLng) : null;

      if (record.checkOutLocation?.locationName) {
        display = record.checkOutLocation.locationName;
      } else if (lat != null && lng != null) {
        const geofenceStatus = resolveGeofence(lat, lng);
        display = geofenceStatus === 'Inside' 
          ? 'Within geofence' 
          : `Outside geofence (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
      } else {
        display = '—';
      }
    }
  }
</script>

<span class="text-sm">{display}</span>