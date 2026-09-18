import { createInMemoryTokenStore, type TokenStore } from '$lib/core/auth/token-store';
import type { HttpClient } from '$lib/core/http/http-client';
import { createFetchHttpClient } from './fetch-http-client';
import { createGuestDiningRepository } from './repositories/guest-dining-repository';
import { createGuestOrderRepository } from './repositories/guest-order-repository';
import { createAuthRepository } from './repositories/auth-repository';
import { createAdminMenuRepository } from './repositories/admin-menu-repository';
import { createCustomerRepository } from './repositories/customer-repository';
import { createAuthorityRepository } from './repositories/authority-repository';
import { createDiningRepository } from './repositories/dining-repository';
import { createEmployeeRepository } from './repositories/employee-repository';
import { createImageRepository } from './repositories/image-repository';
import { createInvoiceRepository } from './repositories/invoice-repository';
import { createKitchenRepository } from './repositories/kitchen-repository';
import { createMenuCategoryRepository } from './repositories/menu-category-repository';
import { createMenuRepository } from './repositories/menu-repository';
import { createModifierRepository } from './repositories/modifier-repository';
import { createOrderRepository } from './repositories/order-repository';
import { createPaymentRepository } from './repositories/payment-repository';
import { createReportRepository } from './repositories/report-repository';
import { createRoleRepository } from './repositories/role-repository';
import { createTableRepository } from './repositories/table-repository';
import { createUserRepository } from './repositories/user-repository';

export interface Api {
	http: HttpClient;
	tokens: TokenStore;
	auth: ReturnType<typeof createAuthRepository>;
	adminMenus: ReturnType<typeof createAdminMenuRepository>;
	customers: ReturnType<typeof createCustomerRepository>;
	users: ReturnType<typeof createUserRepository>;
	roles: ReturnType<typeof createRoleRepository>;
	authorities: ReturnType<typeof createAuthorityRepository>;
	menus: ReturnType<typeof createMenuRepository>;
	categories: ReturnType<typeof createMenuCategoryRepository>;
	modifiers: ReturnType<typeof createModifierRepository>;
	orders: ReturnType<typeof createOrderRepository>;
	payments: ReturnType<typeof createPaymentRepository>;
	dinings: ReturnType<typeof createDiningRepository>;
	employees: ReturnType<typeof createEmployeeRepository>;
	guestDinings: ReturnType<typeof createGuestDiningRepository>;
	guestOrders: ReturnType<typeof createGuestOrderRepository>;
	invoices: ReturnType<typeof createInvoiceRepository>;
	tables: ReturnType<typeof createTableRepository>;
	images: ReturnType<typeof createImageRepository>;
	report: ReturnType<typeof createReportRepository>;
	kitchen: ReturnType<typeof createKitchenRepository>;
}

let instance: Api | null = null;

export function createApi(): Api {
	const tokens = createInMemoryTokenStore();
	const http = createFetchHttpClient(tokens);
	return {
		http,
		tokens,
		auth: createAuthRepository(http, tokens),
		adminMenus: createAdminMenuRepository(http),
		customers: createCustomerRepository(http),
		users: createUserRepository(http),
		roles: createRoleRepository(http),
		authorities: createAuthorityRepository(http),
		menus: createMenuRepository(http),
		categories: createMenuCategoryRepository(http),
		modifiers: createModifierRepository(http),
		orders: createOrderRepository(http),
		payments: createPaymentRepository(http),
		dinings: createDiningRepository(http),
		employees: createEmployeeRepository(http),
		guestDinings: createGuestDiningRepository(http),
		guestOrders: createGuestOrderRepository(http),
		invoices: createInvoiceRepository(http),
		tables: createTableRepository(http),
		images: createImageRepository(http),
		report: createReportRepository(http),
		kitchen: createKitchenRepository(http)
	};
}

export function getApi(): Api {
	if (!instance) instance = createApi();
	return instance;
}
