import type { ImageUploadAuth, UploadedImage } from '$lib/domain/image';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export async function uploadToImageKit(auth: ImageUploadAuth, file: File): Promise<UploadedImage> {
	const form = new FormData();
	form.append('file', file);
	form.append('fileName', file.name);
	form.append('publicKey', auth.publicKey);
	form.append('signature', auth.signature);
	form.append('expire', String(auth.expire));
	form.append('token', auth.token);

	const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
	if (!res.ok) {
		throw new Error(`Upload gagal (${res.status})`);
	}
	const json = (await res.json()) as { url?: string; fileId?: string };
	if (!json.url) throw new Error('Upload gagal: respons tanpa URL');
	return { url: json.url, fileId: json.fileId };
}
