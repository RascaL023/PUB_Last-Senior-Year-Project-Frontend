# Theme System Contract — Multi-Theme "Linux Rice" Design System

Dokumen ini mendefinisikan Spesifikasi Teknis & Single Source of Truth (SSOT) untuk 4 tema visual pada Frontend Café. Sistem tema ini dibangun di atas **CSS Custom Properties** yang dipetakan langsung ke **Tailwind CSS v4 `@theme`**, sehingga pergantian tema tidak hanya mengubah warna, tetapi juga font, border-radius, ketebalan border, bayangan (shadow physics), hingga efek blur/glassmorphism.

---

## 1. Arsitektur Single Source of Truth (SSOT)

Seluruh komponen UI **WAJIB** memakai utility Tailwind v4 di bawah ini — hasil mapping `@theme inline` di
`src/routes/layout.css` terhadap CSS variable di `src/lib/styles/themes.css`.
Dilarang memakai nilai hardcoded (`#...`, `rounded-xl`, `shadow-lg`, `font-mono`, `bg-red-500`, dsb).

### 1.1 Layout, Structure & Physics Tokens (nama class aktual)
| Class Tailwind | Variabel CSS | Deskripsi Penggunaan |
|---|---|---|
| `font-theme` | `--theme-font` | Font utama (body) seluruh halaman |
| `font-display` | `--theme-font-display` | Font judul/hero — `h1`, `h2`, brand header |
| `font-mono` | `--theme-font-mono` | Font angka/badge — harga, status, label kecil (override theme-aware atas `font-mono` bawaan Tailwind) |
| `bg-app` | `--theme-bg-app` | Background dasar / canvas aplikasi |
| `bg-shell` | `--theme-bg-shell` | Outer layout shell / wrapper utama |
| `bg-card` | `--theme-bg-card` | Container / permukaan utama kartu |
| `bg-card-hover` | `--theme-bg-card-hover` | State hover kartu/tile (via `rice-lift` atau `hover:bg-card-hover`) |
| `bg-subtle` | `--theme-bg-subtle` | Input, tile internal, pill base |
| `bg-overlay` | `--theme-bg-overlay` | Backdrop modal / overlay |
| `text-ink` | `--theme-text-main` | Teks judul & isi utama |
| `text-muted` | `--theme-text-muted` | Teks keterangan / placeholder |
| `text-faint` | `--theme-text-subtle` | Teks meta kecil |
| `text-inverted` | `--theme-text-inverted` | Teks di atas tombol/badge solid |
| `border-line` | `--theme-border-color` | Warna garis tepi utama (`border-line`) |
| `border-linemuted` | `--theme-border-muted` | Divider / garis halus |
| `border-rice` | `--theme-border-w` | Ketebalan border per tema (`1px` / `2px`) — selalu pasangkan dengan `border-line` |
| `rounded-shell` | `--theme-radius-shell` | Radius outer shell |
| `rounded-card` | `--theme-radius-card` | Radius kartu |
| `rounded-btn` | `--theme-radius-btn` | Radius tombol & elemen interaktif |
| `rounded-pill` | `--theme-radius-pill` | Radius pill / badge status |
| `shadow-rice` | `--theme-shadow` | Bayangan kartu/tombol utama |
| `shadow-ricesm` | `--theme-shadow-sm` | Bayangan elemen kecil (pill, icon-btn) |
| `shadow-ricelg` | `--theme-shadow-lg` | Bayangan modal / outer shell |
| `backdrop-blur-rice` | `--theme-blur` | Blur kaca (`0px`–`20px` sesuai tema) |

### 1.2 Full Semantic & Accent Color Palette Tokens (nama class aktual)
| Class Tailwind | Variabel CSS | Penggunaan Utama |
|---|---|---|
| `bg-accent` / `text-accent` | `--theme-accent-primary` | Tombol/aksi utama (CTA) |
| `bg-accent2` / `text-accent2` | `--theme-accent-secondary` | Sorotan sekunder |
| `bg-caramel` | `--theme-color-caramel` | Varian kopi/espresso |
| `bg-latte` | `--theme-color-latte` | Krem susu / highlight warm netral |
| `bg-leaf` | `--theme-color-green` | Sukses, status buka, matcha |
| `bg-blossom` | `--theme-color-pink` | Notifikasi, promo, favorit |
| `bg-ember` | `--theme-color-orange` | Warning, preparing, roast |
| `bg-honey` | `--theme-color-yellow` | Rating, star, tag cerah |
| `bg-grape` | `--theme-color-purple` | Kategori, vibes |
| `bg-sky` | `--theme-color-blue` | Info, wifi |
| `bg-danger` | `--theme-color-red` | Error, tutup, hapus |
| `bg-aqua` | `--theme-color-cyan` | Tag tambahan / s2s |

---

## 2. Definisi Lengkap 4 Presets Tema

### 2.1 Kanagawa Dragon (`data-theme="kanagawa"`)
*Inspirasi: Palet Resmi Kanagawa Dragon (Dark, Earthy, Traditional Japanese Roastery)*

* **Vibe:** Gelap, hangat, earthy, dengan nuansa kayu bakar dan daun teh tradisional khas Jepang.
* **Typography (dominan Maple Mono):** body + mono `Maple Mono NF` (self-host `static/fonts/maple-mono/`),
  display `Shippori Mincho B1` (Google Fonts, serif tradisional)

#### Full CSS Tokens Spec:
```css
[data-theme="kanagawa"] {
  --theme-font: 'Maple Mono NF', ui-monospace, monospace;
  --theme-font-display: 'Shippori Mincho B1', 'Maple Mono NF', serif;
  --theme-font-mono: 'Maple Mono NF', ui-monospace, monospace;
  
  /* Canvas & Containers (Kanagawa Dragon Blacks) */
  --theme-bg-app: #121212;             /* dragonBlack1 */
  --theme-bg-shell: #181616;           /* dragonBlack2 */
  --theme-bg-card: #1d1c1d;            /* dragonBlack3 */
  --theme-bg-card-hover: #282727;      /* dragonBlack4 */
  --theme-bg-subtle: #282727;          /* dragonBlack4 */
  --theme-bg-overlay: rgba(13, 12, 12, 0.85); /* dragonBlack0 opacity */

  /* Text Hierarchy (Kanagawa Dragon Whites & Grays) */
  --theme-text-main: #c5c9c5;          /* dragonWhite */
  --theme-text-muted: #a6a69c;         /* dragonWhite2 */
  --theme-text-subtle: #8a8a80;        /* dragonGray */
  --theme-text-inverted: #121212;      /* dragonBlack1 */

  /* Primary Accents */
  --theme-accent-primary: #8ba4b0;     /* dragonBlue */
  --theme-accent-secondary: #b6927b;   /* dragonOrange / Warm Mocha */

  /* Extended Semantic Colors */
  --theme-color-caramel: #b6927b;      /* dragonOrange */
  --theme-color-latte: #c4b28a;        /* dragonYellow */
  --theme-color-green: #87a987;        /* dragonGreen */
  --theme-color-pink: #a292a3;         /* dragonPink / Plum */
  --theme-color-orange: #e98a00;       /* dragonOrange2 */
  --theme-color-yellow: #c4b28a;       /* dragonYellow */
  --theme-color-purple: #8992a7;       /* dragonViolet */
  --theme-color-blue: #8ba4b0;         /* dragonBlue */
  --theme-color-red: #c4746e;          /* dragonRed */
  --theme-color-cyan: #8ea4a2;         /* dragonAqua */

  /* Borders & Physics */
  --theme-border-color: rgba(197, 201, 197, 0.15);
  --theme-border-muted: rgba(197, 201, 197, 0.08);
  --theme-border-w: 1px;
  --theme-radius-shell: 18px;
  --theme-radius-card: 12px;
  --theme-radius-btn: 8px;
  --theme-radius-pill: 999px;
  --theme-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.5);
  --theme-shadow-sm: 0 4px 12px -2px rgba(0, 0, 0, 0.35);
  --theme-shadow-lg: 0 16px 40px -6px rgba(0, 0, 0, 0.65);
  --theme-blur: 0px;
}
```

---

### 2.2 Glass / Blur Minimalist (`data-theme="glass-cafe"`)
*Inspirasi: Floating Frosted Glass UI & Niri Rice (Clean, Lightweight & Elegant)*

* **Vibe:** Transparan, melayang di atas canvas warm espresso, mewah, bersih, dan modern.
* **Typography:** body tetap `Geist`/`Inter`; display `Fraunces` (serif hangat, untuk hero/header)

#### Full CSS Tokens Spec:
```css
[data-theme="glass-cafe"] {
  --theme-font: 'Geist', 'Inter', sans-serif;
  --theme-font-display: 'Fraunces', 'Geist', serif;
  --theme-font-mono: 'Geist', 'Inter', sans-serif;
  
  /* Canvas & Containers (Warm Dark Espresso Canvas) */
  --theme-bg-app: linear-gradient(140deg, #140f0d, #1c1512 50%, #0f0b0a);
  --theme-bg-shell: rgba(255, 255, 255, 0.04);
  --theme-bg-card: rgba(255, 255, 255, 0.07);
  --theme-bg-card-hover: rgba(255, 255, 255, 0.12);
  --theme-bg-subtle: rgba(255, 255, 255, 0.12);
  --theme-bg-overlay: rgba(10, 8, 7, 0.75);

  /* Text Hierarchy */
  --theme-text-main: #f8fafc;          /* Pure White */
  --theme-text-muted: #a1a1aa;         /* Zinc Muted Gray */
  --theme-text-subtle: #71717a;        /* Darker Muted */
  --theme-text-inverted: #0f0b0a;      /* Dark Base */

  /* Primary Accents */
  --theme-accent-primary: #c68d5a;     /* Caramel Coffee */
  --theme-accent-secondary: #f8fafc;   /* Bright White Accent */

  /* Extended Semantic Colors */
  --theme-color-caramel: #c68d5a;
  --theme-color-latte: #e7d3b8;
  --theme-color-green: #4ade80;
  --theme-color-pink: #f472b6;
  --theme-color-orange: #fb923c;
  --theme-color-yellow: #facc15;
  --theme-color-purple: #c084fc;
  --theme-color-blue: #38bdf8;
  --theme-color-red: #f87171;
  --theme-color-cyan: #22d3ee;

  /* Borders & Physics */
  --theme-border-color: rgba(255, 255, 255, 0.16);
  --theme-border-muted: rgba(255, 255, 255, 0.08);
  --theme-border-w: 1px;
  --theme-radius-shell: 28px;
  --theme-radius-card: 20px;
  --theme-radius-btn: 12px;
  --theme-radius-pill: 999px;
  --theme-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -12px rgba(0, 0, 0, 0.5);
  --theme-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --theme-shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.3), 0 24px 48px -16px rgba(0, 0, 0, 0.55);
  --theme-blur: 20px;
}
```

---

### 2.3 Neurobrutalism (`data-theme="neurobrutalism"`)
*Inspirasi: Exact 1:1 Reference dari `mockup.test/index.html` (Branch `feature/mock-up`)*

* **Vibe:** Playful retro terminal rice, 2px ink outlines, flat offset hard shadows, dan palet warna cafe pastel.
* **Typography:** body + mono `JetBrains Mono`; display `Archivo Black` (grotesque berat poster brutalist)

#### Full CSS Tokens Spec:
```css
[data-theme="neurobrutalism"] {
  --theme-font: 'JetBrains Mono', ui-monospace, monospace;
  --theme-font-display: 'Archivo Black', 'JetBrains Mono', sans-serif;
  --theme-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  
  /* Canvas & Containers (Exact from mockup.test/index.html) */
  --theme-bg-app: linear-gradient(140deg, #f3e7d3, #ecd7ba 40%, #f7ead6 70%, #e9d2b4);
  --theme-bg-shell: #f6eddd;             /* --shell */
  --theme-bg-card: #fbf5ea;              /* --card */
  --theme-bg-card-hover: #fffdf9;        /* lighter card */
  --theme-bg-subtle: #fff9f0;            /* --cream */
  --theme-bg-overlay: rgba(38, 25, 13, 0.6);

  /* Text Hierarchy */
  --theme-text-main: #26190d;            /* --ink */
  --theme-text-muted: #8a7a66;           /* --muted */
  --theme-text-subtle: #a08f7b;          /* subtle brown */
  --theme-text-inverted: #fff9f0;        /* cream */

  /* Primary Accents */
  --theme-accent-primary: #c68d5a;       /* --caramel */
  --theme-accent-secondary: #e7d3b8;     /* --latte */

  /* Extended Semantic Colors (Exact from mockup.test/index.html) */
  --theme-color-caramel: #c68d5a;        /* --caramel */
  --theme-color-latte: #e7d3b8;          /* --latte */
  --theme-color-green: #b8d19e;          /* --green */
  --theme-color-pink: #f4c4ba;           /* --pink */
  --theme-color-orange: #f3b58a;         /* --orange */
  --theme-color-yellow: #ecca7a;         /* --yellow */
  --theme-color-purple: #d3bfe8;         /* --purple */
  --theme-color-blue: #b9d2de;           /* --blue */
  --theme-color-red: #e07a5f;            /* terracotta red */
  --theme-color-cyan: #a8dadc;           /* soft aqua cyan */

  /* Geometry & Hard Shadow Physics */
  --theme-border-color: #26190d;         /* Ink Border */
  --theme-border-muted: rgba(38, 25, 13, 0.4);
  --theme-border-w: 2px;
  --theme-radius-shell: 24px;
  --theme-radius-card: 16px;
  --theme-radius-btn: 10px;
  --theme-radius-pill: 999px;
  --theme-shadow: 4px 4px 0px #26190d;   /* --sh Hard Flat Shadow */
  --theme-shadow-sm: 2.5px 2.5px 0px #26190d; /* --sh-sm */
  --theme-shadow-lg: 6px 6px 0px #26190d;
  --theme-blur: 0px;
}
```

##### Interaksi CSS Physics Neurobrutalism (implementasi aktual: class `rice-press`):
```css
[data-theme="neurobrutalism"] .rice-press:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3.5px 3.5px 0px #26190d;
}
[data-theme="neurobrutalism"] .rice-press:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
```

---

### 2.4 Dribbble Pop (`data-theme="dribbble"`)
*Inspirasi: Dribbble shot — kartu putih bersih di atas kanvas krem, CTA pink khas Dribbble, sudut membulat airy*

* **Vibe:** Terang, clean-sharp monokrom modern ala Dribbble shot — kartu putih tegas nyaris tanpa radius, tombol kapsul hitam, border nyaris tak terlihat, shadow hairline.
* **Typography:** body `Inter`; display + mono `Inter Tight` (700/800, tracking rapat — elegan minimalist)

#### Full CSS Tokens Spec:
```css
[data-theme="dribbble"] {
  --theme-font: 'Inter', sans-serif;
  --theme-font-display: 'Inter Tight', 'Inter', sans-serif;
  --theme-font-mono: 'Inter Tight', 'Inter', sans-serif;

  /* Canvas & Containers (putih clean) */
  --theme-bg-app: #faf9f7;
  --theme-bg-shell: #ffffff;
  --theme-bg-card: #ffffff;
  --theme-bg-card-hover: #faf9f7;
  --theme-bg-subtle: #f4f4f5;
  --theme-bg-overlay: rgba(13, 12, 34, 0.45);

  /* Text Hierarchy */
  --theme-text-main: #0d0c22;           /* Dribbble ink */
  --theme-text-muted: #6e6d7a;          /* Dribbble gray */
  --theme-text-subtle: #9e9ea7;         /* Lighter gray */
  --theme-text-inverted: #ffffff;       /* On-accent */

  /* Primary Accents (monokrom modern; pink hanya di --theme-color-pink untuk badge) */
  --theme-accent-primary: #18181b;      /* Modern near-black CTA */
  --theme-accent-secondary: #0d0c22;    /* Ink black */

  /* Extended Semantic Colors */
  --theme-color-caramel: #c68d5a;
  --theme-color-latte: #f3d5b8;
  --theme-color-green: #3abc7f;
  --theme-color-pink: #ea4c89;
  --theme-color-orange: #ff7847;
  --theme-color-yellow: #ffcf3f;
  --theme-color-purple: #9b6bff;
  --theme-color-blue: #4a9bff;
  --theme-color-red: #ff4d4f;
  --theme-color-cyan: #36c5f0;

  /* Geometry & Hairline Physics (kartu sharp, tombol kapsul, border nyaris hilang) */
  --theme-border-color: #efeae4;
  --theme-border-muted: #f5f1ec;
  --theme-border-w: 1px;
  --theme-radius-shell: 8px;
  --theme-radius-card: 6px;
  --theme-radius-btn: 999px;
  --theme-radius-pill: 999px;
  --theme-shadow: 0 1px 2px rgba(13, 12, 34, 0.04);
  --theme-shadow-sm: 0 1px 2px rgba(13, 12, 34, 0.04);
  --theme-shadow-lg: 0 8px 24px -12px rgba(13, 12, 34, 0.12);
  --theme-blur: 0px;
}
```

---

## 2.5 Motion Signature per Tema (`.rice-press` / `.rice-lift`)

Semua tombol interaktif memakai class `rice-press`, kartu yang bisa di-hover memakai `rice-lift`.
Base transition `transform + box-shadow 0.16s ease`, dinonaktifkan saat `prefers-reduced-motion`.

| Tema | Hover | Active | Ciri khas |
|---|---|---|---|
| `kanagawa` | `translateY(-1px)`, shadow deepen, border kilau wave-blue | `translateY(0)`, shadow susut | Tenang, kalem |
| `glass-cafe` | `translateY(-2px) scale(1.01)` + sheen sweep `::after` 0.6s | `scale(0.98)` | Floating glossy |
| `neurobrutalism` | `translate(-1px,-1px)`, shadow `3.5px` | `translate(2px,2px)`, shadow hilang | Tactile press (mockup) |
| `dribbble` | tukar BG↔FG 0.3s `ease`: solid→outline transparan, subtle/ghost→solid hitam, nav-link→fill hitam | `brightness(.92)` | Invert swap |

### 2.6 Animasi saat ganti tema (View Transitions API)

Perpindahan tema memakai `document.startViewTransition` — snapshot lama memudar (`rice-theme-out`
0.5s) sementara snapshot baru masuk dengan circular wipe (`rice-theme-wipe` 0.5s `ease`) yang
meluas dari titik klik (`--theme-origin`, diisi `themeStore.setTheme(theme, {x, y})` dari koordinat
`MouseEvent` di `ThemeSwitcher`). Browser tanpa API atau `prefers-reduced-motion` → ganti instan
tanpa animasi. Tidak ada warna hardcoded; murni snapshot transisi browser.

---

## 3. Aturan Tegas Pembuatan UI & Komponen

Aturan di bawah bersifat mengikat untuk setiap komponen baru. Tujuannya: satu komponen ditulis sekali,
tampil benar di keempat tema tanpa branch `if theme`.

### 3.1 Hierarki layer (urutan permukaan, luar → dalam)
1. `bg-app` — canvas halaman (`<main>`).
2. `bg-shell` + `rounded-shell` + `shadow-ricelg` — wrapper layout utama (maks 1 per halaman).
3. `bg-card` + `rounded-card` + `shadow-rice` + `border-rice border-line` — kartu konten.
4. `bg-subtle` + `rounded-btn` — input, tile dalam kartu, pill base.

Dilarang menumpuk `bg-card` di atas `bg-card` tanpa pembeda (pakai `bg-subtle` atau divider `border-linemuted`).

### 3.1a Section shell & pengecualian seamless (dribbble)
- Section landing memakai class semantik `landing-shell` di atas pola box §3.1
  (`landing-shell border-line bg-shell rounded-shell shadow-ricelg border-rice ...`).
- Khusus `dribbble`, box dilepas via override theme (bukan branch markup):
  `background: transparent; border-color: transparent; box-shadow: none; border-radius: 0;`
  Border dibuat transparan (bukan dihapus) agar tidak ada layout-shift saat ganti tema.
- Ritme pengganti box di dribbble: hairline divider
  `.landing-shell + .landing-shell { border-top: 1px solid var(--theme-border-muted); }`
  + eyebrow editorial (`font-mono text-accent`, uppercase, tracking lebar) di atas `h2`.
- CTA accent-banner (`bg-accent`) di semua tema tetap boxed — banner-contained adalah pola baku
  Dribbble shot; full-bleed hanya untuk header & footer.

### 3.2 Pola baku tiap jenis komponen
- **Button primer:** `bg-accent text-inverted rounded-btn border-rice border-line rice-press`.
- **Button sekunder/ghost:** `bg-subtle text-muted hover:text-ink rounded-btn border-rice border-line rice-press`.
- **Badge status:** `rounded-pill border-rice border-line shadow-ricesm` + warna status (§3.3), teks `text-xs font-bold`.
- **Input:** `bg-subtle text-ink rounded-btn border-rice border-line`, placeholder memakai `text-muted`/`text-faint`.
- **Icon-button:** kotak `rounded-btn border-rice border-line shadow-ricesm rice-press`.
- **Kartu yang bisa diklik/di-hover:** tambahkan `rice-lift` (jangan tulis `hover:` manual untuk transform/shadow).
- **Modal/overlay:** backdrop `bg-overlay`, panel `bg-card rounded-card shadow-ricelg border-rice border-line`.
- **Fokus keyboard:** setiap elemen interaktif harus terlihat saat `:focus-visible`
  (outline memakai `accent`, offset 2px).
- **Font:** judul/hero/brand memakai `font-display`; harga, badge status, dan label angka memakai
  `font-mono`; body mengikuti `font-theme` otomatis. Dilarang `font-sans`/`font-serif`/font generik lain.

### 3.3 Pemetaan status domain → token warna (konsisten di semua modul)
| Status | Token |
|---|---|
| Order `CREATED` / Payment `PENDING` / Dining `OPEN` | `bg-honey` |
| Order `CONFIRMED`/`PREPARING`/`READY` | `bg-sky` / `bg-ember` / `bg-grape` |
| Order `COMPLETED` / Payment `PAID` / Table `AVAILABLE` / buka | `bg-leaf` |
| Order `CANCELLED` / Payment `FAILED`/`EXPIRED` / tutup | `bg-danger` |
| Payment `REFUNDED` / Table `OCCUPIED` | `bg-blossom` / `bg-ember` |
| Info umum / promo / kategori | `bg-aqua` / `bg-blossom` / `bg-grape` |

Teks di atas badge solid memakai `text-inverted` hanya bila kontras cukup;
bila tidak, pakai `text-ink`.

### 3.4 Larangan (akan ditolak saat review)
1. Warna hardcoded (`#fff`, `rgb(...)`, `bg-red-500`, `text-gray-400`, dsb) di file `.svelte`/`.css`.
2. Radius/border/shadow/font Tailwind generik (`rounded-xl`, `shadow-lg`, `border-2`, `font-mono`,
   `backdrop-blur-md`) — ganti dengan padanan `rounded-*/shadow-*/border-rice/font-theme/backdrop-blur-rice`.
3. `transition`/`hover:scale`/`hover:shadow` manual pada tombol & kartu — pakai `rice-press` / `rice-lift`.
4. Branch per tema di markup (`{#if theme === ...}` untuk styling) — selesaikan lewat token.
5. Opacity untuk teks muted (`text-ink/60`) — pakai `text-muted` / `text-faint`.

### 3.5 Checklist kepatuhan tiap komponen baru
- [ ] Render dicek di 4 tema via `ThemeSwitcher` (tidak ada teks hilang / border lenyap).
- [ ] Semua warna/radius/shadow/font berasal dari §1.
- [ ] Tombol memakai `rice-press`, kartu hover memakai `rice-lift`.
- [ ] Status domain mengikuti §3.3.
- [ ] `pnpm check` hijau.

---

## 4. Rencana Arsitektur Modul Svelte & CSS

### 4.1 File Layout (aktual):
```
src/
  lib/
    styles/
      themes.css              # Seluruh spec CSS variables 4 tema lengkap
    theme/
      theme.svelte.ts         # Svelte 5 Runes ($state) store untuk Switch & LocalStorage
    components/
      theme/
        ThemeSwitcher.svelte  # Floating / Topbar theme picker widget
  routes/
    layout.css                # Integration @theme Tailwind v4 + imports
    +layout.svelte            # Mounting theme listener ke <html> tag
```

### 4.2 State Management (`theme.svelte.ts`):
- Menyimpan tema aktif ke `localStorage` dengan key `'cafe-theme'`.
- Default fallback ke `'neurobrutalism'`.
- Mengubah atribut `data-theme` pada `document.documentElement` secara real-time.

---

Dokumen ini adalah Single Source of Truth (SSOT) lengkap yang siap diimplementasikan ke codebase.
