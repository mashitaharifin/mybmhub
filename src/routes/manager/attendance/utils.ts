export function formatDateTimeIso(dt: string | null) {
	if (!dt) return '—';
	try {
		return new Date(dt).toLocaleString();
	} catch (e) {
		return dt;
	}
}
