import { AppError } from './http-errors';

export function toAppError(e: unknown): AppError {
	if (e instanceof AppError) return e;
	if (e instanceof TypeError) return new AppError(0, 'Network request failed');
	return new AppError(0, e instanceof Error ? e.message : 'Unknown error');
}

export function isAuthError(e: unknown): boolean {
	return e instanceof AppError && e.status === 401;
}

export function getFriendlyMessage(e: unknown): string {
	if (e instanceof TypeError) return 'Server tidak terjangkau. Periksa koneksi atau pastikan backend berjalan.';
	if (!(e instanceof AppError)) return 'Terjadi kesalahan tak terduga. Coba lagi nanti.';
	switch (e.status) {
		case 0:
			return 'Server tidak terjangkau. Periksa koneksi atau pastikan backend berjalan.';
		case 400:
			return e.fieldErrors.length > 0 ? e.fieldErrors[0].message : 'Permintaan tidak valid.';
		case 401:
			return 'Menu hanya untuk pengguna terdaftar. Masuk untuk melihat menu.';
		case 403:
			return 'Anda tidak punya akses ke data ini.';
		case 404:
			return 'Data tidak ditemukan.';
		case 409:
			return 'Data bertentangan dengan yang sudah ada.';
		default:
			return e.status >= 500 ? 'Server bermasalah. Coba lagi nanti.' : e.message;
	}
}
