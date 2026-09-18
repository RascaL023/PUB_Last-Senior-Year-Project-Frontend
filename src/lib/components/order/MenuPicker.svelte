<script module lang="ts">
	import type { MenuResponse } from '$lib/domain/menu';
	import type { OrderItemRequest } from '$lib/domain/order';

	export interface MenuPickerLine {
		menuId: number | null;
		quantity: number;
		options: number[];
	}

	export function emptyLine(): MenuPickerLine {
		return { menuId: null, quantity: 1, options: [] };
	}

	/** Line yang dipilih user → payload `items` BE. Line kosong dibuang. */
	export function toOrderItems(lines: MenuPickerLine[]): OrderItemRequest[] {
		return lines
			.filter((line) => line.menuId !== null && line.quantity >= 1)
			.map((line) => ({
				menuId: line.menuId as number,
				quantity: line.quantity,
				modifiers: line.options.map((modifierOptionId) => ({ modifierOptionId }))
			}));
	}

	/** Modifier wajib (minSelection > 0) yang belum dipenuhi. */
	export function missingRequiredModifiers(
		lines: MenuPickerLine[],
		menus: MenuResponse[]
	): string[] {
		const missing: string[] = [];
		for (const line of lines) {
			if (line.menuId === null) continue;
			const menu = menus.find((m) => m.id === line.menuId);
			if (!menu?.modifierTypes) continue;
			for (const modType of menu.modifierTypes) {
				if (modType.minSelection <= 0) continue;
				const selected = modType.options.filter((opt) => line.options.includes(opt.id)).length;
				if (selected < modType.minSelection) {
					missing.push(`${menu.name} → ${modType.name} (min ${modType.minSelection})`);
				}
			}
		}
		return missing;
	}
</script>

<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		menus,
		lines = $bindable<MenuPickerLine[]>([]),
		onchange = () => {}
	}: {
		menus: MenuResponse[];
		lines?: MenuPickerLine[];
		onchange?: () => void;
	} = $props();

	function update(mutator: (draft: MenuPickerLine[]) => void) {
		mutator(lines);
		lines = [...lines];
		onchange();
	}

	function addLine() {
		update((draft) => draft.push(emptyLine()));
	}

	function removeLine(index: number) {
		update((draft) => draft.splice(index, 1));
	}

	function setMenu(index: number, menuId: number | null) {
		update((draft) => {
			draft[index].menuId = menuId;
			draft[index].options = [];
		});
	}

	function setQuantity(index: number, quantity: number) {
		update((draft) => {
			draft[index].quantity = Math.max(1, quantity || 1);
		});
	}

	function toggleOption(index: number, optionId: number, maxSelection: number) {
		update((draft) => {
			const line = draft[index];
			if (line.options.includes(optionId)) {
				line.options = line.options.filter((id) => id !== optionId);
				return;
			}
			if (maxSelection === 1) {
				const menu = menus.find((m) => m.id === line.menuId);
				const modType = menu?.modifierTypes?.find((t) =>
					t.options.some((option) => option.id === optionId)
				);
				const siblings = new Set(modType?.options.map((option) => option.id) ?? []);
				line.options = [...line.options.filter((id) => !siblings.has(id)), optionId];
				return;
			}
			line.options = [...line.options, optionId];
		});
	}

	function menuOf(menuId: number | null): MenuResponse | undefined {
		return menus.find((menu) => menu.id === menuId);
	}
</script>

<div class="flex flex-col gap-3">
	{#each lines as line, index (index)}
		<div class="bg-subtle border-linemuted rounded-btn border-rice p-3">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
				<label class="flex flex-1 flex-col gap-1 text-xs font-bold text-ink">
					Menu
					<select
						value={line.menuId ?? ''}
						onchange={(e) => setMenu(index, e.currentTarget.value ? Number(e.currentTarget.value) : null)}
						class="bg-app text-ink border-line border-rice rounded-btn px-3 py-2 text-sm font-bold"
					>
						<option value="">Pilih menu...</option>
						{#each menus as menu (menu.id)}
							<option value={menu.id}>{menu.name}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1 text-xs font-bold text-ink">
					Qty
					<input
						type="number"
						min="1"
						value={line.quantity}
						oninput={(e) => setQuantity(index, Number(e.currentTarget.value))}
						class="bg-app text-ink border-line border-rice rounded-btn w-20 px-3 py-2 text-sm font-mono"
					/>
				</label>
				<button
					type="button"
					onclick={() => removeLine(index)}
					aria-label="Hapus baris"
					class="bg-app text-muted hover:text-danger rounded-btn border-rice border-line rice-press px-3 py-2 text-xs font-bold"
				>
					<Icon name="trash" class="h-4 w-4" />
				</button>
			</div>

			{#if menuOf(line.menuId)?.modifierTypes?.length}
				<div class="mt-3 flex flex-col gap-2">
					{#each menuOf(line.menuId)?.modifierTypes ?? [] as modType (modType.id)}
						<div>
							<p class="text-ink mb-1 text-xs font-bold">
								{modType.name}
								{#if modType.minSelection > 0}
									<span class="text-danger font-normal">· wajib min {modType.minSelection}</span>
								{/if}
							</p>
							<div class="flex flex-wrap gap-1">
								{#each modType.options as option (option.id)}
									<button
										type="button"
										onclick={() => toggleOption(index, option.id, modType.maxSelection)}
										aria-pressed={line.options.includes(option.id)}
										class="rounded-pill border-rice border-line rice-press px-2 py-1 font-mono text-xs font-bold
											{line.options.includes(option.id)
											? 'bg-accent text-inverted'
											: 'bg-card text-muted'}"
									>
										{option.name}
										{#if option.additionalPrice > 0}
											<span class="opacity-70">
												+{option.additionalPrice.toLocaleString('id-ID')}
											</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	<button
		type="button"
		onclick={addLine}
		class="bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press self-start px-3 py-2 text-xs font-bold"
	>
		<Icon name="plus" class="h-3.5 w-3.5" /> Tambah baris
	</button>
</div>
