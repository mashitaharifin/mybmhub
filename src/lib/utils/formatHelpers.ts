export const format = {
	timestamp: (dateStr: string | Date) => {
		const d = new Date(dateStr);
		return d.toLocaleString(); // You can adjust format later
	}
};
