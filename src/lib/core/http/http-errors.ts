import type { ErrorCode, FieldError } from '../types/api';

export class AppError extends Error {
	status: number;
	errorCode: ErrorCode | null;
	fieldErrors: FieldError[];

	constructor(
		status: number,
		message: string,
		errorCode: ErrorCode | null = null,
		fieldErrors: FieldError[] = []
	) {
		super(message);
		this.name = 'AppError';
		this.status = status;
		this.errorCode = errorCode;
		this.fieldErrors = fieldErrors;
	}

	get isAuth(): boolean {
		return this.status === 401;
	}

	get isValidation(): boolean {
		return this.status === 400 && this.fieldErrors.length > 0;
	}
}
