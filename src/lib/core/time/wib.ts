// Backend mengirim wall clock Asia/Jakarta TANPA offset (LocalDateTime).
// Parse sebagai +07:00 agar tidak bergeser mengikuti zona browser.
export function parseWib(value: string): Date {
	const normalized = value.length === 16 ? `${value}:00` : value;
	return new Date(`${normalized}+07:00`);
}

export function formatWibDate(value: string | null | undefined): string {
	if (!value) return '-';
	return parseWib(value).toLocaleDateString('id-ID', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function formatWibDateTime(value: string | null | undefined): string {
	if (!value) return '-';
	return parseWib(value).toLocaleString('id-ID', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatWibTime(value: string | null | undefined): string {
	if (!value) return '-';
	return parseWib(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
