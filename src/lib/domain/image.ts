export interface ImageUploadAuth {
	publicKey: string;
	token: string;
	expire: number;
	signature: string;
}

export interface ImageKitUploadParams extends ImageUploadAuth {
	fileName: string;
}

export interface UploadedImage {
	url: string;
	fileId?: string;
}
