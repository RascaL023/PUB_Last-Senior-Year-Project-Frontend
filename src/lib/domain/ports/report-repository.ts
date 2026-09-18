import type { PagedResult } from '$lib/core/types/pagination';
import type { DashboardSummary, DashboardSummaryQuery } from '../report';

export interface ReportRepository {
	getDashboardSummary(query?: DashboardSummaryQuery): Promise<DashboardSummary | null>;
}
