export interface TimestampMeta {
	timestamp: string;
}

export interface PaginationMeta {
	currentPage: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface PagedMeta extends TimestampMeta {
	pagination: PaginationMeta;
}

export interface ApiSingle<T> {
	isSuccess: true;
	message: string;
	data: T | null;
	meta: TimestampMeta;
}

export interface ApiPaged<T> {
	isSuccess: true;
	message: string;
	data: T[];
	meta: PagedMeta;
}

export interface FieldError {
	field: string;
	message: string;
}

export type ErrorCode =
	| 'BAD_REQUEST'
	| 'INVALID_ARGUMENT'
	| 'MALFORMED_JSON'
	| 'MISSING_PARAMETER'
	| 'UNAUTHORIZED'
	| 'ACCESS_TOKEN_EXPIRED'
	| 'INVALID_ACCESS_TOKEN'
	| 'INVALID_REFRESH_TOKEN'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'METHOD_NOT_ALLOWED'
	| 'UNSUPPORTED_MEDIA_TYPE'
	| 'CONFLICT'
	| 'DUPLICATE_ENTRY'
	| 'INTERNAL_SERVER_ERROR';

export interface ApiErrorEnvelope {
	isSuccess: false;
	message: string;
	errorCode: ErrorCode | null;
	errors: FieldError[] | null;
	meta: TimestampMeta;
}
