export function resolveGeofence(checkInLat: number | null, checkInLng: number | null) {
	if (checkInLat == null || checkInLng == null) return null;

	// Office coordinates
	const officeLat = 1.3;
	const officeLng = 103.8;

	// Calculate distance in kilometers
	const R = 6371; // Earth's radius in km
	const dLat = ((checkInLat - officeLat) * Math.PI) / 180;
	const dLng = ((checkInLng - officeLng) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((officeLat * Math.PI) / 180) *
			Math.cos((checkInLat * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;

	// Adjust radius as needed (e.g., 100 meters)
	return distance < 0.1 ? 'Inside' : 'Outside';
}
