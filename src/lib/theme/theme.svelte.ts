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

	setTheme(theme: ThemeId) {
		this.current = theme;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
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
		this.setTheme(isThemeId(saved) ? saved : DEFAULT_THEME);
	}
}

export const themeStore = new ThemeStore();
