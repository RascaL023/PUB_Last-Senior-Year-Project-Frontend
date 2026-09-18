import type { PagedResult } from '$lib/core/types/pagination';
import type { InvoiceListQuery, InvoiceRequest, InvoiceResponse } from '../invoice';

export interface InvoiceRepository {
	create(payload: InvoiceRequest): Promise<InvoiceResponse>;
	list(query?: InvoiceListQuery): Promise<PagedResult<InvoiceResponse>>;
	getById(id: number): Promise<InvoiceResponse>;
	void(id: number): Promise<InvoiceResponse>;
	remove(id: number): Promise<void>;
}
