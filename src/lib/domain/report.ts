export interface PeriodSummary {
	from: string;
	to: string;
}

export interface CashSummary {
	received: number;
}

export interface BillingSummary {
	settledInvoices: number;
	settledAmount: number;
	averageSettledInvoice: number;
	outstandingInvoices: number;
	outstandingAmount: number;
	outstandingAsOf: string;
}

export interface SalesSummary {
	cash: CashSummary;
	billing: BillingSummary;
}

export interface OperationsSummary {
	openDinings: number;
	occupiedTables: number;
	availableTables: number;
	ordersInProgress: number;
}

export interface TopMenuEntry {
	menuId: number | null;
	name: string | null;
	qty: number;
	revenue: number;
}

export interface RecentActivityEntry {
	orderId: number | null;
	orderNumber: string | null;
	status: string | null;
	billingStatus: string | null;
	orderTotalPrice: number;
	createdAt: string;
}

export interface DashboardSummary {
	period: PeriodSummary;
	sales: SalesSummary;
	operations: OperationsSummary;
	topMenus: TopMenuEntry[];
	recentActivity: RecentActivityEntry[];
}

export interface DashboardSummaryQuery {
	from?: string;
	to?: string;
}
