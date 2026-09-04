export type TableStatus = 'AVAILABLE' | 'OCCUPIED';

export interface DiningTableRequest {
	tableNumber: string;
}

export type DiningTablePutRequest = DiningTableRequest;

export interface DiningTablePatchRequest {
	tableNumber?: string;
}

export interface DiningTableResponse {
	id: number;
	tableNumber: string;
	status: TableStatus;
	createdAt: string;
	updatedAt: string;
}

export interface TableListQuery {
	keyword?: string;
	page?: number;
	size?: number;
	sort?: string;
}
