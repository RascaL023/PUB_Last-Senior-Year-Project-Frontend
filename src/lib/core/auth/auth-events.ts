/**
 * Bus ringan untuk memberi tahu seluruh aplikasi bahwa refresh token sudah
 * tidak berlaku (sesi benar-benar berakhir).
 *
 * HTTP client tidak boleh mengimpor session store secara langsung (akan
 * membentuk siklus dependency), jadi ia hanya memancarkan event di sini dan
 * session store yang mendengarkannya.
 */

type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

/** Daftarkan listener; kembalikan fungsi untuk melepasnya kembali. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function emitSessionExpired(): void {
	for (const listener of listeners) listener();
}
