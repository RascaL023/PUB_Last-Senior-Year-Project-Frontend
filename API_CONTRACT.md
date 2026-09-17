# API Contract — Backend Modular Monolith

> Spesifikasi API lengkap untuk integrasi frontend, diverifikasi langsung dari source code per **18 September 2026** — menyertakan: payment menarget invoice (tanpa refund), masking error, dan matriks otorisasi fine-grained per endpoint.
>
> **Catatan penting per 2026-09-18:**
> - **Refund sudah dihapus dari model.** `PaymentStatus` enum hanya punya `PENDING`, `PAID`, `FAILED`, `EXPIRED`. Tidak ada `REFUNDED`. Payment yang `PAID` bersifat final.
> - **Guest checkout belum ada endpoint-nya.** Semua endpoint `POST /dinings/{id}/orders` masih authenticated. Mekanisme identifikasi tamu (guest token) belum diimplementasikan.
> - **CORS ditangani oleh Vercel proxy** (`vercel.json` di FE). Tidak perlu explicit origin config di `SecurityConfig`.
> - **Local `dev` sudah paling maju** (10 commit di depan `origin/dev`). `origin/shadow` sudah merge ke local `dev`. `feature/payment`, `feature/invoice`, `feature/report` adalah stale branches — work-nya sudah dipindah ke `shadow`.
> - **`jwt-bypass-uris`** di `application.yml` sudah mencakup `/api/v1/menus/categories` dan `/api/v1/menus/categories/{id}`.
> - **CASHIER authority** sekarang punya `dining.create` dan `dining.update` (di `DevRoleSeeder`).
> - **`isAvailable`** tidak dipaksa `true` di BE. FE yang menangani tampilan menu tidak tersedia. BE hanya memvalidasi.

---

## 1. Informasi Dasar

| Item | Nilai |
|---|---|
| Base URL langsung | `http://localhost:8081` |
| Base URL via proxy (disarankan) | `http://localhost:9000` — Nginx meneruskan `/api/` ke backend, `/` ke frontend `:5173`. **Produk:** FE menggunakan `vercel.json` proxy ke BE, sehingga CORS ditangani di sisi FE (same-origin via proxy). Tidak perlu explicit origin config di `SecurityConfig`. |
| Prefix | `/api/v1` untuk semua modul, plus `/api/v2/menus` (varian cached untuk menu) |
| Content-Type | `application/json` untuk semua request dan response body |
| Auth | Header `Authorization: Bearer <accessToken>` + cookie `refresh_token` yang dikirim browser otomatis |
| Health check | `GET /health` via proxy → `{"status":"ok"}` |
| CORS | Ditangani oleh Vercel proxy (FE). `SecurityConfig` mengizinkan `OPTIONS /**` (preflight) secara `permitAll`. `jwt-bypass-uris` di `application.yml` sudah mencakup path menu publik. |

**Makna status code yang dipakai backend:**

| Status | Arti |
|---|---|
| `200 OK` | Baca, update, dan transisi status berhasil |
| `201 Created` | `POST` membuat data baru berhasil |
| `204 No Content` | `DELETE` berhasil — body kosong, jadi jangan di-parse sebagai JSON |
| `400 / 401 / 403 / 404 / 409 / 500` | Lihat bagian error |

---

## 2. Konvensi Pagination

Semua endpoint list menggunakan Spring Data `Pageable`:

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `page` | int | `0` | **0-based** — halaman pertama adalah `0` |
| `size` | int | `10` | Jumlah data per halaman |
| `sort` | string | Bervariasi | Format `namaField,arah` — contoh: `createdAt,desc` |

Response-nya justru memakai format **1-based** di `meta.pagination.currentPage`. Jadi request `page=0` menghasilkan `currentPage: 1`.

Default sort per modul: orders, payments, dan dinings memakai `createdAt,desc`; categories, modifiers, dan tables memakai `name`/`displayName`/`tableNumber` ascending. Pengecualian: `GET /api/v1/menus` dan admin search diurutkan berdasarkan relevansi Meilisearch kalau parameter `sort` tidak dikirim (lihat bagian menu).

---

## 3. Format Response Standar

### A. Success (single)

```json
{
  "isSuccess": true,
  "message": "Order successfully retrieved",
  "data": { "...": "..." },
  "meta": { "timestamp": "2026-09-06T10:00:00Z" }
}
```

### B. Success (paged)

```json
{
  "isSuccess": true,
  "message": "Data retrieved",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "perPage": 10,
      "totalItems": 42,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "timestamp": "2026-09-06T10:00:00Z"
  }
}
```

### C. Error

```json
{
  "isSuccess": false,
  "message": "User not found",
  "errorCode": "NOT_FOUND",
  "errors": null,
  "meta": { "timestamp": "2026-09-06T10:00:00Z" }
}
```

### D. Validation Error

```json
{
  "isSuccess": false,
  "message": "Validation failed",
  "errorCode": null,
  "errors": [
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ],
  "meta": { "timestamp": "2026-09-06T10:00:00Z" }
}
```

> Nilai `message` berbeda-beda di tiap endpoint (misalnya `"Menu successfully created"`), jadi jadikan `isSuccess` dan HTTP status sebagai acuan utama, bukan teks message.

> **Kebijakan masking error (berlaku sejak 2026-09-16):** pesan error hanya dijamin untuk kondisi yang *ditulis sadar* oleh kode (guard bisnis, validasi, enum tidak valid — mis. `"Payment amount exceeds remaining amount"`, `"Tagihan belum lunas (INV-...)"`). Kegagalan infrastruktur **tidak bocor ke response** — klien menerima pesan generik; detail penuh + stacktrace hanya di log server.
>
> | Kondisi | HTTP / `errorCode` | `message` yang diterima klien |
> |---|---|---|
> | Guard bisnis & validasi (authored) | sesuai kondisi | pesan apa adanya |
> | Body JSON tidak terbaca | 400 / `MALFORMED_JSON` | generik: *"Request body is malformed or not readable JSON."* |
> | Pelanggaran constraint DB (duplikat/FK/not-null) | 409 / `DUPLICATE_ENTRY` | generik: *"The request conflicts with existing data."* |
> | Kegagalan tak terduga (catch-all) | 500 / `INTERNAL_SERVER_ERROR` | generik: *"An unexpected error occurred. Please try again later."* |
>
> Konsekuensi untuk FE: branch on `isSuccess` + status + `errorCode` — **jangan** match teks `message` untuk baris generik di atas. Saat melapor bug, sertakan `meta.timestamp` supaya bisa dicocokkan dengan log server.

---

## 4. Autentikasi dan Token Management

### Mekanisme Token

| Token | Tipe | Umur | Penyimpanan | Cara kirim |
|---|---|---|---|---|
| **Access token** | JWT (HMAC-SHA) | **15 menit** | Variabel di memori (bukan localStorage) | Header `Authorization: Bearer <token>` |
| **Refresh token** | String acak Base64 (64 bytes) | **20 hari** | Cookie `httpOnly` | Dikirim browser otomatis (path `/api/v1/auths`) |

### Claims Access Token

```json
{
  "sub": "1",
  "roles": ["ADMIN"],
  "authorities": ["menu.create", "order.read"]
}
```

`sub` berisi ID user dalam bentuk string, `roles` berisi daftar nama role, dan `authorities` berisi daftar nama authority.

### Konfigurasi Cookie Refresh Token

| Property | Nilai |
|---|---|
| Nama cookie | `refresh_token` |
| `httpOnly` | `true` — tidak bisa dibaca dari JavaScript |
| `secure` | `false` |
| `sameSite` | `Strict` |
| `path` | `/api/v1/auths` — cookie hanya dikirim ke path ini |
| `maxAge` | 20 hari |

Karena `path` dibatasi ke `/api/v1/auths`, browser hanya mengirim cookie `refresh_token` ke endpoint di bawah path tersebut. Endpoint lain seperti menus atau orders tidak akan menerima cookie ini, sehingga refresh token tidak tersebar ke endpoint non-auth.

### Endpoint Auth (`/api/v1/auths`)

| Endpoint | Keamanan | Keterangan |
|---|---|---|
| `POST /auths/login` | Publik | Kirim email dan password, terima `{id, email, accessToken}` sekaligus cookie yang ter-set otomatis |
| `POST /auths/refresh` | Publik, hanya lewat cookie | Tanpa body dan tanpa header Authorization — cukup mengandalkan cookie; merotasi refresh token (cookie baru ikut ter-set di response) |
| `POST /auths/logout` | Cookie (boleh kosong) | Mencabut refresh token yang ada di cookie sekaligus menghapus cookie |
| `POST /auths/logout-all` | Bearer token | Mencabut seluruh refresh token milik user dari database sekaligus menghapus cookie lokal |
| `POST /auths/forgot-password` | Publik | Kirim token reset ke email. Model request/response ada di `auth-core`, service sudah lengkap. |
| `POST /auths/reset-password` | Publik | Reset password pakai token. Model request/response ada di `auth-core`, service sudah lengkap. |

Tidak ada endpoint registrasi publik. Pembuatan user hanya lewat `POST /auths/users` dalam keadaan sudah login.

#### Login

```
POST /api/v1/auths/login
```

**Request:**

```json
{
  "email": "admin@rascal.id",
  "password": "admin123"
}
```

**Response 200:**

```json
{
  "isSuccess": true,
  "message": "Login success, welcome back!",
  "data": {
    "id": 1,
    "email": "admin@rascal.id",
    "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
  },
  "meta": { "timestamp": "..." }
}
```

#### Refresh Token

```
POST /api/v1/auths/refresh
```

Request tidak memerlukan body — browser otomatis mengirim cookie `refresh_token`.

**Response 200:**

```json
{
  "isSuccess": true,
  "message": "Request processed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
  },
  "meta": { "timestamp": "..." }
}
```

Endpoint ini publik (`JwtAuthFilter` di-bypass), jadi tidak perlu mengirim header `Authorization`. Setiap refresh yang sukses juga merotasi refresh token: response menyertakan `Set-Cookie` baru yang perlu dibiarkan tersimpan oleh browser.

#### Logout

```
POST /api/v1/auths/logout
```

Mengandalkan cookie `refresh_token` yang terkirim otomatis.

**Response 200:**

```json
{
  "isSuccess": true,
  "message": "Logout success",
  "data": null,
  "meta": { "timestamp": "..." }
}
```

Cookie `refresh_token` ikut dihapus oleh server (`maxAge=0`).

#### Logout All Devices

```
POST /api/v1/auths/logout-all
```

Memakai header `Authorization: Bearer <token>`.

**Response 200:**

```json
{
  "isSuccess": true,
  "message": "Logout all success",
  "data": null,
  "meta": { "timestamp": "..." }
}
```

Seluruh refresh token milik user dihapus dari database dan cookie lokal ikut dihapus.

### ErrorCode dari JwtAuthFilter — Dasar Keputusan Frontend

Library security (`JwtAuthFilter`) menghasilkan errorCode yang berbeda untuk tiap kondisi. Frontend perlu membedakannya:

| errorCode | HTTP | message | Arti | Aksi |
|---|---|---|---|---|
| `ACCESS_TOKEN_EXPIRED` | 401 | `"Access token expired"` | JWT sudah melewati umur 15 menit | Coba refresh via `POST /auths/refresh` |
| `INVALID_ACCESS_TOKEN` | 401 | `"Invalid access token"` | JWT rusak, signature tidak cocok, atau format salah | Coba refresh — token baru bisa memperbaiki sesi |
| `INVALID_REFRESH_TOKEN` | 401 | Bervariasi | Refresh token tidak valid, kedaluwarsa, atau dicabut | Logout dan arahkan ke `/login` |
| `UNAUTHORIZED` | 401 | Bervariasi | Tidak ada header, header bukan Bearer, role tidak cukup, atau refresh token bermasalah | Cek detail di bawah |

### Alur Keputusan Frontend saat Menerima 401

```
Response 401 dari backend
│
├── errorCode == "ACCESS_TOKEN_EXPIRED"
│   │
│   └── REFRESH: panggil POST /api/v1/auths/refresh
│       │         (tanpa header Authorization, hanya cookie otomatis)
│       │
│       ├── 200 OK → simpan access token baru,
│       │            ulangi request yang gagal
│       │
│       └── 401 "INVALID_REFRESH_TOKEN"
│           └── LOGOUT: refresh token kedaluwarsa atau dicabut
│               ├── cookie sudah di-clear oleh backend
│               ├── hapus access token dari memori
│               └── redirect ke /login
│
├── errorCode == "INVALID_ACCESS_TOKEN"
│   │
│   └── REFRESH: coba refresh juga (token mungkin corrupt)
│       ├── 200 OK → simpan token baru, ulangi request
│       └── 401 "INVALID_REFRESH_TOKEN" → logout, redirect ke /login
│
├── errorCode == "INVALID_REFRESH_TOKEN"
│   │
│   └── LOGOUT langsung: sesi tidak bisa diperpanjang
│       ├── cookie sudah di-clear oleh backend
│       ├── hapus access token dari memori
│       └── redirect ke /login
│
└── errorCode == "UNAUTHORIZED"
    │
    ├── message == "Refresh token is missing"
    │   └── LOGOUT: cookie tidak ada (belum login atau sudah logout)
    │       └── redirect ke /login
    │
    └── message lainnya ("Invalid role", "Access Denied", dsb)
        └── Tampilkan error hak akses
            (tanpa redirect, cukup tampilkan pesan)
```

### Kenapa Mencoba Refresh Dulu, Bukan Langsung Logout?

Saat backend mengembalikan `ACCESS_TOKEN_EXPIRED` atau `INVALID_ACCESS_TOKEN`, refresh token di cookie umumnya masih valid (umurnya 20 hari). Frontend masih bisa memperpanjang sesi tanpa login ulang. Sesi baru dinyatakan habis kalau endpoint refresh ikut gagal (`INVALID_REFRESH_TOKEN`).

### Implementasi: Axios Interceptor Pattern

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const errorCode = error.response.data?.errorCode;

    if (errorCode === 'INVALID_REFRESH_TOKEN') {
      accessToken = null;
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (errorCode === 'ACCESS_TOKEN_EXPIRED' || errorCode === 'INVALID_ACCESS_TOKEN') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/v1/auths/refresh', null, {
          withCredentials: true,
        });

        const newToken = data.data.accessToken;
        accessToken = newToken;

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

Poin penting dari pola di atas:

1. `POST /api/v1/auths/refresh` dipanggil **tanpa** header `Authorization` — hanya cookie.
2. `withCredentials: true` wajib agar browser mengirim cookie lintas origin.
3. `isRefreshing` + `failedQueue` mencegah request paralel yang gagal bersamaan memicu refresh berkali-kali.
4. `originalRequest._retry = true` mencegah infinite loop kalau request tetap 401 setelah refresh.
5. Kalau refresh gagal (`INVALID_REFRESH_TOKEN`), langsung arahkan ke login.

### Ringkasan: Kapan Refresh vs Kapan Logout

| Kondisi | Aksi | Penjelasan |
|---|---|---|
| `ACCESS_TOKEN_EXPIRED` | Refresh | Access token kedaluwarsa, refresh token umumnya masih hidup |
| `INVALID_ACCESS_TOKEN` | Refresh | Token corrupt, coba perbaiki lewat refresh dulu |
| `INVALID_REFRESH_TOKEN` | Logout | Refresh token kedaluwarsa atau dicabut |
| `UNAUTHORIZED` + "Refresh token is missing" | Logout | Cookie tidak ada — user belum login atau sudah logout |
| `UNAUTHORIZED` + pesan lain | Tampilkan error | Masalah hak akses, bukan masalah token |

### Masa Aktif Token

```
Access Token:  ████████████████░░░░░░░░░░░░░░░░  15 menit
Refresh Token: ████████████████████████████████  20 hari

Login ──────────────────────────────────────────────────── 20 hari
  │
  ├── request pertama memakai access token
  ├── 15 menit: access token kedaluwarsa → refresh → token baru (+ cookie baru)
  ├── 30 menit: kedaluwarsa lagi → refresh → token baru
  ├── ... (berulang selama refresh token masih hidup)
  └── 20 hari: refresh token kedaluwarsa → refresh gagal → redirect /login
```

---

## 5. Matriks Otorisasi

> Diverifikasi dari anotasi `@PreAuthorize` di tiap controller (September 2026).
> **Tidak ada lagi endpoint domain yang "cukup login"** — seluruh controller domain
> (order, payment, invoice, dining, table, menu, report) memakai fine-grained authority.
> Pola: `x.action` atau wildcard `x.*`. Kecocokan diambil dari claims `authorities` di access token.

### 5.1 Publik (tanpa token)

| Endpoint | Catatan |
|---|---|
| `POST /auths/login` | |
| `POST /auths/refresh` | Hanya cookie |
| `POST /auths/forgot-password` | Kirim token reset ke email |
| `POST /auths/reset-password` | Reset password pakai token |
| `POST /customers/register` | Registrasi member + akun |
| `GET /menus`, `GET /menus/{id}`, `GET /v2/menus`, `GET /v2/menus/{id}` | Katalog publik (permitAll di SecurityConfig) |
| `GET /menus/categories`, `GET /menus/categories/{id}` | Kategori menu publik (permitAll di SecurityConfig, jwt-bypass-uris) |
| `POST /payments/webhooks/xendit` | Server-to-server |
| `POST /images/imagekit/webhooks` | Server-to-server |
| `POST /auths/logout` | Cookie opsional — boleh tanpa token |

### 5.2 Endpoint terautentikasi (Bearer)

| Endpoint | Authority |
|---|---|
| `POST /auths/logout-all` | Cukup login |
| `CRUD /auths/users` | Cukup login |
| `CRUD /auths/roles` | `role.create` / `role.read` / `role.update` / `role.delete` / `role.*` |
| `GET/DELETE /auths/authorities` | `authority.read` / `authority.delete` / `authority.*` |
| `GET /auths/authorities/{id}` | `authority.create` / `authority.*` (quirk, memang begitu di kode) |

### 5.3 Domain

| Modul | Operasi | Authority |
|---|---|---|
| **Orders** | `POST /` (create), `PUT/PATCH/{id}`, `confirm`, `cancel` | `order.create` / `order.update` / `order.*` |
| | `GET /`, `GET /{id}` | `order.read` / `order.*` |
| | `prepare` | `order.mark.preparing` / `order.*` |
| | `ready` | `order.mark.ready` / `order.*` |
| | `complete` | `order.mark.completed` / `order.*` |
| | `DELETE /{id}` | `order.delete` / `order.*` |
| **Payments** | `POST /`, `GET /`, `GET /{id}`, `expire`, `fail` | `payment.create` / `payment.read` / `payment.update` / `payment.*` (per operasi) |
| **Invoices** | `POST /`, `GET /`, `GET /{id}`, `void`, `DELETE /{id}` | `invoice.create` / `invoice.read` / `invoice.update` / `invoice.delete` / `invoice.*` (per operasi) |
| **Dining** | `POST /` (open), `POST /{id}/orders`, `POST /{id}/close` | `dining.create` / `dining.update` / `dining.*` |
| | `GET /`, `GET /{id}` | `dining.read` / `dining.*` |
| **Tables** | CRUD | `table.create` / `table.read` / `table.update` / `table.delete` / `table.*` |
| **Menus V1/V2** | `POST /`, `PUT /{id}`, `PATCH restore`, `DELETE` | `menu.create` / `menu.update` / `menu.delete` / `menu.*` |
| **Categories** | `GET /`, `GET /{id}` publik (permitAll); CRUD authenticated | `menu-category.create` / `menu-category.read` / `menu-category.update` / `menu-category.delete` / `menu-category.*` |
| **Modifiers** | CRUD | `menu-modifier.create` / `menu-modifier.read` / `menu-modifier.update` / `menu-modifier.delete` / `menu-modifier.*` |
| **Admin menus** | `GET /admin/menus/*` | Cukup login |
| **Image upload auth** | `GET /images/auth` | `image.create` / `image.*` ⚠️ |
| **Reports** | `GET /reports/dashboard/summary` | `report.read` — **tanpa wildcard**, hanya ADMIN & CASHIER |

> ⚠️ **Perbedaan authority dining antara CASHIER dan WAITER:** Di `DevRoleSeeder`, CASHIER hanya punya `dining.read` + `table.read` — **tidak** punya `dining.create`/`dining.update`. WAITER punya `dining.create/read/update`. Jika FE ingin kasir membuka/tutup meja, ubah seeder atau anotasi controller — jangan di FE.

> ⚠️ **Quirk upload gambar:** endpoint `GET /images/auth` menuntut `image.create`, tetapi seeder hanya memberi `image.read` ke kasir/waiter/kitchen — jadi di dev, **hanya admin yang bisa upload gambar**. Kalau FE butuh kasir upload, ubah seeder (kasir + `image.create`) atau anotasi controller — jangan di FE.

### 5.4 Peta authority per role dev (untuk gating UI)

Ringkasan `DevRoleSeeder` — ini yang benar-benar dimiliki tiap role:

| Role | Authority yang relevan untuk UI |
|---|---|
| **ADMIN** | Semuanya (`AuthorityCatalog.names()`) |
| **CASHIER** | `order.create/read/update`, `payment.create/read/update`, `invoice.read/update`, `dining.read/create/update`, `table.read`, `menu.read`, `menu-category.read`, `menu-modifier.read`, `customer.create/read/update`, `image.read`, `report.read` |
| **WAITER** | `order.create/read/update` + `order.mark.completed`, `dining.create/read/update`, `table.create/read/update`, `customer.read`, `payment.read`, `menu.read`, `menu-category.read`, `menu-modifier.read`, `image.read` |
| **KITCHEN** | `order.read`, `order.mark.preparing`, `order.mark.ready`, `kitchen.read/update`, `menu.read`, `image.read` |

Konsekuensi praktis: kasir **tidak** punya `invoice.create`/`invoice.delete` (invoice dining dibuat otomatis oleh backend; void/delete khusus admin), kasir **tidak** punya `order.delete`/`order.mark.*` (kitchen/waiter), dan dashboard (`report.read`) hanya kasir + admin. Kasir sekarang punya `dining.create`/`dining.update` (bisa buka/tutup meja). Kasir hanya punya `image.read` (bukan `image.create`) — jadi **hanya admin yang bisa upload gambar** di dev.

> Quirk yang perlu diketahui: `GET /auths/authorities/{id}` membutuhkan authority `authority.create` (bukan `read`) karena anotasi di implementasi backend memakai nilai tersebut. Anotasi `@PreAuthorize` pada `GET` menu V1/V2 di-comment dan endpoint-nya di-`permitAll` di `SecurityConfig`, jadi pembacaan menu bersifat public; endpoint menu lainnya cukup login.
>
> **Catatan `jwt-bypass-uris`:** Di `application.yml`, path `/api/v1/menus`, `/api/v1/menus/{id}`, `/api/v1/menus/categories`, dan `/api/v1/menus/categories/{id}` sudah terdaftar di `jwt-bypass-uris` selain `permitAll` di `SecurityConfig`. Ini memastikan menu dan kategori publik tidak memerlukan Bearer token. Path `forgot-password` dan `reset-password` juga ada di `jwt-bypass-uris` — service `PasswordResetService` sudah lengkap (request reset + reset password dengan validasi token).

---

## 6. Endpoint Lengkap per Modul

---

### A. Users (`/api/v1/auths/users`)

Membutuhkan login. Tidak ada authority khusus.

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create user | Membutuhkan `roleIds`, response `201` |
| `GET /` | List users | Filter `email` (substring) + pagination |
| `GET /{id}` | Get user by ID | |
| `PUT /{id}` | Full update | Semua field wajib seperti create |
| `PATCH /{id}` | Partial update | Field `email`, `password`, `roleIds` opsional, minimal satu terisi |
| `DELETE /{id}` | Soft delete | Response `204 No Content` |

**Create User Request (POST dan PUT):**

```json
{
  "email": "user@rascal.id",
  "password": "securepassword123",
  "roleIds": [1]
}
```

Aturan validasi: email harus format valid dan tidak blank, password minimal 8 karakter, `roleIds` minimal berisi satu ID.

**UserAuthResponse:**

```json
{
  "id": 1,
  "email": "user@rascal.id",
  "roles": [
    {
      "id": 1,
      "name": "ADMIN",
      "authorities": [
        { "id": 1, "name": "menu.create", "createdAt": "...", "updatedAt": null }
      ],
      "createdAt": "...",
      "updatedAt": null
    }
  ],
  "createdAt": "2026-08-23T00:00:00Z",
  "updatedAt": null
}
```

---

### B. Roles (`/api/v1/auths/roles`)

| Method | Path | Authority |
|---|---|---|
| `POST /` | Create | `role.create` / `role.*`, response `201` |
| `GET /` | List | `role.read` / `role.*`, filter `name` (substring) |
| `GET /{id}` | Get by ID | `role.read` / `role.*` |
| `PUT /{id}` | Full update | `role.update` / `role.*` |
| `PATCH /{id}` | Partial update | `role.update` / `role.*` |
| `DELETE /{id}` | Soft delete | `role.delete` / `role.*`, response `204` |

**Create Role Request:**

```json
{
  "name": "CASHIER",
  "authorityIds": [1, 2, 3]
}
```

Nama role 3–20 karakter dan `authorityIds` tidak boleh kosong.

**RoleResponse:**

```json
{
  "id": 1,
  "name": "ADMIN",
  "authorities": [
    { "id": 1, "name": "menu.create", "createdAt": "...", "updatedAt": null }
  ],
  "createdAt": "...",
  "updatedAt": null
}
```

---

### C. Authorities (`/api/v1/auths/authorities`)

Modul ini read-only ditambah delete — tidak ada endpoint create maupun update.

| Method | Path | Authority |
|---|---|---|
| `GET /` | List | `authority.read` / `authority.*`, filter `name` (substring) |
| `GET /{id}` | Get by ID | `authority.create` / `authority.*` (quirk) |
| `DELETE /{id}` | Delete | `authority.delete` / `authority.*`, response `204` |

**AuthorityResponse:**

```json
{
  "id": 1,
  "name": "menu.create",
  "createdAt": "2026-08-23T00:00:00Z",
  "updatedAt": null
}
```

---

### D. Menus V1 (`/api/v1/menus`)

Operasi write membutuhkan login (`menu.create`/`menu.update`/`menu.delete`); `GET /` dan `GET /{id}` bersifat **public** (permitAll di `SecurityConfig`, tanpa token). Operasi baca didukung Meilisearch sebagai read projection dengan fallback otomatis ke PostgreSQL saat Meilisearch tidak tersedia.

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create menu | Response `201` |
| `GET /` | List menus | Filter `name` (substring), `categoryId`, `minPrice`, `maxPrice` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update | |
| `PATCH /{id}/restore` | Restore data soft-deleted | |
| `DELETE /{id}` | Soft delete | Response `204 No Content` |

Tanpa parameter `sort`, hasil list diurutkan berdasarkan ranking relevansi Meilisearch. Untuk urutan deterministik, kirim `sort` dengan field yang didukung: `name`, `basePrice`, atau `createdAt` (contoh: `sort=basePrice,asc`). Endpoint customer selalu memfilter `isDeleted=false` di sisi server, sehingga menu yang di-soft-delete tidak pernah muncul di sini. **`isAvailable` tidak dipaksa `true` di BE** — parameter dikirim `null`. FE yang menangani tampilan menu tidak tersedia.

**Create/Update Menu Request:**

```json
{
  "name": "Kopi Latte",
  "categoryIds": [1],
  "description": "Kopi dengan susu segar",
  "imageUrls": ["https://image.url/latte.png"],
  "basePrice": 25000,
  "isAvailable": true,
  "ModifierTypeIds": [1]
}
```

Perhatikan: field `ModifierTypeIds` memakai huruf besar `M` sesuai source code. Aturan validasi: `name` 3–30 karakter dan wajib diisi, `categoryIds` tidak boleh kosong (tiap ID minimal 1), `basePrice` wajib diisi dengan nilai minimal 500, `description`, `imageUrls`, `isAvailable`, dan `ModifierTypeIds` opsional.

**MenuResponse (V1):**

```json
{
  "id": 1,
  "name": "Kopi Latte",
  "description": "Kopi dengan susu segar",
  "categories": [
    { "id": 1, "name": "Kopi", "categoryCode": "COFFEE", "displayOrder": 1 }
  ],
  "imageUrls": ["https://image.url/latte.png"],
  "basePrice": 25000,
  "isAvailable": true,
  "createdAt": "2026-08-23T00:00:00Z",
  "updatedAt": null,
  "modifierTypes": [
    {
      "id": 1,
      "name": "Sugar Level",
      "minSelection": 1,
      "maxSelection": 1,
      "options": [
        { "id": 1, "name": "Normal", "additionalPrice": 0 },
        { "id": 2, "name": "Extra", "additionalPrice": 2000 }
      ]
    }
  ],
  "deletedAt": null
}
```

Field `deletedAt` (nullable) selalu `null` di response customer. Tipe yang disarankan di frontend: `deletedAt: string | null`.

---

### E. Admin Menus (`/api/v1/admin/menus`)

Endpoint read-only khusus admin untuk kebutuhan operasional, termasuk melihat data yang sudah di-soft-delete. Membutuhkan login.

| Method | Path | Keterangan |
|---|---|---|
| `GET /search` | Search menu | Filter `name`, `categoryId`, `minPrice`, `maxPrice`, `isAvailable`, `deleted` |
| `GET /{id}` | Get by ID | Termasuk menu soft-deleted; `deletedAt` terisi bila data sudah dihapus |

Parameter `deleted` menerima `active` (default), `deleted`, atau `all`. Nilai lain ditolak dengan `400`. Sama seperti V1, bacaan didukung Meilisearch dengan fallback ke PostgreSQL, dan `sort` deterministik memakai field `name`, `basePrice`, atau `createdAt`.

Contoh pemakaian:

```
GET /api/v1/admin/menus/search?name=kopi&minPrice=10000&maxPrice=50000&deleted=all&page=0&size=10
GET /api/v1/admin/menus/1
```

Gunakan endpoint ini (bukan V1 customer) setiap kali frontend admin perlu menampilkan menu yang sudah dihapus atau memfilter berdasarkan status hapus.

---

### F. Menus V2 — Cached (`/api/v2/menus`)

Path, method, request, dan logika validasi identik dengan V1. Perbedaannya hanya format response yang diperkecil untuk efisiensi cache di frontend. V2 tidak memiliki filter `minPrice`/`maxPrice` dan tidak memiliki endpoint admin. Sama seperti V1, `GET /` dan `GET /{id}` bersifat **public** (permitAll di `SecurityConfig`).

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create menu | Response `201` |
| `GET /` | List menus | Filter `name` (substring) dan `categoryId` saja, default `sort=name,asc` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update | |
| `PATCH /{id}/restore` | Restore soft-deleted | |
| `DELETE /{id}` | Soft delete | Response `204 No Content` |

**MenuResponseCached:**

```json
{
  "id": 1,
  "categoryIds": [1],
  "modifierTypesIds": [1]
}
```

Pola yang disarankan: ambil daftar ID dari V2, lalu petakan `categoryIds` dan `modifierTypesIds` ke data kategori dan modifier yang sudah di-cache secara lokal.

---

### G. Menu Categories (`/api/v1/menus/categories`)

**Publik** (permitAll di SecurityConfig, jwt-bypass-uris di application.yml).

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create | Response `201` |
| `GET /` | List | Filter `name` (substring), default `sort=displayName,asc` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update | |
| `PATCH /{id}/restore` | Restore | |
| `DELETE /{id}` | Soft delete | Response `204 No Content` |

**Create/Update Request:**

```json
{
  "displayName": "Hot Drinks",
  "categoryCode": "hot-drinks",
  "displayOrder": 1
}
```

`categoryCode` wajib format slug huruf kecil (contoh: `hot-drinks`, `makanan-utama`), panjang 3–30 karakter. `displayName` 3–30 karakter dan `displayOrder` minimal 0.

**MenuCategoryResponse:**

```json
{
  "id": 1,
  "name": "Kopi",
  "categoryCode": "COFFEE",
  "displayOrder": 1
}
```

---

### H. Modifiers (`/api/v1/menus/modifiers`)

Membutuhkan login. Tidak ada endpoint restore maupun PATCH.

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create modifier type + options | Response `201` |
| `GET /` | List | Filter `name` (substring), default `sort=name,asc` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update (termasuk options) | Pola reconcile berdasarkan `id` option |
| `DELETE /{id}` | Hard delete | Response `204 No Content` |

**Create Request:**

```json
{
  "name": "Sugar Level",
  "minSelection": 1,
  "maxSelection": 1,
  "options": [
    { "name": "Normal", "additionalPrice": 0 },
    { "name": "Extra", "additionalPrice": 2000 }
  ]
}
```

Saat update (`PUT`), tiap option yang menyertakan `id` akan di-update, option tanpa `id` dianggap baris baru, dan option lama yang tidak dikirim akan dihapus.

**ModifierTypeResponse:**

```json
{
  "id": 1,
  "name": "Sugar Level",
  "minSelection": 1,
  "maxSelection": 1,
  "options": [
    { "id": 1, "name": "Normal", "additionalPrice": 0 },
    { "id": 2, "name": "Extra", "additionalPrice": 2000 }
  ]
}
```

---

### I. Image Upload Auth (`/api/v1/images/auth`)

Membutuhkan login. Frontend mengunggah gambar langsung ke ImageKit (client-side upload); backend hanya menyediakan kredensial bertanda tangan.

```
GET /api/v1/images/auth
```

**Response 200:**

```json
{
  "isSuccess": true,
  "message": "Upload credentials successfully generated",
  "data": {
    "publicKey": "public_xxxx",
    "token": "random_token_16char",
    "expire": 1787163445,
    "signature": "hmac_sha1_signature"
  },
  "meta": { "timestamp": "..." }
}
```

**Alur upload gambar:**

1. Frontend meminta kredensial ke `GET /api/v1/images/auth`.
2. Frontend mengunggah langsung ke ImageKit memakai `publicKey`, `token`, `expire`, dan `signature`.
3. ImageKit mengembalikan URL gambar.
4. Frontend menyimpan URL tersebut di field `imageUrls` saat create atau update menu.

---

### J. Orders (`/api/v1/orders`)

Membutuhkan login.

#### Status Flow Order

```
[CREATED] ──confirm──> [CONFIRMED] ──prepare──> [PREPARING] ──ready──> [READY] ──complete──> [COMPLETED]
     │──cancel──> [CANCELLED]                    (dari CREATED atau CONFIRMED)
```

**Aturan transisi:**

| Dari | Ke | Syarat |
|---|---|---|
| `CREATED` | `CONFIRMED` | Bebas |
| `CREATED` | `CANCELLED` | Bebas |
| `CONFIRMED` | `PREPARING` | — |
| `CONFIRMED` | `CANCELLED` | Bebas |
| `PREPARING` | `READY` | — |
| `READY` | `COMPLETED` | — |
| `COMPLETED` / `CANCELLED` | — | Terminal — tidak bisa diubah lagi |

#### CRUD Endpoints

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create order | Response `201`. Order standalone otomatis membuat Invoice sendiri via event (lihat bagian Invoice) |
| `GET /` | List orders | Filter `keyword` (orderNumber/customerName), `status`; default `sort=createdAt,desc` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update (reconcile items) | Hanya saat status `CREATED`/`CONFIRMED`/`PREPARING`/`READY`. Invoice `OPEN` tanpa pembayaran ikut tersinkron (baris & total mengikuti order). Invoice yang sudah ada uang masuk (`PARTIALLY_PAID`/`PAID`) → `400` pada perubahan items — invoice dengan pembayaran bersifat permanen. Tipe order `DINE_IN` tidak boleh diubah. |
| `PATCH /{id}` | Partial update (reconcile items), minimal satu field terisi | Batasan status sama seperti `PUT`. Guard pembayaran hanya berlaku jika `items` dikirim; `notes`/`customerName` tetap boleh diubah meski invoice sudah dibayar. |
| `DELETE /{id}` | Soft delete | Response `204`. Invoice standalone unpaid ikut di-void; baris order di invoice dining dihapus. Jika invoice sudah ada pembayaran → `400` ("Order already has an applied payment"). |

#### Status Transition Endpoints

| Method | Path | Syarat |
|---|---|---|
| `POST /{id}/confirm` | Confirm order | Status harus CREATED |
| `POST /{id}/prepare` | Mulai proses | Status harus CONFIRMED |
| `POST /{id}/ready` | Siap disajikan | Status harus PREPARING |
| `POST /{id}/complete` | Selesai | Status harus READY |
| `POST /{id}/cancel` | Batal | Status harus CREATED atau CONFIRMED; invoice standalone yang belum dibayar ikut di-void |

> Order tidak lagi punya status bayar — tidak ada gate `PAID` di transisi mana pun. Settlement finansial sepenuhnya dimiliki Invoice. `Order` entity tidak punya `paidStatus` field. `markPaid` tidak ada di `OrderService` — payment settlement ke `Invoice` via `InvoicePaymentEventListener`.

#### Create Order Request

```json
{
  "type": "DINE_IN",
  "customerId": 1,
  "customerName": "John Doe",
  "notes": "Pedas sedang",
  "items": [
    {
      "menuId": 1,
      "quantity": 2,
      "modifiers": [
        { "modifierOptionId": 1 },
        { "modifierOptionId": 5 }
      ]
    }
  ]
}
```

Field `type` wajib diisi — enum `DINE_IN` atau `TAKEAWAY` (backend juga menerima alias `TAKE_AWAY`). Khusus `POST /orders`, `type: DINE_IN` ditolak (`400`) — order dine-in hanya via `POST /dinings/{id}/orders`. `customerId`, `customerName`, dan `notes` opsional dengan batasan panjang yang wajar, sedangkan `items` minimal berisi satu item dengan `quantity` minimal 1. Bila `customerId` diisi, backend memvalidasi ke `customers.id` (404 bila tidak ada); `customerName` tetap snapshot manual.

#### Update Order (PUT/PATCH) — Reconcile Pattern

Saat update items, gunakan `id` untuk mengidentifikasi baris:

- `id` terisi → baris tersebut di-update.
- `id` kosong (null) → baris baru dibuat.
- Baris lama yang tidak dikirim → dihapus (orphan removal).

```json
{
  "items": [
    { "id": 1, "menuId": 1, "quantity": 3, "modifiers": [{ "id": 1, "modifierOptionId": 2 }] },
    { "menuId": 2, "quantity": 1, "modifiers": [] }
  ]
}
```

Pada contoh di atas, baris `id: 1` di-update, baris baru (`menuId: 2`) ditambahkan, dan baris lama lain yang tidak disebut ikut dihapus.

#### OrderResponse

```json
{
  "id": 1,
  "orderNumber": "ORD-20260823-0001",
  "status": "CREATED",
  "type": "DINE_IN",
  "customerId": 1,
  "customerName": "John Doe",
  "notes": "Pedas sedang",
  "totalPrice": 54000,
  "createdAt": "2026-08-23T14:30:00Z",
  "updatedAt": null,
  "items": [
    {
      "id": 1,
      "menuId": 1,
      "itemName": "Kopi Latte",
      "unitPrice": 25000,
      "quantity": 2,
      "subtotal": 50000,
      "modifiers": [
        {
          "id": 1,
          "modifierTypeId": 1,
          "modifierOptionId": 1,
          "modifierName": "Normal",
          "additionalPrice": 0
        }
      ]
    }
  ]
}
```

**Enum values:**

| Field | Nilai |
|---|---|
| `status` | `CREATED`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED` (query juga menerima alias `CREATE`, `PREPARE`, `COMPLETE`, `CANCEL`) |
| `type` | `DINE_IN`, `TAKEAWAY` |

> `paidStatus` (`UNPAID`/`PAID`) sudah dihapus dari Order. Settlement finansial dimiliki Invoice (`OPEN`/`PARTIALLY_PAID`/`PAID`/`VOID`). Payment **selalu** menarget invoice — field `targetType`/`targetId` sudah diganti `invoiceId` (model target generik dihapus). Refund tidak ada di model (dihapus untuk MVP): payment yang `PAID` bersifat final. `PaymentStatus` enum hanya punya `PENDING`, `PAID`, `FAILED`, `EXPIRED` — tidak ada `REFUNDED`. `PaymentRefundedEvent` dan `POST /{id}/refund` tidak ada di kode.

---

### K. Payments (`/api/v1/payments`)

Membutuhkan login + authority payment (`payment.create` untuk create, `payment.read` untuk baca, `payment.update` untuk expire/fail), kecuali webhook.

#### Status Flow Payment

```
[PENDING] ──(webhook: bayar)──> [PAID]  (terminal)
    │
    ├──expire──> [EXPIRED]  (terminal)
    │
    └──fail──> [FAILED]     (terminal)
```

Status `PAID` dicapai lewat webhook Xendit atau langsung saat create dengan provider `INTERNAL` (tunai/CASH). Payment yang `PAID` otomatis meneruskan nominalnya ke invoice-nya (`OPEN` → `PARTIALLY_PAID` → `PAID`). Endpoint yang aktif untuk mengubah status secara manual hanya `expire` dan `fail`.

> **B2 ditutup — ini satu-satunya jalur uang.** Tidak ada lagi `POST /invoices/{id}/payments`; satu-satunya cara uang bergerak di invoice adalah melalui Payment record di sini, diteruskan via `PaymentSettledEvent`. Partial pay didukung lewat field `amount` opsional. Guard: hanya ada **satu payment `PENDING` aktif per invoice** (`400 "Invoice already has an active pending payment"`), dan `amount` > sisa ditolak (`400 "Payment amount exceeds remaining amount"`).
>
> **Alur settlement:** `PaymentSettledEvent` (berisi `paymentId`, `invoiceId`, `settledAmount`, `externalId`, `paidAt`) dikonsumsi oleh `InvoicePaymentEventListener` → `InvoiceService.applyPayment()`. Payment **tidak** langsung affect `Order` — `PaymentEffect` hanya set `paidAt` di Payment entity. `Order` tidak punya `paidStatus` field. `markPaid` tidak ada di `OrderService`.

| Dari | Ke | Syarat |
|---|---|---|
| `PENDING` | `PAID` | Via webhook Xendit |
| `PENDING` | `EXPIRED` | Via `POST /{id}/expire` |
| `PENDING` | `FAILED` | Via `POST /{id}/fail` |
| `EXPIRED` / `FAILED` | — | Terminal — tidak bisa diubah |

#### Endpoint Aktif

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create payment | Response `201` |
| `GET /` | List payments | Filter `keyword`, `invoiceId`, `status`, `paymentProvider`; default `sort=createdAt,desc` |
| `GET /{id}` | Get by ID | |
| `POST /{id}/expire` | Mark as EXPIRED | Dari PENDING |
| `POST /{id}/fail` | Mark as FAILED | Dari PENDING |

#### Endpoint Nonaktif

Endpoint berikut di-comment di source code dan tidak boleh dipakai: `POST /{id}/pay`, `PUT /{id}`, `PATCH /{id}`, `DELETE /{id}`. Tidak ada modul `/payment-methods` — referensi ke sana di dokumentasi lama sudah tidak berlaku.

#### Create Payment Request

```json
{
  "invoiceId": 1,
  "paymentProvider": "XENDIT",
  "paymentDetail": "BCA Virtual Account"
}
```

Ada 4 field: `invoiceId` (wajib, minimal 1 — payment selalu menarget invoice), `paymentProvider` (`INTERNAL` yang berarti tunai/CASH, atau `XENDIT`), `paymentDetail` opsional (maksimal 255 karakter), dan `amount` **opsional** (partial pay: minimal 1, maksimal = sisa tagihan; absen/null = lunasi seluruh `remainingAmount`). Field seperti `externalId` dan `invoiceUrl` diisi oleh backend, bukan oleh frontend.

#### PaymentResponse

```json
{
  "id": 1,
  "invoiceId": 1,
  "invoiceNumber": "INV-20260823-0001",
  "paymentProvider": "XENDIT",
  "paymentMethodName": "BCA Virtual Account",
  "externalId": "INV-20260830-001",
  "invoiceUrl": "https://checkout.xendit.co/...",
  "status": "PENDING",
  "paymentChannel": "XENDIT",
  "paymentDetail": "BCA Virtual Account",
  "amount": 54000,
  "appliedAmount": 54000,
  "excessAmount": 0,
  "paidAt": null,
  "createdAt": "2026-08-30T10:00:00Z",
  "updatedAt": null
}
```

---

### L. Dining Sessions (`/api/v1/dinings`)

Membutuhkan login. Tidak ada endpoint delete untuk dining.

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Buka sesi dining baru | Response `201` |
| `GET /` | List sesi | Pagination, default `sort=createdAt,desc` |
| `GET /{id}` | Detail sesi | |
| `POST /{id}/orders` | Tambah order ke sesi | Response `201`; item-item order otomatis ditambahkan ke Invoice milik dining |
| `POST /{id}/close` | Tutup sesi | Meja kembali AVAILABLE; semua order harus `COMPLETED`/`CANCELLED`. Invoice aktif harus `PAID` atau `VOID` (atau belum ada invoice). `OPEN`/`PARTIALLY_PAID` → `400`. Dining tanpa order boleh ditutup. Jalur darurat: void invoice dulu, lalu close. |

**Open Dining Request:**

```json
{ "tableId": 1 }
```

`tableId` wajib diisi (minimal 1) dan mejanya harus tersedia.

**Add Order to Dining Request:**

```json
{
  "customerId": 1,
  "customerName": "Budi",
  "notes": "Extra es",
  "items": [
    {
      "menuId": 1,
      "quantity": 2,
      "modifiers": [
        { "modifierOptionId": 1 }
      ]
    }
  ]
}
```

Bentuknya sama seperti create order, hanya saja tanpa field `type` karena order dining selalu bertipe `DINE_IN`.

**DiningResponse:**

```json
{
  "id": 1,
  "tableId": 1,
  "tableNumber": "1",
  "status": "OPEN",
  "totalPrice": 54000,
  "orders": [
    {
      "id": 1,
      "orderNumber": "ORD-20260823-0001",
      "status": "CREATED",
      "totalPrice": 54000,
      "createdAt": "2026-08-23T14:30:00Z"
    }
  ],
  "createdAt": "2026-08-23T14:30:00Z",
  "updatedAt": null,
  "closedAt": null
}
```

**Enum `DiningStatus`:** `OPEN`, `CLOSED`.

---

### M1. Customers (`/api/v1/customers`)

Member loyalty + akun login customer. `auth_users` adalah satu-satunya penegak
`email` unique; `customers.email` hanya snapshot non-unique. `orders.customer_id`
menunjuk `customers.id` (bukan `UserAuth.id`); guest (`customerId=null`) tetap bisa order.

| Method | Path | Keamanan | Keterangan |
|---|---|---|---|
| `POST /` | Register + buat akun | Publik | Body `{name, email, password(min 8), phone?}` → buat `auth_users` (role `CUSTOMER_BASE`) + profil; duplikat email → `409` |
| `POST /` | Create member (tanpa login) | `customer.create` | Body `{name, email?, phone?, notes?}` → `userAuthId=null` |
| `GET /` | List/search | `customer.read` | Filter `keyword` (name/email/phone), default `sort=createdAt,desc` |
| `GET /{id}` | Get by ID | `customer.read` | |
| `PUT /{id}` | Full update | `customer.update` | Profil saja (tidak mengubah akun) |
| `PATCH /{id}` | Partial update | `customer.update` | Minimal satu field terisi |
| `POST /{id}/claim` | Tautkan akun ke member lama | `customer.update` | Body `{email, password}`; gagal bila sudah punya `userAuthId` |
| `DELETE /{id}` | Soft delete | `customer.delete` | Response `204`; akun `auth_users` tidak ikut terhapus |

Login customer memakai endpoint yang sama: `POST /api/v1/auths/login`.
Token customer (`CUSTOMER_BASE`, nol authority staf) otomatis `403` di endpoint staf.

**CustomerResponse:**

```json
{
  "id": 1,
  "userAuthId": 10,
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "phone": "081234567890",
  "notes": null,
  "createdAt": "2026-09-06T10:00:00Z",
  "updatedAt": null
}
```

`userAuthId` nullable — `null` berarti member tanpa login (didaftarkan kasir).

### M. Tables (`/api/v1/tables`)

Membutuhkan login.

| Method | Path | Keterangan |
|---|---|---|
| `POST /` | Create table | Response `201` |
| `GET /` | List tables | Filter `keyword` (substring tableNumber), default `sort=tableNumber,asc` |
| `GET /{id}` | Get by ID | |
| `PUT /{id}` | Full update | |
| `PATCH /{id}` | Partial update | Minimal satu field terisi |
| `DELETE /{id}` | Hard delete | Response `204 No Content` |

**DiningTableRequest:**

```json
{ "tableNumber": "1" }
```

**DiningTableResponse:**

```json
{
  "id": 1,
  "tableNumber": "1",
  "status": "AVAILABLE",
  "createdAt": "2026-08-23T00:00:00Z",
  "updatedAt": null
}
```

**Enum `TableStatus`:** `AVAILABLE`, `OCCUPIED`. Status diatur oleh backend (misalnya saat sesi dining dibuka atau ditutup); frontend tidak perlu mengirimnya.

---

### N. Invoices (`/api/v1/invoices`)

Invoice adalah **financial obligation / tagihan yang harus dibayar** — pemilik tunggal status settlement (`OPEN` → `PARTIALLY_PAID` → `PAID`, atau `VOID`). Invoice terdiri dari baris-baris (`InvoiceItem`) yang masing-masing merupakan snapshot dari satu `OrderItem` (`orderItemId`, nama, `quantity`, `unitPrice`, `amount` final — harga sudah termasuk modifier).

Invoice umumnya **dibuat otomatis oleh backend via event**, bukan oleh frontend:

| Pemicu | Hasil |
|---|---|
| `POST /api/v1/orders` (standalone) | 1 Invoice (`diningId: null`) berisi 1 baris per OrderItem |
| `POST /api/v1/dinings/{id}/orders` | Baris-baris order ditambahkan ke **satu Invoice milik dining** (`diningId` terisi); order berikutnya menempel ke Invoice yang sama |
| `POST /api/v1/orders/{id}/cancel` | Invoice standalone yang belum dibayar ikut di-void |
| Payment `PAID` menarget `INVOICE` | Nominal diteruskan ke invoice (`paidAmount`/`remainingAmount`/`status` ter-update) |

| Method | Path | Authority | Keterangan |
|---|---|---|---|
| `POST /` | Create manual | `invoice.create` / `invoice.*` | Response `201`; untuk kebutuhan admin — operational flow memakai event |
| `GET /` | List invoices | `invoice.read` / `invoice.*` | Filter `keyword` (nomor invoice), `status`, `diningId` (tagihan 1 sesi), `orderId` (tagihan order standalone); default `sort=createdAt,desc` |
| `GET /{id}` | Get by ID | `invoice.read` / `invoice.*` | |
| `POST /{id}/void` | Void invoice | `invoice.update` / `invoice.*` | Hanya dari `OPEN`/`PARTIALLY_PAID`; invoice `PAID` tidak bisa di-void. Setelah void, dining `addOrder` ditolak; close dining diizinkan. |
| `DELETE /{id}` | Soft delete | `invoice.delete` / `invoice.*` | Tolak jika `PAID`/`PARTIALLY_PAID`. Invoice dining ditolak jika sesi masih `OPEN` (`400` "Tutup sesi dulu..."). |

**InvoiceResponse:**

```json
{
  "id": 900,
  "invoiceNumber": "INV-08092026-A1B2C3",
  "diningId": null,
  "status": "PARTIALLY_PAID",
  "totalAmount": 58000,
  "paidAmount": 40000,
  "remainingAmount": 18000,
  "issuedAt": "2026-09-08T10:00:00Z",
  "createdAt": "2026-09-08T10:00:00Z",
  "updatedAt": "2026-09-08T10:05:00Z",
  "items": [
    {
      "id": 1,
      "orderItemId": 11,
      "orderId": 101,
      "description": "Nasi Goreng",
      "quantity": 2,
      "unitPrice": 25000,
      "amount": 50000
    }
  ]
}
```

**Enum `InvoiceStatus`:** `OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID` (query juga menerima alias `partial`, `settled`, `voided`, `cancelled`).

> **Tidak ada TTL/expiry untuk invoice.** `Invoice` entity tidak punya field `expiresAt` atau `ttl`. Invoice tidak kedaluwarsa secara otomatis. `EXPIRED` status hanya ada di `PaymentStatus` (set manual via `POST /{id}/expire`), bukan invoice.

Catatan untuk frontend:
- `invoiceNumber` (bukan `id`) adalah referensi bisnis untuk ditampilkan ke pelanggan.
- `diningId: null` = tagihan order standalone; terisi = tagihan gabungan satu sesi dining.
- Harga per baris adalah snapshot dari menu saat order item dibuat/diubah — perubahan harga menu kemudian **tidak** mereprice invoice. Perubahan struktur item order (tambah/ubah qty/hapus) pada invoice `OPEN` tanpa pembayaran **ikut tersinkron** ke invoice; setelah ada pembayaran, perubahan items ditolak (`400`).
- Pada `PaymentResponse`: `amount` = uang yang masuk, `appliedAmount` = yang nempel ke tagihan, `excessAmount` = selisih yang diparkir (`amount = applied + excess`). `excess > 0` berarti ada kembalian/kelebihan yang perlu diputuskan kasir.

---

### O. Webhooks — Server-to-Server (Frontend Tidak Memanggil Langsung)

| Endpoint | Keamanan | Perilaku |
|---|---|---|
| `POST /api/v1/payments/webhooks/xendit` | Publik, header `X-Callback-Token` | Xendit memberi tahu pembayaran lunas; backend meng-update payment dan meneruskan nominal ke invoice terkait otomatis. Frontend cukup polling `GET /payments/{id}` atau `GET /invoices/{id}` untuk melihat status `PAID`. Response: `200` sukses maupun payload deterministik-buruk (malformed, external_id tak dikenal, status basi — dicatat di log, Xendit berhenti retry); `401` token salah; `500` untuk kegagalan transien agar Xendit retry. **Late payment:** webhook `PAID` atas payment lokal `EXPIRED`/`FAILED` diterima sebagai late settlement (bukan 500) — payment jadi `PAID`, invoice di-update, log `LATE_PAYMENT`. |
| `POST /api/v1/images/imagekit/webhooks` | Publik | ImageKit memberi tahu file dibuat, diubah, atau dihapus; backend meng-update registry internal. Tidak ada aksi yang diperlukan dari frontend. Response body kosong (`200` atau `400`). |

---

### P. Reports (`/api/v1/reports`)

Membutuhkan authority `report.read` (dimiliki ADMIN & CASHIER; selain itu `403 FORBIDDEN`).

Report adalah **pembaca langsung**: tidak ada tabel projection maupun listener event. Setiap angka diambil saat request dari fakta domain (invoice = tagihan, payment = kas, order/dining = operasional) lewat contract — jadi hasilnya selalu konsisten dengan DB saat itu, tidak ada periode "belum terisi".

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/dashboard/summary` | Ringkasan dashboard: kas, tagihan, operasional, penjualan menu, aktivitas terbaru. |

**Parameter query:**

| Param | Tipe | Wajib | Default | Keterangan |
|---|---|---|---|---|
| `from` | `date` (`YYYY-MM-DD`) | Tidak | Hari ini | Awal periode, inklusif (dari 00:00) |
| `to` | `date` (`YYYY-MM-DD`) | Tidak | Hari ini | Akhir periode, inklusif (sampai 24:00) |

Ketentuan periode:

- Default = **hari ini dalam timezone `Asia/Jakarta` (WIB)**; batas `[from 00:00, to+1 00:00)` dikonversi ke zona waktu server sebelum query.
- `to` sebelum `from` → `400 BAD_REQUEST`.

**Basis tiap angka — dua basis uang sengaja TIDAK digabung:**

| Field | Basis | Definisi |
|---|---|---|
| `sales.cash.received` | Payment | Σ `applied_amount` — uang yang benar-benar dialokasikan ke tagihan, dibucket dari `paid_at`. Kelebihan bayar (`excess_amount`) tidak dihitung. |
| `sales.billing.settledInvoices` | Invoice | Jumlah invoice yang dilunasi pada periode (berdasarkan `paid_at`). Status sekarang tidak mengubah fakta ini. |
| `sales.billing.settledAmount` | Invoice | Σ `settled_amount` = nilai tagihan saat dilunasi (dibekukan saat itu). |
| `sales.billing.averageSettledInvoice` | Invoice | `settledAmount ÷ settledInvoices`; `0` bila belum ada invoice lunas. |
| `sales.billing.outstandingInvoices` / `outstandingAmount` | Invoice | **Snapshot saat ini** pada `outstandingAsOf` (bukan filter periode): invoice `OPEN`/`PARTIALLY_PAID` dengan sisa > 0, dan Σ sisanya (piutang berjalan). Piutang itu pos neraca, bukan arus periode. |
| `operations` | Dining / Order | `openDinings` (dining `OPEN`), `occupiedTables`/`availableTables` (`dining_tables`), `ordersInProgress` (order `CREATED`/`CONFIRMED`/`PREPARING`). |
| `topMenus` | Invoice | Penjualan menu dari invoice yang lunas pada periode; totalnya sejalan dengan `settledAmount`. `menuId` `null` = baris tagihan manual. Nama diambil dari master menu, fallback deskripsi tagihan. |
| `recentActivity` | Order + Invoice | 10 order terbaru (`created_at` DESC, tanpa filter periode); `billingStatus` dari invoice aktif yang memuat order tersebut (`OPEN`/`PARTIALLY_PAID`/`PAID`/`VOID`, atau `null` bila tidak ada invoice aktif). |

Catatan penting:

- **Satu-satunya jalur uang adalah `POST /payments`** (B2 ditutup): `POST /invoices/{id}/payments` sudah dihapus. Pelunasan invoice HANYA terjadi lewat `PaymentSettledEvent` — tidak ada lagi angka yang bergerak di luar Payment record. Partial pay didukung lewat field `amount` opsional di `POST /payments`.
- **Refund sudah dihapus dari model** (keputusan MVP): tidak ada `cash.refunded`/`net` maupun `billing.refundedAmount`; invoice dengan pembayaran bersifat permanen, koreksi setelah uang masuk dilakukan di luar sistem.
- Dua basis tetap dipisah, tetapi kini bergerak dari jalur yang sama: `sales.cash` menghitung uang (`applied_amount`), `sales.billing` menghitung tagihan (`settled_amount`). Selisih normal yang tersisa hanya dari kelebihan bayar yang diparkir (`excess_amount`) atau void. Selama tidak ada keduanya, `cash.received` == `billing.settledAmount`.
- Perubahan nama dari versi report lama: `grossRevenue`/`paidOrders`/`unpaidOrders`/`averageOrderValue` digantikan `sales.cash.*` dan `sales.billing.*`.

**Response `200`:**

```json
{
  "isSuccess": true,
  "message": "Dashboard summary successfully retrieved",
  "data": {
    "period": { "from": "2026-09-06", "to": "2026-09-06" },
    "sales": {
      "cash": { "received": 30000 },
      "billing": {
        "settledInvoices": 1,
        "settledAmount": 50000,
        "averageSettledInvoice": 50000,
        "outstandingInvoices": 2,
        "outstandingAmount": 45000,
        "outstandingAsOf": "2026-09-06T14:30:00"
      }
    },
    "operations": { "openDinings": 2, "occupiedTables": 2, "availableTables": 8, "ordersInProgress": 4 },
    "topMenus": [
      { "menuId": 1, "name": "Nasi Goreng", "qty": 5, "revenue": 50000 }
    ],
    "recentActivity": [
      { "orderId": 12, "orderNumber": "ORD-20260906-001", "status": "COMPLETED", "billingStatus": "PAID", "orderTotalPrice": 45000, "createdAt": "2026-09-06T14:30:00" }
    ]
  },
  "meta": { "timestamp": "2026-09-06T07:00:00Z" }
}
```

---

## 7. Error Codes Reference

| ErrorCode | HTTP Status | Keterangan |
|---|---|---|
| `BAD_REQUEST` | 400 | Input tidak valid atau request malformed (termasuk PATCH kosong, ID tidak valid, pelanggaran flow order/payment) |
| `INVALID_ARGUMENT` | 400 | Argumen tidak valid — biasanya enum salah tulis; pesan error menyebutkan nilai yang diperbolehkan |
| `MALFORMED_JSON` | 400 | JSON body tidak bisa di-parse — **message generik**; detail parse hanya di log server |
| `MISSING_PARAMETER` | 400 | Parameter wajib tidak dikirim |
| (validasi, `errorCode: null`) | 400 | Validasi gagal — detail per field ada di array `errors` |
| `UNAUTHORIZED` | 401 | Token tidak valid, kedaluwarsa, tidak ada, atau `"Refresh token is missing"` |
| `ACCESS_TOKEN_EXPIRED` | 401 | Access token kedaluwarsa — coba refresh (berasal dari library JWT, verifikasi saat runtime) |
| `INVALID_ACCESS_TOKEN` | 401 | Access token rusak — coba refresh |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token tidak valid atau hilang — logout |
| `FORBIDDEN` | 403 | Tidak punya hak akses (Spring Security) |
| `NOT_FOUND` | 404 | Data tidak ditemukan |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method tidak didukung untuk path tersebut |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Content-Type tidak didukung (kirim `application/json`) |
| `CONFLICT` | 409 | Konflik data |
| `DUPLICATE_ENTRY` | 409 | Pelanggaran constraint DB (duplikat/FK/not-null) — **message generik**; nama constraint & detail hanya di log server |
| `INTERNAL_SERVER_ERROR` | 500 | Error tak terduga — **message selalu generik**; detail + stacktrace hanya di log server (saat melapor bug, sertakan `meta.timestamp`) |

> Kebijakan masking lengkap: lihat §3.C. Intinya: `message` dijamin akurat untuk kondisi yang ditulis sadar kode (guard bisnis, validasi, enum); baris bertanda generik di atas **bukan untuk di-match** FE — branch on `isSuccess` + status + `errorCode`.

---

## 8. Kredensial Seeder (Pengujian)

Jalankan dengan `--seed dev` atau profile `dev-seed`:

| Email | Password | Role | Keterangan |
|---|---|---|---|
| `admin@rascal.id` | `admin123` | `ADMIN` | Akses penuh |
| `kasir@rascal.id` | `kasir123` | `CASHIER` | Order, kasir, baca menu |
| `waiter@rascal.id` | `waiter123` | `WAITER` | Buat order, meja, baca menu |
| `kitchen@rascal.id` | `kitchen123` | `KITCHEN` | Update status order, baca menu |

Seeder formal hanya membuat akun admin; seeder dev membuat keempat akun di atas.

> **Catatan:** Authority per role di `DevRoleSeeder` (sumber kebenaran):
> - **CASHIER** hanya punya `dining.read` + `table.read` (bukan `dining.create`/`dining.update`)
> - **WAITER** punya `dining.create/read/update` + `table.create/read/update`
> - **KITCHEN** punya `order.read` + `order.mark.preparing/ready` + `kitchen.read/update`
> - **CASHIER** hanya punya `image.read` (bukan `image.create`) — jadi hanya admin yang bisa upload gambar di dev
>
> Lihat `AUTH.md` §4.1 dan `DevRoleSeeder.java` untuk detail lengkap.

---

## 9. Daftar Endpoint Lengkap (Quick Reference)

```
AUTH
POST   /api/v1/auths/login              (public)
POST   /api/v1/auths/refresh            (public, cookie only, merotasi cookie)
POST   /api/v1/auths/logout             (cookie)
POST   /api/v1/auths/logout-all         (bearer)
POST   /api/v1/auths/forgot-password    (public)
POST   /api/v1/auths/reset-password     (public)

USERS
POST   /api/v1/auths/users
GET    /api/v1/auths/users?page=&size=&email=
GET    /api/v1/auths/users/{id}
PUT    /api/v1/auths/users/{id}
PATCH  /api/v1/auths/users/{id}
DELETE /api/v1/auths/users/{id}

ROLES
POST   /api/v1/auths/roles
GET    /api/v1/auths/roles?page=&size=&name=
GET    /api/v1/auths/roles/{id}
PUT    /api/v1/auths/roles/{id}
PATCH  /api/v1/auths/roles/{id}
DELETE /api/v1/auths/roles/{id}

AUTHORITIES (tanpa create/update)
GET    /api/v1/auths/authorities?page=&size=&name=
GET    /api/v1/auths/authorities/{id}
DELETE /api/v1/auths/authorities/{id}

MENUS (V1)
POST   /api/v1/menus
GET    /api/v1/menus?page=&size=&name=&categoryId=&minPrice=&maxPrice=
GET    /api/v1/menus/{id}
PUT    /api/v1/menus/{id}
PATCH  /api/v1/menus/{id}/restore
DELETE /api/v1/menus/{id}

ADMIN MENUS (read-only, termasuk soft-deleted)
GET    /api/v1/admin/menus/search?name=&categoryId=&minPrice=&maxPrice=&isAvailable=&deleted=
GET    /api/v1/admin/menus/{id}

MENUS (V2 — cached, hanya name & categoryId)
POST   /api/v2/menus
GET    /api/v2/menus?page=&size=&name=&categoryId=
GET    /api/v2/menus/{id}
PUT    /api/v2/menus/{id}
PATCH  /api/v2/menus/{id}/restore
DELETE /api/v2/menus/{id}

MENU CATEGORIES
POST   /api/v1/menus/categories
GET    /api/v1/menus/categories?page=&size=&name=
GET    /api/v1/menus/categories/{id}
PUT    /api/v1/menus/categories/{id}
PATCH  /api/v1/menus/categories/{id}/restore
DELETE /api/v1/menus/categories/{id}

MODIFIERS
POST   /api/v1/menus/modifiers
GET    /api/v1/menus/modifiers?page=&size=&name=
GET    /api/v1/menus/modifiers/{id}
PUT    /api/v1/menus/modifiers/{id}
DELETE /api/v1/menus/modifiers/{id}

IMAGE UPLOAD
GET    /api/v1/images/auth

ORDERS
POST   /api/v1/orders
GET    /api/v1/orders?page=&size=&keyword=&status=
GET    /api/v1/orders/{id}
PUT    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}
DELETE /api/v1/orders/{id}
POST   /api/v1/orders/{id}/confirm
POST   /api/v1/orders/{id}/prepare
POST   /api/v1/orders/{id}/ready
POST   /api/v1/orders/{id}/complete
POST   /api/v1/orders/{id}/cancel

PAYMENTS (tanpa refund; pay/PUT/PATCH/DELETE DISABLED)
POST   /api/v1/payments
GET    /api/v1/payments?page=&size=&keyword=&invoiceId=&status=&paymentProvider=
GET    /api/v1/payments/{id}
POST   /api/v1/payments/{id}/expire
POST   /api/v1/payments/{id}/fail
POST   /api/v1/payments/webhooks/xendit   (public, server-to-server)

IMAGES WEBHOOK
POST   /api/v1/images/imagekit/webhooks   (public, server-to-server)

INVOICES
POST   /api/v1/invoices
GET    /api/v1/invoices?page=&size=&keyword=&status=&diningId=&orderId=
GET    /api/v1/invoices/{id}
POST   /api/v1/invoices/{id}/void
DELETE /api/v1/invoices/{id}

DINING
POST   /api/v1/dinings
GET    /api/v1/dinings?page=&size=
GET    /api/v1/dinings/{id}
POST   /api/v1/dinings/{id}/orders
POST   /api/v1/dinings/{id}/close

CUSTOMERS
POST   /api/v1/customers/register   (public, member + akun)
POST   /api/v1/customers
GET    /api/v1/customers?keyword=&page=&size=
GET    /api/v1/customers/{id}
PUT    /api/v1/customers/{id}
PATCH  /api/v1/customers/{id}
POST   /api/v1/customers/{id}/claim
DELETE /api/v1/customers/{id}

TABLES
POST   /api/v1/tables
GET    /api/v1/tables?page=&size=&keyword=
GET    /api/v1/tables/{id}
PUT    /api/v1/tables/{id}
PATCH  /api/v1/tables/{id}
DELETE /api/v1/tables/{id}

REPORTS (report.read — ADMIN & CASHIER saja)
GET    /api/v1/reports/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD   (default: hari ini WIB)
```

> **Catatan:** `POST /api/v1/auths/forgot-password` dan `POST /api/v1/auths/reset-password` ada di `SecurityConfig` dan `jwt-bypass-uris` di `application.yml`. Service `PasswordResetService` sudah lengkap (request reset + reset password dengan validasi token). Model request/response sudah ada di `auth-core`.
>
> **CORS:** Ditangani oleh Vercel proxy di sisi FE. Tidak perlu explicit origin config di `SecurityConfig`.
>
> **`jwt-bypass-uris`:** Path menu (`/api/v1/menus`, `/api/v1/menus/{id}`, `/api/v1/menus/categories`, `/api/v1/menus/categories/{id}`) sudah ada di `jwt-bypass-uris` dan `permitAll` di `SecurityConfig`.

