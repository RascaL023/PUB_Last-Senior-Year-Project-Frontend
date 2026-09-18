type ToastType = 'success' | 'error' | 'info';

interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

let nextId = 1;

const toasts = $state<Toast[]>([]);

export const toastStore = {
	get items(): Toast[] {
		return toasts;
	},

	show(message: string, type: ToastType = 'info'): void {
		const id = nextId++;
		toasts.push({ id, message, type });
		setTimeout(() => {
			toasts.splice(toasts.findIndex(t => t.id === id), 1);
		}, 4000);
	},

	dismiss(id: number): void {
		const idx = toasts.findIndex(t => t.id === id);
		if (idx !== -1) toasts.splice(idx, 1);
	}
};
