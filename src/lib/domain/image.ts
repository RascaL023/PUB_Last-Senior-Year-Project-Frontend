export interface ImageUploadAuth {
	publicKey: string;
	token: string;
	expire: number;
	signature: string;
	/** Folder tujuan upload yang diputuskan BE (mis. /menus). */
	uploadFolder?: string;
}

export interface ImageKitUploadParams extends ImageUploadAuth {
	fileName: string;
}

export interface UploadedImage {
	/** Path relatif di provider (mis. /menus/test.png) — nilai yang dikirim ke BE. */
	filePath: string;
	/** URL siap tampil dari provider — hanya untuk preview, jangan dikirim ke BE. */
	url?: string;
	fileId?: string;
}
