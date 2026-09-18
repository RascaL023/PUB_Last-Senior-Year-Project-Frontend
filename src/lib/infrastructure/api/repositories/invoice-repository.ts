import { API_V1 } from '$lib/config/env';
import type { HttpClient } from '$lib/core/http/http-client';
import type { InvoiceListQuery, InvoiceRequest, InvoiceResponse } from '$lib/domain/invoice';
import type { InvoiceRepository } from '$lib/domain/ports/invoice-repository';

const BASE = `${API_V1}/invoices`;

export function createInvoiceRepository(http: HttpClient): InvoiceRepository {
	return {
		create: (payload: InvoiceRequest) =>
			http.post<InvoiceResponse>(BASE, payload) as Promise<InvoiceResponse>,
		list: (query?: InvoiceListQuery) => http.getPaged<InvoiceResponse>(BASE, { query }),
		getById: (id: number) =>
			http.getSingle<InvoiceResponse>(`${BASE}/${id}`) as Promise<InvoiceResponse>,
		void: (id: number) =>
			http.post<InvoiceResponse>(`${BASE}/${id}/void`, undefined) as Promise<InvoiceResponse>,
		remove: (id: number) => http.remove(`${BASE}/${id}`)
	};
}
