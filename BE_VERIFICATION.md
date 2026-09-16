# Verifikasi Backend — Customer-Facing Flow (FE → BE)

> Dokumen verifikasi dari tim FE ke tim BE. Scope: **customer-facing dulu**
> (landing, menu, order tamu, bayar, lacak).
> Diperbarui: **2026-09-17** berdasarkan `API_CONTRACT.md` (16 Sep 2026),
> `AUTH.md`, `FE-CUSTOMER-FLOW-VERIFICATION.md`, dan source code aktual.

---

## 0. Asumsi FE tentang alur (koreksi bila salah)

1. **Kasir** (login, role `CASHIER`) yang **memulai/start order**:
   `POST /api/v1/dinings {tableId}` → dapat `diningId` (+ info meja).
   **⚠️ Koreksi:** Di seeder dev saat ini, `dining.create` / `dining.update` ada di **WAITER**, bukan CASHIER. CASHIER hanya punya `dining.read` + `table.read`. Pilih: (A) tambah authority dining ke CASHIER, atau (B) FE pakai WAITER untuk buka/tutup meja.
2. **Tamu tanpa login/tanpa akun** membuka link → lihat menu → tambah item ke order dining tersebut → lihat status & total pesanannya. **⚠️ Belum ada endpoint publik untuk tamu.** Semua `POST /dinings/{id}/orders` masih authenticated.
3. **Pembayaran** melibatkan Xendit (`invoiceUrl` + webhook → `PAID`). ✅ Pola ada.
4. Kasir memajukan status order (`confirm/prepare/ready/complete/cancel`) dan menutup dining (`POST /dinings/{id}/close`). ✅ Ada (staf dengan authority sesuai).

---

## 1. Endpoint publik menu (info: sudah diselesaikan BE, kontrak belum update)

| Item | Status | Jawaban BE |
|---|---|---|
| Path + method final | ✅ **Jawab** | `GET /api/v1/menus`, `GET /api/v1/menus/{id}` — `permitAll` di `SecurityConfig` (API_CONTRACT.md §6.D, §5.1). Juga `GET /api/v2/menus` dan `GET /api/v2/menus/{id}` publik. |
| Kategori publik | ❌ **Belum** | `GET /api/v1/menus/categories` masih **authenticated** (`menu-category.read`). Tidak ada varian publik. **Perlu keputusan BE.** |
| Query didukung | ✅ **Jawab** | V1: `name`, `categoryId`, `minPrice`, `maxPrice`, `page`, `size`, `sort`. V2: `name`, `categoryId` saja (tanpa `minPrice`/`maxPrice`). |
| Hanya `isAvailable=true` + `deleted=false` | ⚠️ **Partial** | `deleted=false` via `DeletedScope.ACTIVE` (API_CONTRACT.md §6.D). **`isAvailable` belum dipaksa `true`** — parameter dikirim `null` di kode. Rekomendasi: paksa `isAvailable=true` di path publik; admin tetap `/admin/menus`. |
| Sort default deterministik | ⚠️ **Tergantung versi** | V1: tanpa `sort` → ranking relevansi Meilisearch (bukan `name,asc`). V2: default `sort=name,asc`. **Rekomendasi FE:** selalu kirim `sort=name,asc` untuk V1 sampai BE diubah. |
| Bentuk DTO = `MenuResponse` V1 | ✅ **Jawab** | `id, name, description, categories[], imageUrls[], basePrice, isAvailable, createdAt, updatedAt, modifierTypes[]`. Field `deletedAt` (nullable) selalu `null` di response customer. |
| Update `API_CONTRACT.md` | ⏳ **Pending** | Referensi §2.5 di dokumen ini **tidak ada** di `API_CONTRACT.md` (struktur aktual: §1-§9). Matriks sudah sebut menu V1 publik di §5.1 dan §6.D; detail `isAvailable` + kategori publik perlu diperketat setelah perbaikan BE. |

**Risiko runtime:** `jwt-bypass-uris` di `application.yml` belum memuat path menu. Jika `JwtAuthFilter` menolak request tanpa Bearer sebelum `permitAll`, menu publik bisa 401. **Wajib smoke-test.**

---

## 2. Order tamu yang di-start kasir (butuh keputusan + endpoint)

| Item | Status | Jawaban BE |
|---|---|---|
| Identifikasi sesi tamu | ❌ **Belum ada keputusan** | API_CONTRACT.md **tidak mendokumentasikan** mekanisme identifikasi tamu. Tidak ada `guestToken`, `guestCode`, maupun endpoint publik. **FE-CUSTOMER-FLOW-VERIFICATION.md** mengusulkan: QR berisi `guestToken` (opaque) → resolve ke `diningId`. **Belum diimplementasi.** |
| Endpoint publik tambah item | ❌ **Belum ada** | `POST /api/v1/dinings/{id}/orders` saat ini **authenticated** + `@PreAuthorize(dining.update)`. Tidak ada varian publik. Auth skema yang diusulkan: **guest token** di path atau header `X-Guest-Token`. **Bukan** `permitAll` mentah. |
| `customerId` boleh null / `customerName` | ✅ **Jawab** | `customerId` **boleh null** untuk tamu (guest). `customerName` opsional, max 255 (API_CONTRACT.md §6.J). `customerName` adalah snapshot manual. |
| Endpoint publik lihat status & total | ❌ **Belum ada** | Tidak ada `GET /guest/dinings/{guestToken}` atau sejenisnya. FE perlu sediakan endpoint ini. |
| Batasan validasi khusus tamu | ✅ **Jawab** | Samakan kontrak order: `notes` max 255, `quantity` min 1, `items` minimal satu. Batas ekstra (max baris/qty) belum ada — bisa ditambah nanti (anti-spam). |
| Status terlihat tamu | ✅ **Jawab** | Kirim status BE penuh; FE map label. Transisi kasir terlihat via **polling** (bukan wajib realtime). Mapping contoh: `CREATED` → "Menunggu konfirmasi", `CONFIRMED`/`PREPARING` → "Sedang disiapkan", `READY` → "Siap", `COMPLETED` → "Selesai", `CANCELLED` → "Dibatalkan". |

**Keputusan produk (disepakati):** guest checkout tetap; jangan paksa role `CUSTOMER` / login pembeli sebelum pesan.

---

## 3. Pembayaran tamu (Xendit)

| Item | Status | Jawaban BE |
|---|---|---|
| Siapa membuat payment | ✅ **Jawab** | **Default MVP:** kasir/staf (`POST /api/v1/payments`, authenticated + `payment.create`). **Opsional nanti:** varian guest create — amount dihitung **server-side**, target `INVOICE`, bukan percaya amount dari FE. |
| FE: `invoiceUrl` → redirect → poll | ✅ **Jawab** | Pola benar. `GET /api/v1/payments/{id}` dan `GET /api/v1/invoices/{id}` bisa dipakai untuk polling status. |
| Poll untuk tamu | ⚠️ **Perlu hati-hati** | Jangan buka `GET /payments/{id}` global tanpa secret. Jika guest bayar: perlu endpoint terikat token sesi (mis. `GET /guest/payments/{id}`). **Belum ada.** |
| Invoice kedaluwarsa | ❌ **Belum didokumentasikan** | API_CONTRACT.md **tidak menyebutkan** berapa lama invoice kedaluwarsa. Default/setting Xendit saat create invoice (sering ~24 jam; konfirmasi di dashboard/API create). |
| Mapping webhook → `PaymentStatus` | ⚠️ **Partial** | API_CONTRACT.md §6.K menyebut: `PENDING` → `PAID` (via webhook), `PENDING` → `EXPIRED`, `PENDING` → `FAILED`. **Tidak ada `REFUNDED`** di API_CONTRACT.md (refund sudah dihapus dari model). `FE-CUSTOMER-FLOW-VERIFICATION.md` menyebut `REFUNDED` ada di domain — **konflik dengan kontrak**. Status terminal: `PAID`, `EXPIRED`, `FAILED`. |
| Trigger callback dev | ✅ **Jawab** | Xendit Dashboard → callback URL (`APP_DEV_BASE_URL`) + header `X-Callback-Token`; atau POST manual ke `/api/v1/payments/webhooks/xendit`. |
| Aturan `paidStatus` / `paidStatus` | ✅ **Jawab** | **DINE_IN:** `confirm` boleh `UNPAID` (bayar belakangan). **READY→COMPLETED** wajib `PAID`. **TAKEAWAY:** `confirm` wajib `PAID`. Aturan ini diverifikasi dari `OrderStatusFlowPolicy` di source code (FE-CUSTOMER-FLOW-VERIFICATION.md §0). |

> **⚠️ Catatan penting:** API_CONTRACT.md secara eksplisit menyatakan **refund sudah dihapus dari model** (keputusan MVP). Payment yang `PAID` bersifat final. Tidak ada `POST /payments/{id}/refund` dan tidak ada `REFUNDED` status. Jika `FE-CUSTOMER-FLOW-VERIFICATION.md` masih menyebut `REFUNDED`, itu bertentangan dengan kontrak terbaru.

---

## 4. Realtime vs polling

| Item | Status | Jawaban BE |
|---|---|---|
| SSE / WebSocket | ❌ **Belum ada** | API_CONTRACT.md **tidak mendokumentasikan** SSE/WebSocket. Tidak ada mekanisme real-time di source code. |
| Polling FE 5–10 detik | ✅ **Diizinkan** | Tidak ada larangan. FE bisa polling tiap 5–10 detik. |
| Endpoint ringan poll tamu | ❌ **Belum ada** | Setelah guest API tersedia: `GET /api/v1/guest/dinings/{guestToken}` (satu payload). **Saat ini belum ada.** |
| Rate limit publik | ❌ **Belum ada** | API_CONTRACT.md **tidak mendokumentasikan** rate limit. Ideal nanti: `429` + `errorCode: RATE_LIMITED`. Sementara: FE backoff, jangan < 3 detik. |

---

## 5. Auth, CORS, sesi (kasir)

| Item | Status | Jawaban BE |
|---|---|---|
| `ACCESS_TOKEN_EXPIRED` | ✅ **Jawab** | JWT melewati 15 menit → FE **coba refresh** via `POST /api/v1/auths/refresh` (tanpa header Authorization, hanya cookie). |
| `INVALID_ACCESS_TOKEN` | ✅ **Jawab** | JWT rusak/signature tidak cocok → FE **coba refresh** dulu; gagal refresh → logout. |
| `INVALID_REFRESH_TOKEN` | ✅ **Jawab** | Refresh token kedaluwarsa atau dicabut → **Logout**, redirect `/login`. Cookie sudah di-clear oleh backend. |
| `UNAUTHORIZED` + "Refresh token is missing" | ✅ **Jawab** | Cookie tidak ada → **Logout**, redirect `/login`. |
| `UNAUTHORIZED` + pesan lain | ✅ **Jawab** | Bukan masalah token (mis. hak akses) → Tampilkan error **tanpa redirect**. |
| Sumber errorCode | ✅ **Jawab** | Library `id.rascal:filter` (`JwtAuthFilter`). **Wajib smoke-test runtime** — kontrak sudah mendefinisikan branching di §4 API_CONTRACT.md. |
| Multi-tab + rotasi refresh | ✅ **Jawab** | **Ya:** refresh tab A merotasi cookie (`Set-Cookie` baru di response) → tab B bisa `INVALID_REFRESH_TOKEN` karena token lama sudah dicabut. Mitigasi FE: satu leader refresh (`BroadcastChannel` / lock). |
| CORS | ❌ **Belum diatur** | API_CONTRACT.md **tidak mendokumentasikan** CORS origin. `SecurityConfig` CSRF off, `OPTIONS /**` diizinkan. Dev: proxy `:9000` (`/api` → `:8081`) = same-origin (disarankan). Prod: same-host proxy atau set origin FE + credentials. **Origin eksplisit belum dikonfigurasi di `SecurityConfig`.** |
| Authority **CASHIER** (seeder saat ini) | ✅ **Jawab** | `order.create`, `order.read`, `order.update`, `order.mark.completed`, `payment.create`, `payment.read`, `payment.update`, `customer.create`, `customer.read`, `customer.update`, `menu.read`, `menu-category.read`, `menu-modifier.read`, `image.read`, `dining.read`, `table.read`, `report.read`. **Tanpa** `dining.create` / `dining.update` / `dining.mark.*`. |
| Authority **ADMIN** | ✅ **Jawab** | Semua nama di `AuthorityCatalog` (`menu.*`, `order.*`, `payment.*`, `invoice.*`, `dining.*`, `table.*`, `menu-category.*`, `menu-modifier.*`, `customer.*`, `image.*`, `report.read`, `role.*`, `authority.*`, `user.*`). |
| Authority **WAITER** | ✅ **Jawab** | `order.create/read/update`, `order.mark.completed`, `dining.create/read/update`, `table.create/read/update`, `customer.read`, `payment.read`, `menu.read`, `menu-category.read`, `menu-modifier.read`, `image.read`. |
| Authority **KITCHEN** | ✅ **Jawab** | `order.read`, `order.mark.preparing`, `order.mark.ready`, `kitchen.read/update`, `menu.read`, `image.read`. |

---

## 6. Upload gambar (persiapan admin, boleh belakangan)

| Item | Status | Jawaban BE |
|---|---|---|
| Satuan `expire` | ✅ **Jawab** | **Unix epoch detik** (`Instant.now().getEpochSecond() + TTL`). |
| TTL | ✅ **Jawab** | **3600 detik (1 jam)** (`AUTH_TTL_SECONDS`). |
| Folder/path | ❌ **Belum didokumentasikan** | API_CONTRACT.md hanya menyebut URL hasil resolve. Path relatif di registry BE; URL = `IMAGEKIT_URL_ENDPOINT` + path. Detail tidak ada di kontrak. |
| Batas ukuran file | ❌ **Belum didokumentasikan** | Ditentukan ImageKit / validasi FE. Endpoint auth BE **tidak enforce** size. |
| Contoh URL hasil untuk `menu.imageUrls` | ✅ **Jawab** | Array URL hasil resolve ImageKit (bukan private key). Field `imageUrls` di `MenuRequest`/`MenuResponse` adalah `String[]`. |

---

## 7. Yang FE butuhkan sebagai respons

### 7.1 Jawaban ringkasan

| # | Pertanyaan FE | Status |
|---|---|---|
| 1 | Endpoint publik menu | ✅ **Jawab** (kecuali kategori publik) |
| 2 | Order tamu (identifikasi, tambah item, lihat status) | ❌ **Belum ada endpoint-nya** |
| 3 | Pembayaran tamu | ✅ **Jawab** (default: kasir; guest: belum ada) |
| 4 | Realtime vs polling | ✅ **Jawab** (polling, tanpa SSE) |
| 5 | Auth, CORS, sesi | ✅ **Jawab** (kecuali CORS origin) |
| 6 | Upload gambar | ✅ **Jawab** (kecuali folder/path, size limit) |

### 7.2 Update `API_CONTRACT.md` — referensi bagian yang relevan

Dokumen ini merujuk ke bagian `API_CONTRACT.md` yang **tidak sesuai** dengan struktur aktual. Berikut pemetaan yang benar:

| Referensi di BE_VERIFICATION.md | Referensi benar di `API_CONTRACT.md` |
|---|---|
| §2.5 (matriks publik vs auth) | **Tidak ada** — §5 berisi matriks otorisasi. §5.1 = publik, §5.2 = authenticated, §5.3 = domain, §5.4 = peta role |
| §4 (menu publik) | §6.D (Menus V1) dan §6.F (Menus V2) — detail endpoint publik |
| §5/§7 (order tamu) | **Tidak ada** — order tamu belum didokumentasikan di kontrak |
| §6 (payment tamu) | §6.K (Payments) — payment authenticated, webhook publik |
| §9 (errorCode final) | §7 (Error Codes Reference) dan §3.C (Error masking) |
| §10 (endpoint baru) | **Tidak ada** — tidak ada §10 di kontrak |

### 7.3 Koleksi request (curl contoh)

**Open dining (kasir/waiter):**
```bash
POST /api/v1/dinings
Authorization: Bearer <token>
{"tableId": 1}
```

**Tambah item ke dining (kasir/waiter — belum ada varian tamu):**
```bash
POST /api/v1/dinings/{diningId}/orders
Authorization: Bearer <token>
{"customerName": "Budi", "items": [{"menuId": 1, "quantity": 2}]}
```

**Lihat status dining:**
```bash
GET /api/v1/dinings/{diningId}
Authorization: Bearer <token>
```

**Create payment (kasir):**
```bash
POST /api/v1/payments
Authorization: Bearer <token>
{"invoiceId": 1, "paymentProvider": "XENDIT"}
```

**Webhook Xendit (server-to-server, tidak dipanggil FE):**
```bash
POST /api/v1/payments/webhooks/xendit
X-Callback-Token: <secret>
{"external_id": "...", "status": "PAID", ...}
```

**Close dining (kasir/waiter):**
```bash
POST /api/v1/dinings/{diningId}/close
Authorization: Bearer <token>
```

> **Catatan:** Koleksi lengkap (Bruno/insomnia) untuk alur guest (open dining → guest add item → guest view → pay → webhook → close) **belum tersedia** karena endpoint guest belum diimplementasikan.

---

## 8. Yang MASIH BELUM TERJAWAB

Berikut adalah pertanyaan yang **tidak bisa dijawab** dari `API_CONTRACT.md` maupun kondisi project saat ini:

### 8.1 Endpoint tamu (guest-facing) — **Belum ada**

| Pertanyaan | Status |
|---|---|
| Bagaimana tamu mengidentifikasi sesi ordernya? | **Belum ada keputusan implementasi.** API_CONTRACT.md tidak mendokumentasikan `guestToken`, `guestCode`, atau mekanisme apa pun. FE-CUSTOMER-FLOW-VERIFICATION.md mengusulkan QR berisi `guestToken`, tapi ini **belum diimplementasikan** di source code. |
| Apakah ada endpoint publik untuk tamu menambah item ke dining? | **Tidak.** `POST /dinings/{id}/orders` masih authenticated. Tidak ada varian publik. |
| Apakah ada endpoint publik untuk tamu melihat status & total? | **Tidak.** Tidak ada `GET /guest/dinings/{token}` atau sejenisnya. |
| Berapa lama invoice kedaluwarsa? | **Tidak didokumentasikan.** API_CONTRACT.md tidak menyebutkan TTL invoice. |
| Endpoint polling ringan untuk tamu? | **Tidak ada.** |

### 8.2 Desain & konfigurasi — **Belum ditentukan**

| Pertanyaan | Status |
|---|---|
| CORS origin eksplisit | **Belum dikonfigurasi** di `SecurityConfig`. |
| Rate limit untuk endpoint publik | **Belum ada.** |
| SSE/WebSocket untuk real-time | **Belum ada.** |
| Folder/path file upload & batas ukuran | **Tidak didokumentasikan** di API_CONTRACT.md. |
| `isAvailable=true` dipaksa di endpoint menu publik? | **Belum.** Parameter dikirim `null` di kode. Butuh keputusan BE. |
| Kategori menu publik? | **Belum.** `GET /menus/categories` masih authenticated. |
| Authority `dining.create`/`dining.update` untuk CASHIER? | **Belum.** Seeder saat ini memberi WAITER. Butuh keputusan produk. |

### 8.3 Ketidaksesuaian dokumen — **Perlu klarifikasi**

| Masalah | Detail |
|---|---|
| `REFUNDED` status di `FE-CUSTOMER-FLOW-VERIFICATION.md` vs API_CONTRACT.md | `FE-CUSTOMER-FLOW-VERIFICATION.md` §3 menyebut `PaymentStatus` mencakup `REFUNDED`. API_CONTRACT.md §6.K dan §7 secara eksplisit menyatakan **refund sudah dihapus dari model**. **Konflik.** |
| Referensi §2.5, §10 di `BE_VERIFICATION.md` | Bagian-bagian ini **tidak ada** di `API_CONTRACT.md` (struktur aktual §1-§9). |
| `jwt-bypass-uris` untuk path menu | API_CONTRACT.md menyebut `permitAll` di `SecurityConfig`, tapi `FE-CUSTOMER-FLOW-VERIFICATION.md` memperingatkan bahwa `jwt-bypass-uris` di `application.yml` belum memuat path menu. **Perlu smoke-test.** |
| `markPaid` order CANCELLED | `REVIEW-ORDER-PAYMENT-DINING.md` menemukan bahwa `markPaid(Collection)` tidak filter status, sehingga order CANCELLED ikut PAID. API_CONTRACT.md tidak membahas ini. |
| Dining bill model | `REVIEW-ORDER-PAYMENT-DINING.md` menemukan tidak ada model bill di dining — `totalPrice` dihitung live. API_CONTRACT.md tidak membahas snapshot bill/due. |

### 8.4 Issue kode yang terdokumentasi tapi belum diperbaiki

| Issue | Sumber |
|---|---|
| Refund mustahil (`PAID → REFUNDED` selalu ditolak) | `REVIEW-ORDER-PAYMENT-DINING.md` C1 |
| Tidak ada guard dobel-payment | `REVIEW-ORDER-PAYMENT-DINING.md` C5 |
| Webhook overwrite `amount` dengan null → retry loop | `REVIEW-ORDER-PAYMENT-DINING.md` C4 |
| Order PAID bisa di-soft-delete tanpa guard | `REVIEW-ORDER-PAYMENT-DINING.md` H1 |
| Meja terkunci jika order unpaid | `REVIEW-ORDER-PAYMENT-DINING.md` H3 |
| `DiningStatus.CANCELLED` dead code | `REVIEW-ORDER-PAYMENT-DINING.md` D4 |

---

## 9. Ringkasan: Apa yang FE bisa kerjakan sekarang vs tunggu BE

### FE bisa mulai sekarang

- Landing + browse menu publik (`GET /menus`, `GET /menus/{id}`) — kirim `sort=name,asc` untuk determinisme.
- UI staf: open dining / status order / payment / close (dengan role yang punya authority benar — WAITER untuk dining write).
- Auth flow: refresh token handling berdasarkan §4 API_CONTRACT.md dan §5 dokumen ini.
- Polling mekanisme untuk status order/payment.

### BE harus kerjakan agar customer-facing end-to-end

1. Paksa `isAvailable=true` + default sort publik; `GET` kategori publik; pastikan jwt-bypass path publik.
2. Generate `guestToken` (opsional `guestCode`) saat open dining.
3. Surface guest: `GET/POST` guest dining (identifikasi sesi, tambah item, lihat status).
4. Authority CASHIER jika UI kasir yang buka/tutup meja.
5. Definisikan TTL invoice dan documentasikan di API_CONTRACT.md.
6. Resolve konflik `REFUNDED` status antara dokumen.
7. Update `API_CONTRACT.md` dengan endpoint guest, CORS config, rate limit, dan file upload details.
8. Perbaiki issue kode dari `REVIEW-ORDER-PAYMENT-DINING.md` (refund, dobel-payment, bill model, dll).

### Anti-pattern

- `permitAll` pada `POST /dinings/{id}/orders` hanya dengan numeric id.
- Memaksa login tamu / role `CUSTOMER` untuk memesan.
- Menganggap CASHIER sudah bisa `POST /dinings` tanpa ubah seeder.
- Mengandalkan `REFUNDED` status padahal sudah dihapus dari model.

---

*Dibuat oleh tim FE, 2026-09-06. Diperbarui oleh BE, 2026-09-17 berdasarkan `API_CONTRACT.md` (16 Sep 2026), `AUTH.md`, `FE-CUSTOMER-FLOW-VERIFICATION.md`, dan source code aktual. Scope berikutnya (di luar dokumen ini): halaman kasir/admin/dapur.*

