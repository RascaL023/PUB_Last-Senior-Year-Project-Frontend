import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { ImageUploadAuth } from '$lib/domain/image';
import type { ImageRepository } from '$lib/domain/ports/image-repository';

export function createImageRepository(http: HttpClient): ImageRepository {
	return {
		getUploadAuth: () =>
			http.getSingle<ImageUploadAuth>(`${API_V1}/images/auth`) as Promise<ImageUploadAuth>
	};
}
