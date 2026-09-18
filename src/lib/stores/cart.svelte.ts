import type { MenuResponse } from '$lib/domain/menu';
import type { GuestOrderItemRequest } from '$lib/domain/guest-dining';

const STORAGE_KEY = 'hysteria-cafe-cart-v1';

export interface CartSelection {
	modifierTypeId: number;
	modifierTypeName: string;
	modifierOptionId: number;
	name: string;
	additionalPrice: number;
}

export interface CartLine {
	key: string;
	menuId: number;
	menuName: string;
	image: string | null;
	basePrice: number;
	quantity: number;
	selections: CartSelection[];
	unitTotal: number;
}

export function buildLineKey(menuId: number, optionIds: number[]): string {
	return `${menuId}:${[...optionIds].sort((a, b) => a - b).join(',')}`;
}

function toSelections(menu: MenuResponse, optionIds: number[]): CartSelection[] {
	const out: CartSelection[] = [];
	for (const type of menu.modifierTypes ?? []) {
		for (const opt of type.options ?? []) {
			if (optionIds.includes(opt.id)) {
				out.push({
					modifierTypeId: type.id,
					modifierTypeName: type.name,
					modifierOptionId: opt.id,
					name: opt.name,
					additionalPrice: opt.additionalPrice
				});
			}
		}
	}
	return out;
}

function readStored(): CartLine[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as CartLine[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

class CartStore {
	lines = $state<CartLine[]>([]);
	isOpen = $state(false);
	pickerMenu = $state<MenuResponse | null>(null);

	constructor() {
		if (typeof localStorage !== 'undefined') {
			this.lines = readStored();
		}
	}

	get itemCount(): number {
		return this.lines.reduce((sum, line) => sum + line.quantity, 0);
	}

	get subtotal(): number {
		return this.lines.reduce((sum, line) => sum + line.unitTotal * line.quantity, 0);
	}

	get isEmpty(): boolean {
		return this.lines.length === 0;
	}

	private persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lines));
		} catch {
			return;
		}
	}

	openPicker(menu: MenuResponse): void {
		if (!menu.isAvailable) return;
		if (!menu.modifierTypes || menu.modifierTypes.length === 0) {
			this.add(menu, []);
			return;
		}
		this.pickerMenu = menu;
	}

	closePicker(): void {
		this.pickerMenu = null;
	}

	add(menu: MenuResponse, optionIds: number[], quantity = 1): CartLine {
		const selections = toSelections(menu, optionIds);
		const extras = selections.reduce((sum, s) => sum + s.additionalPrice, 0);
		const key = buildLineKey(menu.id, optionIds);
		const existing = this.lines.find((line) => line.key === key);
		if (existing) {
			existing.quantity += quantity;
		} else {
			this.lines.push({
				key,
				menuId: menu.id,
				menuName: menu.name,
				image: menu.imageUrls?.[0] ?? null,
				basePrice: menu.basePrice,
				quantity,
				selections,
				unitTotal: menu.basePrice + extras
			});
		}
		this.persist();
		return this.lines.find((line) => line.key === key) as CartLine;
	}

	setQuantity(key: string, quantity: number): void {
		const line = this.lines.find((l) => l.key === key);
		if (!line) return;
		if (quantity <= 0) {
			this.lines = this.lines.filter((l) => l.key !== key);
		} else {
			line.quantity = quantity;
		}
		this.persist();
	}

	remove(key: string): void {
		this.lines = this.lines.filter((l) => l.key !== key);
		this.persist();
	}

	/** Petakan isi keranjang ke payload `POST /guest/dinings/{token}/orders`. */
	toGuestItems(): GuestOrderItemRequest[] {
		return this.lines.map((line) => ({
			menuId: line.menuId,
			quantity: line.quantity,
			modifiers: line.selections.map((s) => ({ modifierOptionId: s.modifierOptionId }))
		}));
	}

	clear(): void {
		this.lines = [];
		this.persist();
	}

	open(): void {
		this.isOpen = true;
	}

	close(): void {
		this.isOpen = false;
	}
}

export const cart = new CartStore();

export function describeSelections(line: CartLine): string {
	return line.selections.map((s) => s.name).join(', ');
}
