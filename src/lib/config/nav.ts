/**
 * Single source of truth untuk navigasi aplikasi.
 * Dipakai oleh Sidebar (menu tampil) dan guard `(app)/+layout.svelte`
 * (halaman boleh dibuka atau tidak) supaya keduanya tidak pernah drift.
 */

export interface NavItem {
	label: string;
	href: string;
	icon: string;
	/** Salah satu authority ini cukup untuk membuka halaman. Kosong = cukup login. */
	authorities?: string[];
	/** Cocokkan juga sub-path (mis. /orders/12 untuk /orders). */
	prefix?: boolean;
	/** Item sekunder (tampil di grup bawah pada layar sempit). */
	description?: string;
}

export interface NavSection {
	label: string;
	items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
	{
		label: 'Operasional',
		items: [
			{
				label: 'Dashboard',
				href: '/reports',
				icon: 'dashboard',
				authorities: ['report.read'],
				description: 'Ringkasan penjualan & operasional'
			},
			{
				label: 'Pesanan',
				href: '/orders',
				icon: 'receipt',
				authorities: ['order.read'],
				prefix: true,
				description: 'Daftar & detail pesanan'
			},
			{
				label: 'Dapur',
				href: '/kitchen',
				icon: 'kitchen',
				authorities: ['kitchen.read'],
				description: 'Antrean tiket dapur'
			},
			{
				label: 'Lantai',
				href: '/floor',
				icon: 'floor',
				authorities: ['table.read', 'dining.read'],
				description: 'Kondisi meja & sesi berjalan'
			}
		]
	},
	{
		label: 'Meja & Sesi',
		items: [
			{
				label: 'Sesi Meja',
				href: '/dinings',
				icon: 'table',
				authorities: ['dining.read'],
				description: 'Buka, pesan, dan tutup sesi meja'
			},
			{
				label: 'Kelola Meja',
				href: '/tables',
				icon: 'floor',
				authorities: ['table.read'],
				description: 'Tambah, ubah, hapus meja'
			}
		]
	},
	{
		label: 'Keuangan',
		items: [
			{
				label: 'Tagihan',
				href: '/invoices',
				icon: 'receipt',
				authorities: ['invoice.read'],
				description: 'Tagihan, pelunasan, dan void'
			},
			{
				label: 'Pembayaran',
				href: '/payments',
				icon: 'wallet',
				authorities: ['payment.read'],
				description: 'Pembayaran tunai & Xendit'
			}
		]
	},
	{
		label: 'Katalog',
		items: [
			{
				label: 'Menu',
				href: '/menus',
				icon: 'coffee',
				authorities: ['menu.read'],
				description: 'Menu, harga, dan gambar'
			},
			{
				label: 'Kategori & Modifier',
				href: '/catalog',
				icon: 'bread',
				authorities: ['menu-category.read', 'menu-modifier.read'],
				description: 'Kategori menu dan pilihan tambahan'
			}
		]
	},
	{
		label: 'Manajemen',
		items: [
			{
				label: 'Karyawan',
				href: '/employees',
				icon: 'users',
				authorities: ['employee.read'],
				description: 'Data karyawan & status kepegawaian'
			},
			{
				label: 'Pengguna & Peran',
				href: '/users',
				icon: 'user',
				authorities: ['user.read', 'role.read', 'authority.read'],
				description: 'Akun login, peran, dan otoritas'
			},
			{
				label: 'Pelanggan',
				href: '/customers',
				icon: 'heart',
				authorities: ['customer.read'],
				description: 'Data pelanggan & member'
			}
		]
	},
	{
		label: 'Akun',
		items: [
			{
				label: 'Akun Saya',
				href: '/my',
				icon: 'user',
				description: 'Profil dan riwayat saya'
			}
		]
	}
];

/** `order.read` cocok bila user punya `order.read` atau wildcard `order.*`. */
export function can(authorities: readonly string[], authority: string): boolean {
	if (authorities.includes(authority)) return true;
	const domain = authority.split('.')[0];
	return authorities.includes(`${domain}.*`);
}

export function canAny(authorities: readonly string[], required?: readonly string[]): boolean {
	if (!required || required.length === 0) return true;
	return required.some((authority) => can(authorities, authority));
}

/** Nav item mana yang "aktif" untuk pathname tertentu (longest prefix match). */
export function isNavActive(item: NavItem, pathname: string): boolean {
	if (pathname === item.href) return true;
	if (!item.prefix) return false;
	return pathname.startsWith(`${item.href}/`);
}

const GUARDABLE_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * Kembalikan authority yang dibutuhkan untuk pathname, atau null bila
 * halaman bebas (mis. /my yang cukup login).
 */
export function requiredAuthoritiesFor(pathname: string): string[] | null {
	const matches = GUARDABLE_ITEMS.filter((item) => isNavActive(item, pathname)).sort(
		(a, b) => b.href.length - a.href.length
	);
	const match = matches[0];
	if (!match || !match.authorities) return null;
	return match.authorities;
}

export function navItemFor(pathname: string): NavItem | null {
	const matches = GUARDABLE_ITEMS.filter((item) => isNavActive(item, pathname)).sort(
		(a, b) => b.href.length - a.href.length
	);
	return matches[0] ?? null;
}
