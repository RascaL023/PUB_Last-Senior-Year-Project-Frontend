import type { HttpClient } from '$lib/core/http/http-client';
import type { DashboardSummary, DashboardSummaryQuery } from '$lib/domain/report';
import type { ReportRepository } from '$lib/domain/ports/report-repository';

const BASE = '/api/v1/reports/dashboard/summary';

export function createReportRepository(http: HttpClient): ReportRepository {
	return {
		getDashboardSummary: (query?: DashboardSummaryQuery) =>
			http.getSingle<DashboardSummary>(BASE, { query })
	};
}
