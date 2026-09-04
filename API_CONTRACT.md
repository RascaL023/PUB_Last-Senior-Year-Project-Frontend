# API Contract — Backend Modular Monolith (English, agent-precise)

> Machine-readable companion to `API_CONTRACT.md`. Verified against source code as of **2026-09-04**.
> Rules for agents: treat endpoint tables as normative. `message` strings are informational only — branch on `isSuccess` + HTTP status + `errorCode`. `204 No Content` has an empty body and must not be JSON-parsed.

## 1. Base, routing, conventions

| Item | Value | Source |
|---|---|---|
| Direct base URL | `http://localhost:8081` | `config/*.env: SERVICES_CORE_PORT` |
| Proxy base URL (recommended) | `http://localhost:9000`, Nginx routes `/api/` → backend, `/` → frontend `:5173`, `/health` → `{"status":"ok"}` | `reverse-proxy/nginx/*.conf` |
| Prefixes | `/api/v1` (all modules), `/api/v2/menus` (cached menu variant) | controllers `@RequestMapping` |
| Content-Type | `application/json` for all bodies; omission yields `415 UNSUPPORTED_MEDIA_TYPE` | `GlobalExceptionHandler` |
| Auth transport | `Authorization: Bearer <accessToken>` + `httpOnly` cookie `refresh_token` (browser-automatic) | `SecurityConfig`, `RefreshTokenCookieFactory` |

HTTP semantics: `200` read/update/transition; `201` successful `POST` create (`UserAuthController`, `RoleController`, `MenuController(+V2)`, `MenuCategoryController`, `ModifierController`, `OrderController`, `PaymentController`, `DiningController`, `TableController`); `204` empty body on all `DELETE` (`UserAuth`, `Role`, `Authority`, `Menu+V2`, `MenuCategory`, `Modifier`, `Order`, `Table`) — disabled payment `PUT/PATCH/DELETE` are commented out and must not be called.

Pagination (all lists): query `page` (int, 0-based, default 0), `size` (int, default 10), `sort` (`field,direction`, per-controller default). Response `meta.pagination` is 1-based: `{currentPage: page+1, perPage, totalItems, totalPages: ceil(total/perPage), hasNextPage, hasPrevPage}` plus `meta.timestamp`. Computed in `ApiResponse.paged`.

Response envelopes (`core/common`: `ApiResponse`, `SuccessTemplate`, `SuccessPagedTemplate`, `ErrorTemplate`, `FieldErrorTemplate`, `MetaTemplate`):
- single: `{isSuccess:true, message:string, data:T|null, meta:{timestamp}}`
- paged: `{isSuccess:true, message:string, data:T[], meta:{pagination:{...}, timestamp}}`
- error: `{isSuccess:false, message:string, errorCode:string|null, errors:null, meta:{timestamp}}`
- validation: `{isSuccess:false, message:"Validation failed", errorCode:null, errors:[{field,message}], meta:{timestamp}}` (HTTP 400, from `MethodArgumentNotValidException`).

## 2. Authentication and authorization

### 2.1 Token model
- Access token: JWT (HMAC-SHA, external `JwtAuthFilter` lib), 15 min lifetime, claims `{sub: userId string, roles: string[], authorities: string[]}`. Send as `Authorization: Bearer <token>`. Store in memory, never localStorage.
- Refresh token: opaque Base64 (64 bytes), 20-day lifetime. Cookie `refresh_token`: `httpOnly=true, secure=false, sameSite=Strict, path=/api/v1/auths, maxAge=20d` (`RefreshTokenCookieFactory.create/clear`). Browser sends it only to paths under `/api/v1/auths`.

### 2.2 Auth endpoints (`AuthController @RequestMapping("/api/v1/auths")`)
| Method Path | Security | Request → Response |
|---|---|---|
| `POST /api/v1/auths/login` | public | `LoginRequest{email: email+notBlank, password: notBlank+size>=8}` → `200 {isSuccess,message:"Login success, welcome back!", data:LoginResponse{id:long, email:string, accessToken:string}}` + `Set-Cookie: refresh_token` |
| `POST /api/v1/auths/refresh` | public, JWT bypass, cookie-only (`@CookieValue refresh_token required=false`; missing/blank → `401 UNAUTHORIZED "Refresh token is missing"`) | no body → `200 {data:{accessToken:string}}` (message = default `"Request processed successfully"`) |
| `POST /api/v1/auths/logout` | cookie optional (revokes if present) | no body → `200 {message:"Logout success", data:null}` + clear-cookie |
| `POST /api/v1/auths/logout-all` | Bearer (`Authentication.getName()` = userId) | no body → `200 {message:"Logout all success", data:null}` + clear-cookie, revokes all DB tokens |

There is no `POST /auths/register`. User provisioning is `POST /auths/users` (authenticated).

### 2.3 Security filter chain (`SecurityConfig`)
- `STATELESS`, `csrf.disable`, `OPTIONS /** → permitAll`.
- `permitAll`: `/api/v1/auths/login`, `/api/v1/auths/refresh`, `/api/v1/payments/webhooks/xendit`, `/api/v1/images/imagekit/webhooks`; `jwtBypassFilter` skips `JwtAuthFilter` for `/api/v1/auths/refresh` + the two webhooks. Everything else `authenticated()` with `SecurityExceptionHandler` (401/403 JSON).
- `@EnableMethodSecurity`: only `RoleController` and `AuthorityController` use `@PreAuthorize`. All other controllers require a valid Bearer token but no fine-grained authority.

### 2.4 401 decision table (frontend interceptor)
`JwtAuthFilter` errorCodes (to-verify at runtime, external lib): `ACCESS_TOKEN_EXPIRED` (401, JWT past 15 min) → refresh; `INVALID_ACCESS_TOKEN` (401, corrupt/signature) → refresh; `INVALID_REFRESH_TOKEN` (401, refresh path) → logout + redirect `/login`; `UNAUTHORIZED` (401, missing/non-Bearer header, insufficient role, or `"Refresh token is missing"`) → logout if refresh-related, else surface error without redirect. Refresh call: `POST /api/v1/auths/refresh` with no `Authorization` header and `withCredentials:true`; on 200 store `data.accessToken` and retry once (`_retry` guard, `isRefreshing` + queue to coalesce parallel 401s).

### 2.5 Authorization matrix
| Endpoint | Required |
|---|---|
| `POST /auths/login`, `POST /auths/refresh`, `POST /payments/webhooks/xendit`, `POST /images/imagekit/webhooks` | public |
| `POST /auths/users`, `GET /auths/users`, `GET /auths/users/{id}`, `PUT/PATCH/DELETE /auths/users/{id}` | authenticated (no `@PreAuthorize`) |
| `POST /auths/roles` | `hasAnyAuthority('role.create','role.*')` |
| `GET /auths/roles`, `GET /auths/roles/{id}` | `hasAnyAuthority('role.read','role.*')` |
| `PUT/PATCH /auths/roles/{id}` | `hasAnyAuthority('role.update','role.*')` |
| `DELETE /auths/roles/{id}` | `hasAnyAuthority('role.delete','role.*')` |
| `GET /auths/authorities` | `hasAnyAuthority('authority.read','authority.*')` |
| `GET /auths/authorities/{id}` | `hasAnyAuthority('authority.create','authority.*')` — quirk, not `read` |
| `DELETE /auths/authorities/{id}` | `hasAnyAuthority('authority.delete','authority.*')` |
| Menus V1/V2, categories, modifiers, orders, payments (active subset), dinings, tables, `GET /images/auth` | authenticated (no `@PreAuthorize`) |

## 3. Users, roles, authorities

### 3.1 Users (`UserAuthController @RequestMapping("/api/v1/auths/users")`, authenticated)
| Method | Query/Body → Response |
|---|---|
| `POST /` → `201 "User successfully created"` | `UserAuthRequest{email: email+notBlank, password: notBlank+size>=8, roleIds: Set<Long> notEmpty}` → `UserAuthResponse{id, email, roles: Set<RoleResponse>, createdAt, updatedAt}` |
| `GET /?page&size&sort&email=` | `email` substring filter → paged `UserAuthResponse` |
| `GET /{id}` | → `UserAuthResponse` |
| `PUT /{id}` | `UserAuthPutRequest` (same shape as create, all required) → `UserAuthResponse` |
| `PATCH /{id}` | `UserAuthPatchRequest{Optional<email,password,roleIds>}`; empty patch rejected 400 → `UserAuthResponse` |
| `DELETE /{id}` | → `204` empty (soft delete) |
`RoleResponse{id, name, authorities: Set<AuthorityResponse>, createdAt, updatedAt}`; `AuthorityResponse{id, name, createdAt, updatedAt}`.

### 3.2 Roles (`RoleController @RequestMapping("/api/v1/auths/roles")`)
| Method | Validation → Response |
|---|---|
| `POST /` (`role.create`) → `201 "Role successfully created"` | `RoleRequest{name: notBlank+size 3..20, authorityIds: Set<Long> notEmpty}` → `RoleResponse` |
| `GET /?name=&page&size` (`role.read`) | `name` substring → paged `RoleResponse` |
| `GET /{id}` (`role.read`) | → `RoleResponse` |
| `PUT /{id}` (`role.update`) | `RolePutRequest` (same as create) → `RoleResponse` |
| `PATCH /{id}` (`role.update`) | `RolePatchRequest{Optional<name,authorityIds>}` → `RoleResponse` |
| `DELETE /{id}` (`role.delete`) | → `204` |

### 3.3 Authorities (`AuthorityController @RequestMapping("/api/v1/auths/authorities")`)
| Method | Response |
|---|---|
| `GET /?name=&page&size` (`authority.read`) | paged `AuthorityResponse{id, name, createdAt, updatedAt}` |
| `GET /{id}` (`authority.create` quirk) | `AuthorityResponse` |
| `DELETE /{id}` (`authority.delete`) | `204` |
No POST/PUT/PATCH exist.

## 4. Menus, categories, modifiers

### 4.1 Menus V1 (`MenuController @RequestMapping("/api/v1/menus")`) and V2 (`MenuControllerV2 @RequestMapping("/api/v2/menus")`)
Identical paths/methods/validation; only response DTO differs. All authenticated.
| Method | Request → Response |
|---|---|
| `POST /` → `201 "Menu successfully created"` | `MenuRequest{name: notBlank+size 3..30, categoryIds: List<Long>=1 notEmpty, description?: string, imageUrls?: List<string>, basePrice: notNull+min 500, isAvailable?: boolean, ModifierTypeIds?: List<Long> (capital M, as in source)}` → V1 `MenuResponse` / V2 `MenuResponseCached` |
| `GET /?name=&categoryId=&page&size` (default `sort=name,asc`) | `name` substring + `categoryId` exact → paged V1/V2 |
| `GET /{id}` | V1 `MenuResponse{id, name, description, categories: MenuCategoryResponse[], imageUrls, basePrice, isAvailable, createdAt, updatedAt, modifierTypes: ModifierTypeResponse[]}` / V2 `MenuResponseCached{id, categoryIds: Set<Long>, modifierTypesIds: Set<Long>}` |
| `PUT /{id}` | `MenuPutRequest` (same as `MenuRequest`) → same response |
| `PATCH /{id}/restore` | no body (un-soft-delete) → same response |
| `DELETE /{id}` | → `204` (soft delete) |

### 4.2 Categories (`MenuCategoryController @RequestMapping("/api/v1/menus/categories")`)
| Method | Validation |
|---|---|
| `POST /` → `201` | `MenuCategoryRequest{displayName: notBlank+size 3..30, categoryCode: notBlank+size 3..30+pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$ (e.g. hot-drinks), displayOrder: notNull+min 0}` → `MenuCategoryResponse{id, name, categoryCode, displayOrder}` |
| `GET /?name=&page&size` (default `sort=displayName,asc`) | `name` substring → paged `MenuCategoryResponse` |
| `GET /{id}` / `PUT /{id}` (`MenuCategoryPutRequest`, same shape) / `PATCH /{id}/restore` | → `MenuCategoryResponse` |
| `DELETE /{id}` | → `204` (soft delete) |

### 4.3 Modifiers (`ModifierController @RequestMapping("/api/v1/menus/modifiers")`)
| Method | Validation |
|---|---|
| `POST /` → `201` | `ModifierTypeRequest{name: notBlank+size 3..20, minSelection: notNull+min 0, maxSelection: notNull+min 1, options: List<ModifierOptionRequest{name: required, additionalPrice: >=0}> notEmpty}` → `ModifierTypeResponse{id, name, minSelection, maxSelection, options: ModifierOptionResponse{id, name, additionalPrice}[]}` |
| `GET /?name=&page&size` (default `sort=name,asc`) | `name` substring → paged `ModifierTypeResponse` |
| `GET /{id}` | → `ModifierTypeResponse` |
| `PUT /{id}` | `ModifierTypePutRequest` (same + `ModifierOptionPutRequest{id?: long, name, additionalPrice}`; reconcile by `id`: present=update, null=insert, missing=delete) → `ModifierTypeResponse` |
| `DELETE /{id}` | → `204` (hard delete) |
No PATCH/restore.

## 5. Orders

`OrderController @RequestMapping("/api/v1/orders")`, authenticated. Enums: `OrderStatus{CREATED,CONFIRMED,PREPARING,READY,COMPLETED,CANCELLED}` (query aliases accepted: `CREATE→CREATED`, `PREPARE→PREPARING`, `COMPLETE→COMPLETED`, `CANCEL→CANCELLED`; case/format-insensitive via `StringUtil.toUnderscoredEnum`); `OrderType{DINE_IN,TAKEAWAY}` (alias `TAKE_AWAY`); `OrderPaidStatus{UNPAID,PAID}` (alias `UN_PAID`).

| Method | Request → Response |
|---|---|
| `POST /` → `201 "Order successfully created"` | `OrderRequest{customerId?: min 1, customerName?: max 50, notes?: max 255, type!: OrderType, items!: List<OrderItemRequest{id?: long, menuId!: long, quantity!: min 1, modifiers: List<OrderItemModifierRequest{id?: long, modifierOptionId!: long}>}[]>} notEmpty}` → `OrderResponse` |
| `GET /?keyword=&status=&paidStatus=&page&size` (default `sort=createdAt,desc`) | `keyword` matches orderNumber/customerName; `status`/`paidStatus` via `fromString` (invalid → `400 INVALID_ARGUMENT`) → paged `OrderResponse{id, orderNumber, status, type, paidStatus, customerId, customerName, notes, totalPrice, createdAt, updatedAt, items: OrderItemResponse{id, menuId, itemName, unitPrice, quantity, subtotal, modifiers: OrderItemModifierResponse{id, modifierTypeId, modifierOptionId, modifierName, additionalPrice}[]}}` |
| `GET /{id}` | → `OrderResponse` |
| `PUT /{id}` | `OrderPutRequest` (same as create) — reconcile items by `id` → `OrderResponse` |
| `PATCH /{id}` | `OrderPatchRequest{Optional<customerName,notes,type,items>}`; `isEmptyPatch()` → `400` → `OrderResponse` |
| `DELETE /{id}` | → `204` (hard delete) |
| `POST /{id}/confirm` → `"Order successfully marked as confirmed"` | no body → `OrderResponse` |
| `POST /{id}/prepare` → `"...preparing"` | → `OrderResponse` |
| `POST /{id}/ready` → `"...ready"` | → `OrderResponse` |
| `POST /{id}/complete` → `"...complete"` | → `OrderResponse` |
| `POST /{id}/cancel` → `"...cancelled"` | → `OrderResponse` |

Status flow (`OrderStatusFlowPolicy`): `CREATED→CONFIRMED` (TAKEAWAY requires `paidStatus=PAID`, else 400; `CANCELLED` also allowed from `CREATED`), `CONFIRMED→PREPARING`, `PREPARING→READY`, `READY→COMPLETED` (requires `PAID`), `CREATED/CONFIRMED→CANCELLED`; `COMPLETED`/`CANCELLED` terminal (any transition → `400 BAD_REQUEST "Invalid order flow status"`).

## 6. Payments

`PaymentController @RequestMapping("/api/v1/payments")`, authenticated except webhook. Enums: `PaymentTargetType{ORDER,DINE_IN}` (alias `DINEIN`); `PaymentProvider{INTERNAL,XENDIT}` (alias `CASH→INTERNAL`); `PaymentStatus{PENDING,PAID,FAILED,EXPIRED,REFUNDED}`.

Active endpoints:
| Method | Request → Response |
|---|---|
| `POST /` → `201 "Payment successfully created"` | `PaymentRequest{targetType!: PaymentTargetType, targetId!: min 1, paymentProvider!: PaymentProvider, paymentDetail?: max 255}` → `PaymentResponse{id, targetType, targetId, targetReference, paymentProvider, paymentMethodName, externalId, invoiceUrl, status, paymentChannel, paymentDetail, amount, paidAt, createdAt, updatedAt}` (provider-derived fields like `externalId`/`invoiceUrl` are server-generated) |
| `GET /?keyword=&targetType=&targetId=&status=&paymentProvider=&page&size` (default `sort=createdAt,desc`) | `keyword` generic search; `targetType`/`status`/`paymentProvider` via `fromString` (invalid → `400 INVALID_ARGUMENT`) → paged `PaymentResponse` |
| `GET /{id}` | → `PaymentResponse` |
| `POST /{id}/expire` → `"Payment successfully marked as expired"` | `PENDING→EXPIRED` → `PaymentResponse` |
| `POST /{id}/fail` → `"Payment successfully marked as failed"` | `PENDING→FAILED` → `PaymentResponse` |
| `POST /{id}/refund` → `"Payment successfully marked as refunded"` | `PAID→REFUNDED` → `PaymentResponse` |

Disabled (commented out in `PaymentController.java:58,121,133,148`; agents must not generate calls): `POST /{id}/pay`, `PUT /{id}`, `PATCH /{id}`, `DELETE /{id}`. There is no `/payment-methods` module — any reference is stale. `PAID` is reached via Xendit webhook side-effect, not a direct endpoint.

## 7. Dining and tables

`DiningController @RequestMapping("/api/v1/dinings")`, `TableController @RequestMapping("/api/v1/tables")`, authenticated. Enums: `DiningStatus{OPEN,CLOSED}`, `TableStatus{AVAILABLE,OCCUPIED}`.

| Method | Request → Response |
|---|---|
| `POST /api/v1/dinings` → `201` | `OpenDiningRequest{tableId!: min 1}` → `DiningResponse{id, tableId, tableNumber, status, totalPrice, orders: DiningOrderSummary{id, orderNumber, status, totalPrice, createdAt}[], createdAt, updatedAt, closedAt}` |
| `GET /api/v1/dinings?page&size` (default `sort=createdAt,desc`) | no filters → paged `DiningResponse` |
| `GET /api/v1/dinings/{id}` | → `DiningResponse` |
| `POST /api/v1/dinings/{id}/orders` → `201` | `CreateDiningOrderRequest{customerId?: min 1, customerName?: max 50, notes?: max 255, items!: List<DiningOrderItemRequest{menuId, quantity, modifiers: List<DiningOrderItemModifierRequest{modifierOptionId}>}>} notEmpty}` (no `type`; server forces `DINE_IN`) → `DiningResponse` |
| `POST /api/v1/dinings/{id}/close` | no body → `DiningResponse` (`status=CLOSED`, table back to `AVAILABLE`) |
| `POST /api/v1/tables` → `201` | `DiningTableRequest{tableNumber!: max 50}` → `DiningTableResponse{id, tableNumber, status, createdAt, updatedAt}` |
| `GET /api/v1/tables?keyword=&page&size` (default `sort=tableNumber,asc`) | `keyword` = tableNumber substring → paged `DiningTableResponse` |
| `GET /api/v1/tables/{id}` | → `DiningTableResponse` |
| `PUT /api/v1/tables/{id}` | `DiningTablePutRequest` (same shape) → `DiningTableResponse` |
| `PATCH /api/v1/tables/{id}` | `DiningTablePatchRequest{Optional<tableNumber>}` → `DiningTableResponse` |
| `DELETE /api/v1/tables/{id}` | → `204` |
No dining delete endpoint exists.

## 8. Images and webhooks (server-to-server)

| Method | Security → Behavior (FE does not call webhooks directly) |
|---|---|
| `GET /api/v1/images/auth` (`ImageUploadAuthController`) | Bearer → `200 "Upload credentials successfully generated" {data: ImageUploadAuthApiResponse{publicKey, token, expire: long, signature}}`. FE uploads directly to ImageKit with these params, then stores resulting URL in `menu.imageUrls`. |
| `POST /api/v1/payments/webhooks/xendit` (`XenditWebhookController`) | public (JWT bypass + `permitAll`); `X-Callback-Token?` header + raw `string` body; `401` empty on bad token, `400` empty on parse failure, `200` empty on success. FE effect: poll `GET /payments/{id}` / `GET /orders/{id}` to observe `PAID`. |
| `POST /api/v1/images/imagekit/webhooks` (`ImageKitWebhookController`) | public (JWT bypass + `permitAll`); headers + raw `string` body; `400`/`200` empty. Events `file.created/updated/deleted` update server registry. No FE action. |

## 9. Error codes and validation reference

From `GlobalExceptionHandler` + `ApiResponse` + `SecurityExceptionHandler` (JWT codes to-verify at runtime):
| errorCode | HTTP | Trigger |
|---|---|---|
| `BAD_REQUEST` | 400 | `BadRequestException` (empty PATCH, invalid id, order/payment flow violation) |
| `INVALID_ARGUMENT` | 400 | `IllegalArgumentException` (invalid enum string; message lists allowed values) |
| `MALFORMED_JSON` | 400 | `HttpMessageNotReadableException` |
| `MISSING_PARAMETER` | 400 | `MissingServletRequestParameterException` |
| `VALIDATION` (validation shape, `errorCode:null`) | 400 | `MethodArgumentNotValidException` → `errors:[{field,message}]` |
| `UNAUTHORIZED` | 401 | missing/non-Bearer header, insufficient role, `SecurityExceptionHandler`, or `"Refresh token is missing"` |
| `ACCESS_TOKEN_EXPIRED` | 401 | JWT expired → refresh (to-verify) |
| `INVALID_ACCESS_TOKEN` | 401 | JWT corrupt/signature → refresh (to-verify) |
| `INVALID_REFRESH_TOKEN` | 401 | refresh path failure → logout |
| `FORBIDDEN` | 403 | Spring access-denied |
| `NOT_FOUND` | 404 | `NotFoundException` |
| `METHOD_NOT_ALLOWED` | 405 | wrong HTTP method |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | wrong Content-Type |
| `CONFLICT` | 409 | `ConflictException` |
| `DUPLICATE_ENTRY` | 409 | `DataIntegrityViolationException` |
| `INTERNAL_SERVER_ERROR` | 500 | catch-all `Exception` |

## 10. Seed credentials and quick reference

Seeders: `DevUserSeeder` (`--seed dev`): `admin@rascal.id/admin123:[ADMIN]`, `kasir@rascal.id/kasir123:[CASHIER]`, `waiter@rascal.id/waiter123:[WAITER]`, `kitchen@rascal.id/kitchen123:[KITCHEN]`; `FormalUserSeeder`: admin only.

```
POST /api/v1/auths/login (public) | POST /api/v1/auths/refresh (public cookie)
POST /api/v1/auths/logout (cookie) | POST /api/v1/auths/logout-all (bearer)
POST /api/v1/auths/users | GET /api/v1/auths/users?page&size&email=
GET/PUT/PATCH/DELETE /api/v1/auths/users/{id}
POST /api/v1/auths/roles | GET /api/v1/auths/roles?page&size&name=
GET/PUT/PATCH/DELETE /api/v1/auths/roles/{id}
GET /api/v1/auths/authorities?page&size&name= | GET/DELETE /api/v1/auths/authorities/{id}
POST /api/v1/menus | GET /api/v1/menus?page&size&name&categoryId | GET/PUT /api/v1/menus/{id}
PATCH /api/v1/menus/{id}/restore | DELETE /api/v1/menus/{id}
(same 6 under /api/v2/menus, cached DTO)
POST /api/v1/menus/categories | GET /api/v1/menus/categories?page&size&name=
GET/PUT /api/v1/menus/categories/{id} | PATCH /api/v1/menus/categories/{id}/restore | DELETE ...
POST /api/v1/menus/modifiers | GET /api/v1/menus/modifiers?page&size&name=
GET/PUT/DELETE /api/v1/menus/modifiers/{id}
GET /api/v1/images/auth (bearer)
POST /api/v1/orders | GET /api/v1/orders?page&size&keyword&status&paidStatus
GET/PUT/PATCH/DELETE /api/v1/orders/{id}
POST /api/v1/orders/{id}/confirm|prepare|ready|complete|cancel
POST /api/v1/payments | GET /api/v1/payments?page&size&keyword&targetType&targetId&status&paymentProvider
GET /api/v1/payments/{id} | POST /api/v1/payments/{id}/expire|fail|refund
DISABLED: POST /api/v1/payments/{id}/pay, PUT/PATCH/DELETE /api/v1/payments/{id}
POST /api/v1/payments/webhooks/xendit (public s2s) | POST /api/v1/images/imagekit/webhooks (public s2s)
POST /api/v1/dinings | GET /api/v1/dinings?page&size | GET /api/v1/dinings/{id}
POST /api/v1/dinings/{id}/orders | POST /api/v1/dinings/{id}/close
POST /api/v1/tables | GET /api/v1/tables?page&size&keyword | GET/PUT/PATCH/DELETE /api/v1/tables/{id}
```

