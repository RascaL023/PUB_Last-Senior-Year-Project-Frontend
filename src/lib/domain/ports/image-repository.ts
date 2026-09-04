import type { ImageUploadAuth } from '../image';

export interface ImageRepository {
	getUploadAuth(): Promise<ImageUploadAuth>;
}
