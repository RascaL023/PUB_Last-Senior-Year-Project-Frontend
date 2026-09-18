export type ThemeId = 'kanagawa' | 'glass-cafe' | 'neurobrutalism' | 'dribbble';

export const THEMES: { id: ThemeId; label: string }[] = [
	{ id: 'kanagawa', label: 'Kanagawa Dragon' },
	{ id: 'glass-cafe', label: 'Glass Cafe' },
	{ id: 'neurobrutalism', label: 'Neurobrutalism' },
	{ id: 'dribbble', label: 'Dribbble Pop' }
];

const STORAGE_KEY = 'cafe-theme';
const DEFAULT_THEME: ThemeId = 'neurobrutalism';

function isThemeId(value: string | null): value is ThemeId {
	return value === 'kanagawa' || value === 'glass-cafe' || value === 'neurobrutalism' || value === 'dribbble';
}

class ThemeStore {
	current = $state<ThemeId>(DEFAULT_THEME);

	setTheme(theme: ThemeId, origin?: { x: number; y: number }) {
		this.current = theme;
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			const apply = () => root.setAttribute('data-theme', theme);
			if (origin) {
				root.style.setProperty('--theme-origin', `${origin.x}px ${origin.y}px`);
			}
			const reduced =
				typeof matchMedia !== 'undefined' &&
				matchMedia('(prefers-reduced-motion: reduce)').matches;
			const vt = (
				document as Document & {
					startViewTransition?: (cb: () => void) => void;
				}
			).startViewTransition;
			if (vt && !reduced) vt.call(document, apply);
			else apply();
		}
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch {
			return;
		}
	}

	init() {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem(STORAGE_KEY);
		} catch {
			saved = null;
		}
		const theme = isThemeId(saved) ? saved : DEFAULT_THEME;
		this.current = theme;
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			// Idempotent dan tanpa animasi: init hanya memulihkan atribut,
			// tidak pernah memutar View Transition (itu hanya untuk klik eksplisit).
			if (root.getAttribute('data-theme') === theme) return;
			root.setAttribute('data-theme', theme);
		}
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch {
			return;
		}
	}
}

export const themeStore = new ThemeStore();
