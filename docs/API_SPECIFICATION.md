# PocketWise — API_SPECIFICATION.md (สัญญา Frontend ↔ Backend)

> **สำคัญสำหรับ AI Assistant:** เอกสารนี้คือ **สัญญาก่อนพัฒนาจริง (Contract of Record)** ระหว่าง Frontend และ Backend — **เขียน/แก้ endpoint ใด ๆ ต้องอัปเดตที่นี่ก่อน implement เสมอ** (กติกา §10 ของ playbook) — OpenAPI/Swagger ใน dev ต้องตรงกับเอกสารนี้
> **Swagger เป็น Specification หลักของ REST:** เอกสารนี้ (md) ให้หลักการ + conventions + ตัวอย่างที่ OpenAPI ไม่อธิบาย (error codes, มาตรฐาน pagination, SignalR) — ใช้ Swagger UI ที่ `/swagger` หรือ OpenAPI doc ที่ Api สร้างให้อัตโนมัติ (`/openapi/v1.json`) ใน Development เท่านั้น
> อ่านคู่กับ: `/docs/ARCHITECTURE.md` (สถาปัตยกรรม), `/docs/DataDictionary.md` (schema), `/docs/REQUIREMENTS.md` (FR), playbook (Decision Ledger)

---

## 1. Conventions กลาง (ล็อกแล้ว — D1, D8, D11)

| หัวข้อ | กำหนด |
|---|---|
| Base URL (dev) | `http://localhost:5268` (ตาม run.cmd, launchSettings และ `.env.example` — D7) |
| Versioning | **path segment vN**: `/api/v1/...` — endpoint ชุดแรกทั้งหมดเป็น `/api/v1` (D11) |
| Content type | `application/json; charset=utf-8` (ทั้ง request และ response; upload file ยกเว้น multipart) |
| Auth | `Authorization: Bearer <access-token>` ทุก endpoint ยกเว้น `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh` |
| Response envelope | **Wrapped ทุก endpoint** — ดู §2.1 (D8) |
| Status codes | เข้ม REST-style — ดู §3 (D11) |
| ค่าเวลา | ส่ง/รับเป็น ISO 8601 UTC (เช่น `2026-01-31T10:00:00Z`) — client สนใจ timezone เองตอน render |
| ค่าเงิน | ส่งเป็น `decimal` (เช่น `1234.56`) + `currency` (ISO 4217, default `THB`) |
| ชื่อ field | `camelCase` ทั้ง request/response (JSON) — .NET ปรับผ่าน `JsonSerializerOptions` |
| Ids | `Guid`/`long`/`int` ตาม schema ใน DataDictionary (`UserId` เป็น `bigint` / Identity `long`) |
| Pagination | `page`/`pageSize` — ดู §4 (D11) |
| TraceId | ทุก error response ต้องมี `traceId` เชื่อม log ฝั่ง backend |

---

## 2. รูปแบบ Request/Response หลัก

### 2.1 Response Envelope (Wrapped — D8)

**ทุก endpoint** ตอบรูปแบบเดียวกัน:

```json
// สำเร็จ
{ "success": true, "data": { ... } }
// สำเร็จแบบ list (pagination) — data เป็น envelope ย่อยของ list
{ "success": true, "data": { "items": [ ... ], "page": 1, "pageSize": 20, "totalItems": 183, "totalPages": 10 } }
// ล้มเหลว
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "ข้อมูลไม่ถูกต้อง", "traceId": "0HN7GK..." } }
```

- `data` หายไปเมื่อ error; `error` หายไปเมื่อ สำเร็จ (ไม่ส่งทั้งคู่)
- ห้ามฝัง business rule บรรยายใน `message` มากไปกว่าชี้สิ่งที่เกิด — รายละเอียดเชิงเทคนิคอยู่ที่ log (เรียกผ่าน `traceId`)

### 2.2 Error Response (ล็อกแล้ว — D11)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ถูกต้อง",
    "traceId": "0HN7GK...",
    "details": [
      { "field": "amount", "message": "ต้องมากกว่า 0" },
      { "field": "categoryId", "message": "ไม่พบ Category ที่ระบุ" }
    ]
  }
}
```

- `details` **เป็น optional** — มีเฉพาะเมื่อ error เป็นประเภท field-level (เช่น validation)
- ใช้ middleware/exception handler ที่ Api ครอบทุก route ก่อน controller แรกตาม D8 — **ห้าม**ตอบ envelope ต่างแบบใน endpoint ใด ๆ

### 2.3 ตาราง Error Codes มาตรฐาน (ชุด 12 — D11)

| code | HTTP | ใช้เมื่อ |
|---|:-:|---|
| `VALIDATION_ERROR` | 422 | field ใดไม่ผ่าน validation |
| `UNAUTHORIZED` | 401 | ไม่มี/token ไม่ถูกต้อง (ยกเว้น token หมดอายุ) |
| `TOKEN_EXPIRED` | 401 | access token หมดอายุ (client ควรเรียก refresh) |
| `INVALID_REFRESH_TOKEN` | 401 | refresh token ไม่ถูกต้อง/ถูก revoke/พบ reuse |
| `INVALID_CREDENTIALS` | 401 | email/password ผิด (login) |
| `FORBIDDEN` | 403 | ผู้ใช้ทำอะไรที่ไม่ใช่ข้อมูลตัวเอง / สิทธิ์ไม่พอ |
| `NOT_FOUND` | 404 | resource ไม่มี (หรือไม่ใช่ของ user นี้) |
| `CONFLICT` | 409 | ความขัดแย้งเชิง state (เช่น category ถูกใช้อ้างอิงอยู่) |
| `DUPLICATE_TRANSACTION` | 409 | duplicate detection จับได้ (FileHash/reference/จำนวน+เวลา) |
| `TAG_LIMIT_REACHED` | 409 | สร้างแท็กเกิน 20 (กฎ DataDictionary) |
| `RATE_LIMITED` | 429 | เรียกถี่เกิน (login/reset/import) |
| `INTERNAL_ERROR` | 500 | server พลาดที่ไม่คาดคิด — ไม่เปิดเผยรายละเอียดภายใน |

> การเพิ่ม code ใหม่: ต้องมาลงตารางนี้ก่อนเสมอ + อนุมัติจากเจ้าของโปรเจค (ไม่เดาสร้าง string ลอย ๆ)

---

## 3. HTTP Status Policy (เข้ม REST — D11)

| Status | ใช้กับ |
|:-:|---|
| `200 OK` | GET สำเร็จ, PUT/PATCH สำเร็จ (ตอบ data ที่แก้แล้ว) |
| `201 Created` | POST สร้าง resource ใหม่สำเร็จ — ตอบ data ของ item ใหม่ (ไม่บังคับ `Location` header ใน v1) |
| `204 No Content` | DELETE สำเร็จ (soft-delete ทางการเงิน — ตอบว่าง) |
| `422 Unprocessable Content` | validation ไม่ผ่าน (`VALIDATION_ERROR`) |
| `401 Unauthorized` | token ปัญหาทั้งหมด (`UNAUTHORIZED`/`TOKEN_EXPIRED`/`INVALID_REFRESH_TOKEN`/`INVALID_CREDENTIALS`) |
| `403 Forbidden` | สิทธิ์ไม่พอ (`FORBIDDEN`) |
| `404 Not Found` | ไม่พบ resource (`NOT_FOUND`) |
| `409 Conflict` | ขัดแย้ง (`CONFLICT`/`DUPLICATE_TRANSACTION`/`TAG_LIMIT_REACHED`) |
| `429 Too Many Requests` | โดน rate limit (`RATE_LIMITED`) |
| `500 Internal Server Error` | พลาด server (`INTERNAL_ERROR`) |

- **เช็คสำเร็จ/ล้มเหลวที่ `success` ของ envelope เป็นหลักเสมอ** — status code เป็นตัวช่วยจัดขั้นตอนกับ Swagger
- ห้ามส่ง error ออกเป็น `200`

---

## 4. Pagination, Filtering, Sorting (D11)

**ทุก list endpoint รูปแบบเดียวกัน:**

```http
GET /api/v1/transactions?page=1&pageSize=20
```

| Param | กำหนด |
|---|---|
| `page` | เริ่มที่ 1, default `1` |
| `pageSize` | default `20`, **max `100`** (เกินที่ร้องขอ -> clamp ไม่ throw) |
| การตอบ | `data` เป็น `{ items, page, pageSize, totalItems, totalPages }` — เสมอ |
| หน้าเกิน | page เกิน totalPages → `items: []` พร้อม meta ตามจริง (200, ไม่ใช่ error) |

**Filter params (ประกาศต่อ endpoint บน OpenAPI):** ใช้เฉพาะชื่อที่ endpoint นั้นกำหนด — Transactions ใช้ `categoryId`, `tagId`, `bankAccountId`, `type` (`income|expense|transfer`), `fromDate`/`toDate` (UTC ISO), `q` (คำค้นใน description/category) ตาม §5A

**Sorting:** `sortBy=<field>&sortDesc=true` — default ต่อ endpoint ประกาศใน spec ของ endpoint นั้น (transactions: `sortBy=transactionDate&sortDesc=true`); `sortBy` จำกัดเฉพาะ field ที่ endpoint ประกาศ (`transactionDate` หรือ `amount` สำหรับ transactions)

---

## 5. Authentication & Permission (D1, รายละเอียด flow ใน ARCHITECTURE §5)

- **Access Token:** JWT — ส่งใน header `Authorization: Bearer ...` ทุกตัวบนนอกจากแถวไม่ต้อง auth ด้านล่าง
- **Refresh Token:** อยู่ใน request body ตอนเรียก `/auth/refresh` — ฝั่ง backend เก็บ SHA-256 hash ตาราง `UserRefreshTokens` (ไม่เก็บ plain token ใน DB ทุกกรณี)
- **Ownership:** ทุก query/command จำกัดผลลัพธ์โดย UserId ที่มาจาก claims — **ห้าม**รับ UserId เป็น query/body param ใน endpoint ใด ๆ
- **เมื่อ access token หมดอายุ:** ตอบ `401 + TOKEN_EXPIRED` — client เรียก `/auth/refresh` ด้วย refresh token, ได้ token คู่ใหม่, ทำ retry request เดิม (ฝั่ง `api-client.ts` จัดตามนี้)
- **Rotation กัน reuse:** การเรียก refresh ทำ rotation — พบใช้ token เก่าซ้ำ → `401 + INVALID_REFRESH_TOKEN` และระบบ revoke ทุก session ของ user นั้น (ฝั่ง client ตอบสนองด้วยการ logout ไปหน้า login)

### Endpoints ชุดแรก — /Auth (contract แรกที่ implement ใน Phase 3 — ชื่อ route ล็อกจาก D11)

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `POST` | `/api/v1/auth/register` | ไม่ต้อง | สมัครใช้งาน |
| `POST` | `/api/v1/auth/login` | ไม่ต้อง | เข้าสู่ระบบ — ตอบ token pair (ดู §5.1) |
| `POST` | `/api/v1/auth/refresh` | ไม่ต้อง (ใช้ refresh token แทน) | ต่ออายุ — rotation |
| `POST` | `/api/v1/auth/logout` | ต้อง | revoke refresh token ของ session ที่เรียก (ดีไซน์จาก UserRefreshTokens) |
| `GET` | `/api/v1/auth/me` | ต้อง | profile จาก claims (อ่าน DB ถ้าจำเป็น) |
| `POST` | `/api/v1/auth/send-verification-email` | ต้อง | ส่งลิงก์ยืนยันทางอีเมลไปยังอีเมลปัจจุบันของผู้ใช้ (คูลดาวน์ 60 วินาที) |
| `POST` | `/api/v1/auth/verify-email` | ไม่ต้อง | ยืนยันอีเมลด้วยโทเค็นและ userId — อัปเดต `IsEmailVerified = true` |
| `POST` | `/api/v1/auth/forgot-password` | ไม่ต้อง | ขอลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล (Anti-Email Enumeration + คูลดาวน์ 60 วินาที) |
| `POST` | `/api/v1/auth/reset-password` | ไม่ต้อง | ตั้งรหัสผ่านใหม่ด้วยโทเค็นและ userId พร้อมเพิกถอน (revoke) Refresh Token ทุก session |
| `POST` | `/api/v1/auth/purge-expired-tokens` | Admin | ล้าง Refresh Token ที่หมดอายุหรือถูกเพิกถอน (Revoked) ออกจากฐานข้อมูล |

#### 5.1 Request/Response DTO

**`RegisterRequest`**
```json
{
  "email": "user@example.com",
  "password": "••••••••",
  "displayName": "Display Name"
}
```

**`LoginRequest`**
```json
{
  "email": "user@example.com",
  "password": "••••••••"
}
```

**`RefreshRequest`**
```json
{
  "refreshToken": "<opaque-token>"
}
```

**`AuthResponse`**
```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-01-31T10:15:00Z",
  "refreshToken": "<opaque-token>",
  "refreshTokenExpiresAt": "2026-02-07T10:00:00Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "Display Name",
    "isEmailVerified": false
  }
}
```

**`UserProfileResponse`**
```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "Display Name",
  "isEmailVerified": false
}
```

**`ForgotPasswordRequest`**
```json
{
  "email": "user@example.com"
}
```

**`ForgotPasswordResponse`**
```json
{
  "sent": true,
  "cooldownSeconds": 60,
  "message": "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่ได้ถูกส่งไปยังอีเมลของคุณเรียบร้อยแล้ว"
}
```

**`ResetPasswordRequest`**
```json
{
  "userId": 1,
  "token": "CfDJ8N...",
  "newPassword": "NewStrongPassword123!",
  "confirmPassword": "NewStrongPassword123!"
}
```

**`ResetPasswordResponse`**
```json
{
  "success": true,
  "message": "ตั้งรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"
}
```

#### 5.2 ตัวอย่าง contract (login)

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "••••••••" }
```

```json
// 200 OK
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "accessTokenExpiresAt": "2026-01-31T10:15:00Z",
    "refreshToken": "<opaque-token>",
    "refreshTokenExpiresAt": "2026-02-07T10:00:00Z",
    "user": { "id": 1, "email": "user@example.com", "displayName": "...", "isEmailVerified": false }
  }
}
```

```json
// 401 — รหัสไม่ถูก
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "traceId": "0HN7GK..." } }
```

- ✅ **ล็อกแล้ว:** `ApplicationUser : IdentityUser<long>` (ตารางยังชื่อ `Users`), access token 60 นาที, refresh token 30 วัน
- **FE types:** สร้าง `src/types/api.types.ts` จาก envelope + `src/types/auth.types.ts` จาก section นี้ **หลัง response จริงถูก implement** (ตรงตามกฎ Sync with Frontend)

#### 5.3 วิธีขยาย endpoint อื่น (ตาม playbook §10) ทุกครั้ง:

1. เพิ่มแถวตาราง endpoint + request/response DTO + code ที่อาจตอบ ลงเอกสารนี้ก่อน (ตาม section 5.1 เป็น template)
2. Backend: implement + ตรวจ OpenAPI ว่าตรง
3. Frontend: เพิ่ม types/schemas ตามข้อ 1
4. ผ่าน Gate ตาม DoD ของ playbook

---

## 5A. Phase 4 — Core Transactions (contract ล็อกแล้ว)

> **สถานะ:** Phase 4 core implement และทดสอบ end-to-end แล้ว; FR2.2 ยังรอ UI เลือกบัตรเมื่อ CreditCards CRUD เข้า Phase 5 ตาม D20
> ใช้ envelope `{ success, data }` / error codes จาก §2 กับ §3; pagination ตาม §4; auth ตาม §5

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/transactions` | ต้อง | รายการ transactions (list + filter + sort + pagination) |
| `GET` | `/api/v1/transactions/{id}` | ต้อง | รายการเดี่ยว |
| `POST` | `/api/v1/transactions` | ต้อง | เพิ่มรายการ (manual) |
| `PUT` | `/api/v1/transactions/{id}` | ต้อง | แก้ไขรายการ |
| `DELETE` | `/api/v1/transactions/{id}` | ต้อง | soft delete รายการ |
| `GET` | `/api/v1/categories` | ต้อง | หมวดหมู่ทั้งหมด (user + system) |
| `GET` | `/api/v1/categories/{id}` | ต้อง | หมวดหมู่เดี่ยว |
| `POST` | `/api/v1/categories` | ต้อง | สร้างหมวดหมู่ |
| `PUT` | `/api/v1/categories/{id}` | ต้อง | แก้ไขหมวดหมู่ |
| `PUT` | `/api/v1/categories/reorder` | ต้อง | เรียงลำดับหมวดหมู่ |
| `DELETE` | `/api/v1/categories/{id}` | ต้อง | ลบหมวดหมู่ (ถ้าไม่มี transaction ใช้) |
| `GET` | `/api/v1/tags` | ต้อง | แท็กทั้งหมด |
| `GET` | `/api/v1/tags/{id}` | ต้อง | แท็กเดี่ยว |
| `POST` | `/api/v1/tags` | ต้อง | สร้างแท็ก (จำกัด 20/ผู้ใช้ → `TAG_LIMIT_REACHED`) |
| `PUT` | `/api/v1/tags/{id}` | ต้อง | แก้ไขแท็ก |
| `PUT` | `/api/v1/tags/reorder` | ต้อง | เรียงลำดับแท็ก |
| `DELETE` | `/api/v1/tags/{id}` | ต้อง | ลบแท็ก |
| `GET` | `/api/v1/bank-accounts` | ต้อง | บัญชีทั้งหมด |
| `GET` | `/api/v1/bank-accounts/{id}` | ต้อง | บัญชีเดี่ยว |
| `POST` | `/api/v1/bank-accounts` | ต้อง | สร้างบัญชี |
| `PUT` | `/api/v1/bank-accounts/{id}` | ต้อง | แก้ไขบัญชี |
| `DELETE` | `/api/v1/bank-accounts/{id}` | ต้อง | soft delete บัญชี (ถ้าไม่มี transaction ใช้) |
| `GET` | `/api/v1/transfers` | ต้อง | กลุ่มโอนทั้งหมด |
| `GET` | `/api/v1/transfers/{id}` | ต้อง | กลุ่มโอนเดี่ยว |
| `POST` | `/api/v1/transfers` | ต้อง | สร้างการโอน → auto สร้าง 2 transactions (โอนออก/โอนเข้า) |

### Filter params ของ `GET /api/v1/transactions`

| Param | กำหนด |
|---|---|
| `categoryId` | กรองตามหมวดหมู่ |
| `tagId` | กรองตามแท็ก |
| `bankAccountId` | กรองตามบัญชีธนาคาร |
| `creditCardId` | กรองตามบัตรเครดิต |
| `sourceType` | กรองตามที่มา: `manual` / `slip` / `cardStatement` / `recurring` |
| `type` | `income` / `expense` / `transfer` |
| `fromDate` / `toDate` | ช่วงเวลา (UTC ISO) |
| `q` | ค้นใน description / ชื่อหมวดหมู่ |
| `page` / `pageSize` | pagination ตาม §4 (default `1` / `20`, max `100`) |
| `sortBy` / `sortDesc` | `transactionDate` (default) หรือ `amount`; `sortDesc` default `true` |

### Enums (ส่ง/รับเป็น string — `camelCase`)

- `TransactionType`: `income` / `expense` / `transfer`
- `CategoryType`: `income` / `expense` / `both`
- `AccountType`: `cash` / `bank` / `wallet` / `other`
- `SourceType`: `manual` / `slip` / `cardStatement` / `recurring`
- `TransactionStatus`: `draft` / `confirmed` / `void`
- `TransferGroupStatus`: `pending` / `matched` / `confirmed` / `void`

### Business rules ที่บังคับใช้

- Tag จำกัด 20 ต่อผู้ใช้ (`TAG_LIMIT_REACHED` → 409)
- ลบหมวดหมู่/บัญชีที่มี transaction ใช้อยู่ → `CONFLICT` (409)
- หมวดหมู่ระบบ (`IsSystem=true`) แก้ไข/ลบไม่ได้ → `FORBIDDEN` (403)
- การโอน (transfer) สร้าง 2 transactions อัตโนมัติผูก `transferGroupId` เดียวกัน

---

## 5B. Phase 5 — Budgets (contract)

> **สถานะ:** Backend budgets เริ่ม implement (D26–D30 ล็อกแล้ว) — ใช้ envelope/error/status/pagination conventions จาก §1–§4
> เอนทิตี + enums มาจาก Phase 2; `BudgetTrackingResponse` เพิ่มใน phase นี้เพื่อ FR5.2.1

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/budgets` | ต้อง | งบประมาณทั้งหมดของผู้ใช้ |
| `GET` | `/api/v1/budgets/tracking` | ต้อง | ติดตามยอดใช้เทียบงบ (FR5.2.1) — เฉพาะงบที่ active และอยู่ในรอบปัจจุบัน |
| `GET` | `/api/v1/budgets/{id}` | ต้อง | งบประมาณเดี่ยว |
| `POST` | `/api/v1/budgets` | ต้อง | สร้างงบ |
| `PUT` | `/api/v1/budgets/{id}` | ต้อง | แก้ไขงบ |
| `DELETE` | `/api/v1/budgets/{id}` | ต้อง | soft delete งบ |

### Enums (ส่ง/รับเป็น string — `camelCase`)

- `BudgetScopeType`: `total` / `category` / `tag`
- `BudgetPeriodType`: `weekly` / `monthly` / `quarterly` / `yearly` / `custom`

### Request/Response DTO

**`CreateBudgetRequest`**
```json
{
  "budgetName": "งบอาหารต่อเดือน",
  "scopeType": "category",
  "categoryId": 12,
  "tagId": null,
  "amountLimit": 5000.00,
  "periodType": "monthly",
  "startDate": "2026-10-01",
  "endDate": null,
  "alertThresholdPercent": 80
}
```

**`UpdateBudgetRequest`** — เหมือน create + field `isActive` (boolean)

**`BudgetResponse`**
```json
{
  "budgetId": 30,
  "budgetName": "งบอาหารต่อเดือน",
  "currencyCode": "THB",
  "scopeType": "category",
  "categoryId": 12,
  "categoryName": "อาหาร",
  "tagId": null,
  "tagName": null,
  "amountLimit": 5000.00,
  "periodType": "monthly",
  "startDate": "2026-10-01",
  "endDate": null,
  "alertThresholdPercent": 80,
  "isActive": true,
  "createdAt": "2026-10-16T10:00:00Z"
}
```

**`BudgetTrackingResponse`** — extends `BudgetResponse` + `spentAmount`, `remainingAmount`, `percentageUsed`, `isOverLimit`

### Business rules ที่บังคับใช้

- `scopeType=category` ต้องมี `categoryId`; `scopeType=tag` ต้องมี `tagId` (validation → `VALIDATION_ERROR`)
- `categoryId`/`tagId` ต้องเป็นของ user นั้น (category อาจเป็น system category) — ไม่มี → `NOT_FOUND`
- `currencyCode` ของงบมาจาก `UserSettings.CurrencyCode` (ถ้ายังไม่มี settings ใช้ค่าเริ่มต้น `THB`); ยอดใช้คิดเฉพาะ transaction ในสกุลเงินเดียวกัน
- `amountLimit > 0`; `alertThresholdPercent` 1..100 (default 80)
- ติดตามยอดใช้ (tracking) คำนวณจาก transaction `type=expense` + `status=confirmed` ภายในรอบงบปัจจุบัน
- soft delete ตาม D5 (ไม่ลบถาวร)

---

## 5C. Phase 5 — Credit Cards (contract)

> **สถานะ:** Backend credit cards เริ่ม implement (FR2.2 เต็ม) — ใช้ envelope/error/status conventions จาก §1–§4
> entity `CreditCard` มาจาก Phase 2; transaction สร้าง/แก้ไขรับ `creditCardId` (nullable) ตั้งแต่ Phase 4 (D20) — statement import เป็น Phase 7

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/credit-cards` | ต้อง | บัตรเครดิตทั้งหมดของผู้ใช้ |
| `GET` | `/api/v1/credit-cards/{id}` | ต้อง | บัตรเดี่ยว |
| `POST` | `/api/v1/credit-cards` | ต้อง | ลงทะเบียนบัตร |
| `PUT` | `/api/v1/credit-cards/{id}` | ต้อง | แก้ไขบัตร |
| `DELETE` | `/api/v1/credit-cards/{id}` | ต้อง | soft delete บัตร |

### Request/Response DTO

**`CreateCreditCardRequest`**
```json
{
  "bankName": "ธนาคารกสิกรไทย",
  "cardName": "บัตรเครดิตหลัก",
  "cardNumberMasked": "**** **** **** 1234",
  "billingDay": 25,
  "paymentDueDay": 10,
  "creditLimit": 50000.00
}
```

**`UpdateCreditCardRequest`** — เหมือน create + field `isActive` (boolean)

**`CreditCardResponse`**
```json
{
  "creditCardId": 3,
  "bankName": "ธนาคารกสิกรไทย",
  "cardName": "บัตรเครดิตหลัก",
  "cardNumberMasked": "**** **** **** 1234",
  "billingDay": 25,
  "paymentDueDay": 10,
  "creditLimit": 50000.00,
  "isActive": true,
  "createdAt": "2026-10-16T10:00:00Z"
}
```

### Business rules ที่บังคับใช้

- `bankName`/`cardName` บังคับ (≤100 ตัวอักษร)
- `billingDay`/`paymentDueDay` 1..31 (optional)
- `creditLimit >= 0` (optional)
- soft delete ตาม D5 (ไม่ลบถาวร)
- transaction `creditCardId` ชี้บัตรของผู้ใช้ (backend ไม่รับ userId จาก client ตาม §5)

---

## 5D. Phase 5 — Recurring Transactions (contract)

> **สถานะ:** Backend recurring transactions เริ่ม implement (FR2.7, D26) — ใช้ envelope/error/status conventions จาก §1–§4
> entity `RecurringTransaction` มาจาก Phase 2; กลไกสร้างรายการ = **BackgroundService (built-in, ไม่ติดตั้ง package)** ตาม D26 — วนตรวจทุก `RecurringJob:IntervalMinutes` (default 60) และสร้าง `Transaction` (sourceType=recurring) เมื่อถึงกำหนด

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/recurring-transactions` | ต้อง | รายการประจำทั้งหมดของผู้ใช้ |
| `GET` | `/api/v1/recurring-transactions/{id}` | ต้อง | รายการเดี่ยว |
| `POST` | `/api/v1/recurring-transactions` | ต้อง | ตั้งรายการประจำ |
| `PUT` | `/api/v1/recurring-transactions/{id}` | ต้อง | แก้ไขรายการประจำ |
| `DELETE` | `/api/v1/recurring-transactions/{id}` | ต้อง | soft delete รายการประจำ |

### Enums (ส่ง/รับเป็น string — `camelCase`)

- `TransactionType` (ของ recurring): `income` / `expense` (ไม่รวม transfer — ดู business rules)
- `RecurringFrequency`: `daily` / `weekly` / `monthly` / `quarterly` / `yearly`

### Request/Response DTO

**`CreateRecurringTransactionRequest`**
```json
{
  "transactionType": "expense",
  "amount": 350.00,
  "description": "ค่าสมาชิก",
  "categoryId": 12,
  "frequency": "monthly",
  "intervalValue": 1,
  "startDate": "2026-10-01",
  "endDate": null
}
```

**`UpdateRecurringTransactionRequest`** — เหมือน create + field `isActive` (boolean)

**`RecurringTransactionResponse`**
```json
{
  "recurringTransactionId": 15,
  "transactionType": "expense",
  "amount": 350.00,
  "description": "ค่าสมาชิก",
  "categoryId": 12,
  "categoryName": "ค่าสมาชิก",
  "frequency": "monthly",
  "intervalValue": 1,
  "startDate": "2026-10-01",
  "endDate": null,
  "nextRunAt": "2026-11-01T00:00:00Z",
  "isActive": true,
  "createdAt": "2026-10-16T10:00:00Z"
}
```

### Business rules ที่บังคับใช้

- `amount > 0`; `intervalValue > 0`; `endDate >= startDate` (ถ้ามี)
- `categoryId` (ถ้าระบุ) ต้องเป็นของ user นั้น (หรือ system) — ไม่มี → `NOT_FOUND`
- `transactionType` จำกัดที่ `income`/`expense` (ไม่รองรับ transfer สำหรับรายการประจำ)
- `nextRunAt` คำนวณอัตโนมัติจาก `startDate` + `frequency` + `intervalValue`
- BackgroundService สร้าง `Transaction` จริงเมื่อ `nextRunAt <= now` โดย `sourceType=recurring` + `recurringTransactionId` ผูกกลับ; จากนั้นเลื่อน `nextRunAt` ไปรอบถัดไป
- หยุดสร้างเมื่อ `endDate` ถึง (ถ้ามี) หรือรายการถูก soft delete / `isActive=false`
- soft delete ตาม D5 (ไม่ลบถาวร)

---

## 5E. Phase 5 — Merchants & Category Rules (contract)

> **สถานะ:** Backend จัดหมวดอัตโนมัติเริ่ม implement (FR3.1.1 + FR3.1.3, D31–D33) — ใช้ envelope/error/status conventions จาก §1–§4
> entity `Merchant`/`CategoryRule` มาจาก Phase 2 — Merchants เป็นตาราง global (ไม่มี userId) ไม่ seed ข้อมูล (D32); CategoryRules เป็น per-user (userId nullable = กฎกลาง)

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/merchants` | ต้อง | ร้านค้าทั้งหมด |
| `GET` | `/api/v1/merchants/{id}` | ต้อง | ร้านค้าเดี่ยว |
| `POST` | `/api/v1/merchants` | ต้อง | เพิ่มร้านค้า (D32 — เพิ่มเอง ไม่ seed) |
| `PUT` | `/api/v1/merchants/{id}` | ต้อง | แก้ไขร้านค้า |
| `DELETE` | `/api/v1/merchants/{id}` | ต้อง | ลบร้านค้า (hard delete) |
| `GET` | `/api/v1/category-rules` | ต้อง | กฎจัดหมวดของผู้ใช้ + กฎกลาง |
| `GET` | `/api/v1/category-rules/suggest?description=...` | ต้อง | แนะนำหมวดจาก description (D33) |
| `GET` | `/api/v1/category-rules/{id}` | ต้อง | กฎเดี่ยว |
| `POST` | `/api/v1/category-rules` | ต้อง | สร้างกฎเอง (D31) |
| `PUT` | `/api/v1/category-rules/{id}` | ต้อง | แก้ไขกฎ |
| `DELETE` | `/api/v1/category-rules/{id}` | ต้อง | ลบกฎ (hard delete) |

### Enums (ส่ง/รับเป็น string — `camelCase`)

- `CategoryMatchType`: `merchantName` / `description` / `bankReference`

### Request/Response DTO

**`CreateMerchantRequest`**
```json
{ "merchantName": "ร้านค้า ABC", "defaultCategoryId": 12, "bankOrProvider": null }
```

**`MerchantResponse`**
```json
{
  "merchantId": 55, "merchantName": "ร้านค้า ABC",
  "defaultCategoryId": 12, "defaultCategoryName": "อาหาร",
  "bankOrProvider": null, "isVerified": false, "createdAt": "2026-10-16T10:00:00Z"
}
```

**`CreateCategoryRuleRequest`**
```json
{ "ruleName": "ร้านอาหาร", "matchType": "description", "matchPattern": "ร้านอาหาร ABC", "categoryId": 12, "priority": 100 }
```

**`CategoryRuleResponse`**
```json
{
  "categoryRuleId": 2, "ruleName": "ร้านอาหาร",
  "matchType": "description", "matchPattern": "ร้านอาหาร ABC",
  "categoryId": 12, "categoryName": "อาหาร",
  "priority": 100, "isActive": true, "isGlobal": false,
  "createdAt": "2026-10-16T10:00:00Z", "updatedAt": null
}
```

**`CategorySuggestionResponse`**
```json
{ "categoryId": 12, "categoryName": "อาหาร", "source": "category-rule" }
```
`source` = `category-rule` (จาก CategoryRules) หรือ `merchant` (จากร้านค้า)

### Business rules ที่บังคับใช้

- **จัดหมวดอัตโนมัติ (D33):** ตอน `POST /transactions` ถ้า `categoryId` ว่างและมี `description` → auto-apply หมวดที่แนะนำ (CategoryRules ตาม priority → Merchants) ต่อจากนั้น
- **Auto-learn (D31):** ตอน `POST`/`PUT /transactions` ที่ผู้ใช้**เลือกหมวดเอง** + มี `description` → ระบบบันทึกกฎ `Description→Category` (priority 100) ให้อัตโนมัติ (ไม่สร้างซ้ำ)
- `GET /category-rules/suggest?description=` คืน `null` ใน `data` เมื่อไม่เจอหมวดที่แนะนำ
- CategoryRules ของผู้ใช้ ใช้ได้เฉพาะของตัวเอง; กฎกลาง (`userId=null`) ใช้ได้ทุกคน
- `merchantName` และ `description` rules จับข้อความ description ได้; `bankReference` rules ยังไม่ถูกใช้กับ transaction manual เพราะ transaction contract ยังไม่มี bank reference (นำเข้าใน Phase 7)
- `Merchants` เป็นข้อมูล global จึงกำหนด `defaultCategoryId` ได้เฉพาะ system category เพื่อไม่ผูกข้อมูลร่วมกับหมวดหมู่ส่วนตัวของผู้ใช้
- Merchants hard delete (ตารางไม่ใช่กลุ่มการเงินตาม D5)

---

## 5F. Phase 5 — Reports (contract)

> Reports ใช้ข้อมูล transaction ของผู้ใช้ที่ล็อกอินเท่านั้น; date-time parameters เป็น UTC ISO 8601 และ API ใช้ขอบเขตแบบ inclusive

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/reports/summary` | ต้อง | ยอดรวมและ breakdown สำหรับ dashboard |
| `GET` | `/api/v1/reports/trends` | ต้อง | สรุปยอดตามช่วงเวลา (สัปดาห์/เดือน/ไตรมาส/ปี) |
| `GET` | `/api/v1/reports/export` | ต้อง | ส่งออกข้อมูลรายงานการเงินเป็นไฟล์ (CSV พร้อม UTF-8 BOM หรือ JSON) |

### Query parameters

| Param | กำหนด |
|---|---|
| `fromDate` / `toDate` | จำเป็นทั้งคู่; UTC ISO 8601; `fromDate` ต้องไม่เกิน `toDate` |
| `categoryId` | optional; จำกัดผลลัพธ์เป็นหมวดที่ระบุ |
| `tagId` | optional; จำกัดผลลัพธ์เป็นรายการที่ติดแท็กนั้น |
| `period` | ใช้กับ trends เท่านั้น: `weekly` / `monthly` / `quarterly` / `yearly` |
| `format` | ใช้กับ export เท่านั้น: `csv` (default) หรือ `json` (UTF-8 BOM สำหรับ CSV เพื่อเปิดใน Excel ภาษาไทยได้ทันที) |
| `type` | ใช้กับ export เท่านั้น: `full` (default: สรุปภาพรวม + สัดส่วน + รายการ) หรือ `transactions` (เฉพาะรายการธุรกรรม) |

### Response

**`ReportSummaryResponse`** มีช่วงเวลาที่ใช้และ `currencies` โดยแต่ละ currency แยกยอดเพื่อไม่รวมสกุลเงินต่างกันโดยไม่มีอัตราแลกเปลี่ยน:

```json
{
  "fromDate": "2026-09-30T17:00:00Z",
  "toDate": "2026-10-31T16:59:59.999Z",
  "currencies": [{
    "currencyCode": "THB",
    "totalIncome": 45000.00,
    "totalExpense": 12500.00,
    "netAmount": 32500.00,
    "totalSlipExpense": 3500.00,
    "totalCreditCardExpense": 2000.00,
    "categoryBreakdown": [{
      "categoryId": 12, "categoryName": "อาหาร",
      "amount": 5000.00, "percentage": 40.00, "transactionCount": 15
    }],
    "sourceBreakdown": [{
      "sourceType": "manual", "amount": 7000.00, "percentage": 56.00, "transactionCount": 10
    }, {
      "sourceType": "slip", "amount": 3500.00, "percentage": 28.00, "transactionCount": 8
    }, {
      "sourceType": "cardStatement", "amount": 2000.00, "percentage": 16.00, "transactionCount": 4
    }],
    "bankAccountBreakdown": [{
      "bankAccountId": 4, "accountName": "บัญชีหลัก", "bankName": "ธนาคาร",
      "amount": 3000.00, "percentage": 24.00, "transactionCount": 6
    }],
    "creditCardBreakdown": [{
      "creditCardId": 3, "cardName": "บัตรหลัก", "bankName": "ธนาคาร",
      "amount": 2000.00, "percentage": 16.00, "transactionCount": 4
    }]
  }]
}
```

**`ReportTrendsResponse`** คืน `period`, `fromDate`, `toDate` และ `series[]`; แต่ละจุดมี `periodStart`, `periodEnd`, `currencyCode`, `income`, `expense`, `netAmount`. จุดที่ไม่มียอดใน currency ที่พบในช่วงนั้นคืนค่าเป็นศูนย์

### Business rules

- รวมเฉพาะ transaction สถานะ `confirmed` ประเภท `income`/`expense`; ไม่นับ transfer, draft หรือ void
- category/source/bank-account/credit-card breakdown เป็นยอดรายจ่าย; รายการไม่มีหมวด/บัญชี/บัตรรวมในกลุ่ม "ไม่ระบุ"
- `percentage` คิดจากยอดรายจ่ายของ currency เดียวกัน; ถ้ายอดรวมเป็นศูนย์ให้เป็น `0`
- category/tag filters ใช้ร่วมกับทุก breakdown และ trend
- จัดกลุ่มวันตาม `Asia/Bangkok`; weekly period เริ่มวันอาทิตย์และสิ้นสุดวันเสาร์ (D34)
- ไม่แปลงสกุลเงิน; แต่ละ currency ต้องแสดง/เปรียบเทียบแยกกัน
- Frontend ตั้งช่วงเริ่มต้นตั้งแต่ 1 มกราคมถึง 31 ธันวาคมของปีปัจจุบัน; ส่งขอบเขตวันในเวลาไทยแปลงเป็น UTC ก่อนเรียก API (D36)

---

## 5G. Phase 5.5 — Settings & Profile (contract)

> ข้อมูล settings/profile เป็นของผู้ใช้ที่ยืนยันตัวตน; `birthDate` ใช้วันที่ ค.ศ. แบบ `YYYY-MM-DD`; settings ที่ยังไม่มีจะถูกสร้างด้วยค่าเริ่มต้นจาก DataDictionary

### Endpoints

| Method | Path | Auth | Description |
|---|---|:-:|---|
| `GET` | `/api/v1/settings` | required | อ่านค่าตั้งค่าส่วนบุคคล |
| `PUT` | `/api/v1/settings` | required | บันทึกธีม สกุลเงิน ภาษา และการตั้งค่า budget email |
| `PUT` | `/api/v1/auth/me` | required | แก้ชื่อที่แสดง เบอร์โทร วันเกิด และอีเมลของผู้ใช้ปัจจุบัน |
| `POST` | `/api/v1/users/me/data-reset` | required | ล้างข้อมูลการเงินและ revoke refresh tokens ทุก session |

### `UserSettingsResponse`

```json
{
  "theme": "light",
  "currencyCode": "THB",
  "locale": "th-TH",
  "emailBudgetAlertsEnabled": true,
  "updatedAt": "2026-10-20T00:00:00Z"
}
```

`PUT /settings` ใช้ fields เดียวกัน ยกเว้น `updatedAt` ซึ่ง backend กำหนดเอง; `theme` รับ `light`/`dark`, `currencyCode` เป็นรหัส ISO 4217 ตัวพิมพ์ใหญ่ 3 ตัว และ `locale` เป็น BCP 47 locale (2–10 ตัวอักษร/ขีด). `emailBudgetAlertsEnabled` เป็น preference เท่านั้น; email delivery ยังถูกเลื่อนไว้ตาม D28.

### `UserProfileResponse` และ `PUT /auth/me`

```json
{
  "id": 1001,
  "email": "user@example.com",
  "displayName": "ผู้ใช้",
  "phoneNumber": null,
  "birthDate": null,
  "isEmailVerified": false
}
```

Request fields: `email`, `displayName`, `phoneNumber` (nullable), `birthDate` (nullable `YYYY-MM-DD`). Email ใหม่ต้องไม่ซ้ำ; เมื่อเปลี่ยนอีเมล backend จะตั้ง `isEmailVerified=false`. การส่ง verification mail และการยืนยันอีเมลใหม่อยู่นอก Phase 5.5.

### Financial data reset

`POST /users/me/data-reset` รับ body ว่าง และ soft-delete เฉพาะข้อมูลของผู้ใช้ใน 9 ตารางที่กำหนด D5: Transactions, BankAccounts, CreditCards, Budgets, RecurringTransactions, InstallmentPlans, TransferGroups, CreditCardStatements, CreditCardStatementItems. User identity, UserSettings, หมวดหมู่/แท็ก/กฎ, Notifications, import history และ AuditLogs จะคงอยู่. การล้างทำงานเป็น transaction เดียว, คืน `{ "resetAt": "2026-10-20T00:00:00Z" }`, และ revoke refresh tokens ทุก session; access tokens ที่ออกไปแล้วจะหมดอายุตามปกติ (ไม่เกิน 60 นาที).

### Email verification (FR6.3.7 — Phase 5.5/D42) ✅

- `POST /api/v1/auth/send-verification-email` (Auth: Required): ส่งลิงก์ยืนยันทางอีเมลไปยังอีเมลปัจจุบันของผู้ใช้ คืน `{ "sent": true, "email": "...", "cooldownSeconds": 60, "message": "..." }`
- `POST /api/v1/auth/verify-email` (Auth: Anonymous): รับ `{ "userId": 123, "token": "..." }` และตรวจสอบโทเค็นผ่าน ASP.NET Core Identity แล้วอัปเดต `Users.IsEmailVerified = true` และ `EmailConfirmed = true` ในฐานข้อมูล คืน `{ "verified": true, "email": "...", "message": "..." }`

### Password reset via Email (FR6.3.8 — Phase 5.5/D43) ✅

- `POST /api/v1/auth/forgot-password` (Auth: Anonymous): รับ `{ "email": "user@example.com" }` ส่งอีเมลพร้อมลิงก์ตั้งรหัสผ่านใหม่ (Anti-Email Enumeration ป้องกันการเดาอีเมลในระบบ และคูลดาวน์ 60 วินาที) คืน `{ "sent": true, "cooldownSeconds": 60, "message": "..." }`
- `POST /api/v1/auth/reset-password` (Auth: Anonymous): รับ `{ "userId": 123, "token": "...", "newPassword": "...", "confirmPassword": "..." }` ตั้งรหัสผ่านใหม่ผ่าน ASP.NET Core Identity และเพิกถอน (Revoke) Refresh Tokens ของผู้ใช้ทุก session เพื่อบังคับล็อกอินใหม่ทุกอุปกรณ์ คืน `{ "success": true, "message": "..." }`

---

## 5H. Phase 6 — Notifications (REST API contract)

> **สถานะ:** ล็อกแล้ว (D37) — จัดการประวัติการแจ้งเตือนของผู้ใช้ และเชื่อมต่อกับ SignalR Hub

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `GET` | `/api/v1/notifications` | ต้อง | รายการแจ้งเตือนของผู้ใช้ (รองรับ pagination + unreadOnly) |
| `GET` | `/api/v1/notifications/unread-count` | ต้อง | จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน |
| `PUT` | `/api/v1/notifications/{id}/read` | ต้อง | มาร์กการแจ้งเตือนรายการเดียวว่าอ่านแล้ว |
| `PUT` | `/api/v1/notifications/read-all` | ต้อง | มาร์กการแจ้งเตือนทั้งหมดของผู้ใช้ว่าอ่านแล้ว |

### Query Parameters สำหรับ `GET /api/v1/notifications`

| Parameter | Type | Default | คำอธิบาย |
|---|---|---|---|
| `page` | integer | 1 | ลำดับหน้า (เริ่มจาก 1) |
| `pageSize` | integer | 20 | จำนวนรายการต่อหน้า (1–100) |
| `unreadOnly` | boolean | false | ถ้า true จะคืนเฉพาะรายการที่ยังไม่ได้อ่าน |

### Response DTOs

**`NotificationResponse`**
```json
{
  "notificationId": 101,
  "notificationType": "BUDGET_WARNING_20261001",
  "title": "งบ อาหาร ใกล้ถึงขีดจำกัด",
  "message": "ใช้ไปแล้ว 4,200.00 THB จาก 5,000.00 THB (84.00%)",
  "channel": "inApp",
  "status": "sent",
  "relatedEntityType": "Budget",
  "relatedEntityId": 12,
  "sentAt": "2026-10-20T09:00:00Z",
  "readAt": null,
  "createdAt": "2026-10-20T09:00:00Z"
}
```

**`NotificationUnreadCountResponse`**
```json
{
  "unreadCount": 3
}
```

**`BatchReadNotificationsResponse`**
```json
{
  "count": 3
}
```

---

## 5I. Phase 7 — Imports & Statements (contract)

> **สถานะ:** ล็อกแล้ว (D38) — จัดการนำเข้าสลิปธนาคาร (FR1.1–FR1.3, FR4.8), ใบแจ้งยอดบัตรเครดิต (S2) ทั้งไฟล์ CSV และ JSON, และประวัติ ImportJobs

### Endpoints

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `POST` | `/api/v1/imports/slips` | ต้อง | อัปโหลดสลิปธนาคาร (multipart/form-data) ตรวจไฟล์ซ้ำ (SHA-256) และดึงข้อมูลเบื้องต้น |
| `GET` | `/api/v1/imports/slips/{id}` | ต้อง | ดูรายละเอียดสลิปและข้อมูลที่ตรวจจับได้เพื่อรอการตรวจสอบ (Review) |
| `GET` | `/api/v1/imports/slips/{id}/image` | ต้อง | ดาวน์โหลด/แสดงรูปภาพสลิป |
| `POST` | `/api/v1/imports/slips/{id}/confirm` | ต้อง | ยืนยันการตรวจสอบสลิปและบันทึกเป็น Transaction จริง (พร้อม auto-categorize) |
| `POST` | `/api/v1/imports/slips/{id}/reject` | ต้อง | ปฏิเสธสลิป (ไม่สร้าง Transaction) |
| `POST` | `/api/v1/imports/credit-card-statements` | ต้อง | อัปโหลดใบแจ้งยอดบัตรเครดิต (CSV/JSON multipart/form-data) |
| `GET` | `/api/v1/credit-cards/{cardId}/statements` | ต้อง | รายการใบแจ้งยอดของบัตรเครดิตที่ระบุ |
| `GET` | `/api/v1/credit-cards/statements/{statementId}` | ต้อง | รายละเอียดใบแจ้งยอดและรายการย่อย (Statement Items) |
| `POST` | `/api/v1/credit-cards/statements/{statementId}/confirm-items` | ต้อง | ยืนยันรายการในใบแจ้งยอดเพื่อสร้าง Transactions ในระบบ |
| `GET` | `/api/v1/imports/jobs` | ต้อง | รายการประวัติงานนำเข้าทั้งหมด (รองรับ pagination + type filter) |
| `GET` | `/api/v1/imports/jobs/{id}` | ต้อง | รายละเอียดสถานะงานนำเข้า |

### Request/Response DTOs

**`SlipImportResponse`**
```json
{
  "slipImportFileId": 41,
  "importJobId": 900,
  "originalFileName": "slip_kbank.jpg",
  "fileSizeBytes": 245000,
  "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "bankCode": "KBANK",
  "payerName": "สมชาย",
  "payeeName": "ร้านค้า ABC",
  "detectedAmount": 850.00,
  "detectedAt": "2026-10-15T18:30:00Z",
  "transactionReference": "TXN123456",
  "reviewStatus": "pending",
  "isDuplicate": false,
  "suggestedCategoryId": 12,
  "suggestedCategoryName": "อาหาร",
  "createdAt": "2026-10-15T18:31:00Z"
}
```

**`ConfirmSlipRequest`**
```json
{
  "amount": 850.00,
  "transactionDate": "2026-10-15T18:30:00Z",
  "description": "ร้านค้า ABC",
  "categoryId": 12,
  "bankAccountId": 4,
  "payeeName": "ร้านค้า ABC",
  "payerName": "สมชาย",
  "transactionReference": "TXN123456"
}
```

**`CreditCardStatementImportResponse`**
```json
{
  "statementId": 70,
  "importJobId": 901,
  "creditCardId": 3,
  "statementDate": "2026-10-25",
  "statementPeriodStart": "2026-09-26",
  "statementPeriodEnd": "2026-10-25",
  "paymentDueDate": "2026-11-10",
  "previousBalance": 1200.00,
  "purchaseAmount": 3500.00,
  "totalDue": 3150.00,
  "status": "imported",
  "totalItems": 5,
  "duplicateItems": 0,
  "items": [
    {
      "statementItemId": 71,
      "transactionDate": "2026-10-02",
      "description": "ร้านค้า ABC",
      "itemType": "purchase",
      "amount": 850.00,
      "externalReference": "REF-ABC123",
      "isDuplicate": false,
      "isLinked": false,
      "suggestedCategoryId": 12,
      "suggestedCategoryName": "อาหาร"
    }
  ]
}
```

**`ConfirmStatementItemsRequest`**
```json
{
  "items": [
    {
      "statementItemId": 71,
      "categoryId": 12,
      "description": "ร้านค้า ABC"
    }
  ]
}
```

**`ImportJobResponse`**
```json
{
  "importJobId": 900,
  "importType": "slip",
  "fileName": "slip_kbank.jpg",
  "status": "needsReview",
  "totalRecords": 1,
  "importedRecords": 0,
  "duplicateRecords": 0,
  "errorMessage": null,
  "startedAt": "2026-10-15T18:30:00Z",
  "completedAt": null,
  "createdAt": "2026-10-15T18:30:00Z"
}
```

### Business rules ที่บังคับใช้
- **ขนาดและชนิดไฟล์:** ไฟล์สลิปจำกัดขนาดไม่เกิน 10 MB, รองรับ `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`; ไฟล์ใบแจ้งยอดบัตรเครดิตรองรับ `.csv` และ `.json`
- **Duplicate Detection:** สลิปตรวจสอบด้วย `FileHash` (SHA-256) หากตรวจพบว่าผู้ใช้อัปโหลดไฟล์เดิมซ้ำ ระบบจะติดแฟล็ก `isDuplicate=true` และตั้งสถานะ `reviewStatus="duplicate"`; รายการใน statement ตรวจจับซ้ำด้วย `ExternalReference` หรือการจับคู่ วันที่ + บัตร + จำนวนเงิน
- **Auto-Categorization Integration:** ตอน Review สลิปและ Statement Items ระบบจะทำการจับคู่ Category แนะนำอัตโนมัติจาก CategoryRules และ Merchants ที่มีอยู่
- **Storage:** จัดเก็บไฟล์บน Local Disk Storage ผ่านอินเทอร์เฟซ `IFileStorageService` นอกไดเรกทอรีเว็บสาธารณะ

---

## 5J. Admin Roles & Permissions (contract — ล็อกแล้วตาม D41)

**สถานะ:** ✅ ล็อกแล้ว (D41)

### Endpoints

| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/roles` | ดึงรายการบทบาททั้งหมด พร้อมจำนวนผู้ใช้และสิทธิ์ | `Admin` |
| `GET` | `/api/v1/admin/roles/{id}` | ดึงข้อมูลบทบาทพร้อมรายการสิทธิ์ทั้งหมดที่ผูกอยู่ | `Admin` |
| `POST` | `/api/v1/admin/roles` | สร้างบทบาทใหม่ | `Admin` |
| `PUT` | `/api/v1/admin/roles/{id}` | แก้ไขชื่อ คำอธิบาย หรือสถานะบทบาท | `Admin` |
| `DELETE` | `/api/v1/admin/roles/{id}` | ลบบทบาท (ป้องกันการลบบทบาทหลัก `Admin`) | `Admin` |
| `GET` | `/api/v1/admin/permissions` | ดึงรายการสิทธิ์ทั้งหมดในระบบ (จัดกลุ่มตาม Module) | `Admin` |
| `PUT` | `/api/v1/admin/roles/{id}/permissions` | กำหนดชุดสิทธิ์ให้กับบทบาท (Permission Matrix) | `Admin` |
| `GET` | `/api/v1/admin/users` | ดึงรายชื่อผู้ใช้ทั้งหมดพร้อมบทบาทที่ได้รับมอบหมาย | `Admin` |
| `PUT` | `/api/v1/admin/users/{userId}/roles` | มอบหมายหรือเปลี่ยนแปลงบทบาทของผู้ใช้งาน | `Admin` |

### Request/Response DTOs

#### 1. `RoleResponse`
```json
{
  "id": 1,
  "name": "Admin",
  "description": "ผู้ดูแลระบบ มีสิทธิ์เข้าถึงและจัดการได้ทุกส่วนของระบบ",
  "isActive": true,
  "userCount": 6,
  "permissionCount": 15,
  "createdAt": "2026-10-20T09:14:00Z"
}
```

#### 2. `PermissionResponse`
```json
{
  "permissionId": 1,
  "permissionCode": "TRANSACTIONS_VIEW",
  "permissionName": "ดูรายการธุรกรรม",
  "module": "Transactions",
  "description": "เข้าถึงและดูประวัติรายการรายรับรายจ่าย"
}
```

#### 3. `UpdateRolePermissionsRequest`
```json
{
  "permissionIds": [1, 2, 3, 5, 6, 7, 8, 10, 12]
}
```

#### 4. `AssignUserRolesRequest`
```json
{
  "roleNames": ["Admin", "Member"]
}
```

---

## 5K. Audit Logs (contract — ล็อกแล้วตาม D13/FR8)

**สถานะ:** ✅ ล็อกแล้ว (D13, FR8.1, FR8.2)

### Endpoints

| Method | Path | Summary | Auth |
|---|---|---|---|
| `GET` | `/api/v1/audit-logs` | ดึงรายการประวัติการเปลี่ยนแปลงแบบแบ่งหน้า (กรองตาม action, entityType, entityId, ช่วงเวลา, คำค้นหา, userId สำหรับ Admin) | `Admin` |
| `GET` | `/api/v1/audit-logs/entity-types` | ดึงรายการ EntityType ทั้งหมดที่มีการบันทึกประวัติ (สำหรับ dropdown filter) | `Admin` |
| `GET` | `/api/v1/audit-logs/{id}` | ดึงรายละเอียดประวัติการเปลี่ยนแปลงตาม Id พร้อม DetailsJson (before/after/payload) | `Admin` |
| `GET` | `/api/v1/audit-logs/settings` | ดึงสถานะการตั้งค่าการบันทึกและสถิติพื้นที่จัดเก็บของ Audit Log (จำนวนประวัติ, วันที่เก่าสุด/ล่าสุด) | `Admin` |
| `PUT` | `/api/v1/audit-logs/settings` | เปิด/ปิดการบันทึกประวัติการเปลี่ยนแปลง Audit Log เพื่อป้องกันฐานข้อมูลบวม | `Admin` |
| `POST` | `/api/v1/audit-logs/purge` | ล้างประวัติการเปลี่ยนแปลงเก่าตามจำนวนวัน (หรือลบทั้งหมด) เพื่อคืนพื้นที่ฐานข้อมูล | `Admin` |

### Query Parameters สำหรับ `GET /api/v1/audit-logs`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `action` | `string` | No | - | กรองตามประเภทเหตุการณ์ (`Create`, `Update`, `Delete`, `Import`) |
| `entityType` | `string` | No | - | กรองตามชื่อ Entity (เช่น `Transaction`, `Budget`, `BankAccount`, `CreditCard`) |
| `entityId` | `string` | No | - | กรองตาม Id ของ Entity |
| `fromDate` | `DateTime` (ISO 8601) | No | - | วันที่เริ่มต้น (UTC) |
| `toDate` | `DateTime` (ISO 8601) | No | - | วันที่สิ้นสุด (UTC) |
| `q` | `string` | No | - | ค้นหาข้อความใน DetailsJson หรือ EntityId |
| `userId` | `long` | No | - | กรองตาม UserId |
| `page` | `int` | No | 1 | หน้าที่ต้องการ |
| `pageSize` | `int` | No | 20 | จำนวนรายการต่อหน้า (สูงสุด 100) |

### Authorization Rule
- **การจำกัดสิทธิ์ (Permission Lock):** หน้า `/audit-logs` และ API ทุกเส้นของ `/api/v1/audit-logs` ถูกล็อกให้เฉพาะผู้ใช้ที่มีบทบาทระดับ `Admin` (Permission: `AUDIT_LOGS_VIEW`) เท่านั้นที่สามารถเข้าถึงได้ หากผู้ใช้ทั่วไปพยายามเข้าถึงจะได้รับ `403 Forbidden` หรือหน้าแจ้งเตือนปฏิเสธการเข้าถึง (Access Denied)

### Data Sanitization
- ทุกเหตุการณ์จะถูกทำ Sensitive Key Sanitization อัตโนมัติ (`password`, `token`, `secret`, `cvv`, `cardNumber` ฯลฯ จะถูกแปลงเป็น `***MASKED***` ก่อนบันทึกลงฐานข้อมูล)

### Request / Response Schemas

#### 1. `AuditLogResponse`
```json
{
  "auditLogId": 1024,
  "userId": 5,
  "userDisplayName": "Somchai Jaidee",
  "action": "Update",
  "entityType": "Transaction",
  "entityId": "502",
  "occurredAt": "2026-10-21T00:00:00Z",
  "detailsJson": "{\"before\":{\"amount\":150.00,\"note\":\"อาหารเที่ยง\"},\"after\":{\"amount\":180.00,\"note\":\"อาหารเที่ยง + กาแฟ\"}}"
}
```

#### 2. `GET /api/v1/audit-logs` Response
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "auditLogId": 1024,
        "userId": 5,
        "userDisplayName": "Somchai Jaidee",
        "action": "Update",
        "entityType": "Transaction",
        "entityId": "502",
        "occurredAt": "2026-10-21T00:00:00Z",
        "detailsJson": "{\"before\":{\"amount\":150.00},\"after\":{\"amount\":180.00}}"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

#### 3. `GET /api/v1/audit-logs/entity-types` Response
```json
{
  "success": true,
  "data": [
    "BankAccount",
    "Budget",
    "Category",
    "CategoryRule",
    "CreditCard",
    "Merchant",
    "RecurringTransaction",
    "Role",
    "SlipImport",
    "StatementImport",
    "Tag",
    "Transaction",
    "Transfer",
    "User",
    "UserSettings"
  ]
}
```

#### 4. `GET /api/v1/audit-logs/settings` Response
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "totalLogs": 2450,
    "oldestLogDate": "2026-08-01T12:00:00Z",
    "latestLogDate": "2026-10-21T01:00:00Z",
    "updatedAt": "2026-10-21T00:30:00Z",
    "updatedByUserId": 1
  }
}
```

#### 5. `PUT /api/v1/audit-logs/settings` Request & Response
```json
// Request
{
  "isEnabled": false
}

// Response
{
  "success": true,
  "data": {
    "isEnabled": false,
    "totalLogs": 2450,
    "oldestLogDate": "2026-08-01T12:00:00Z",
    "latestLogDate": "2026-10-21T01:00:00Z",
    "updatedAt": "2026-10-21T01:15:00Z",
    "updatedByUserId": 1
  }
}
```

#### 6. `POST /api/v1/audit-logs/purge` Request & Response
```json
// Request (olderThanDays = 0 หมายถึงลบทั้งหมด)
{
  "olderThanDays": 90
}

// Response
{
  "success": true,
  "data": {
    "deletedCount": 420,
    "message": "ลบประวัติการเปลี่ยนแปลงที่เก่ากว่า 90 วันเรียบร้อยแล้ว (420 รายการ)"
  }
}
```

---

## 5L. Admin System Categories (contract — สิทธิ์ SYSTEM_CATEGORIES_MANAGE)

**สถานะ:** ✅ ล็อกแล้ว (Phase 5 / Admin Expansion)

จัดการหมวดหมู่มาตรฐานของระบบ (`IsSystem = true`, `UserId = null`) สำหรับผู้ดูแลระบบ (Admin)

| Method | Endpoint | Description | Role / Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/categories` | ดึงรายการหมวดหมู่มาตรฐานของระบบทั้งหมด (เรียงตาม SortOrder) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `GET` | `/api/v1/admin/categories/{id}` | ดึงข้อมูลหมวดหมู่มาตรฐานตาม Id | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `POST` | `/api/v1/admin/categories` | สร้างหมวดหมู่มาตรฐานใหม่ (ป้องกันชื่อซ้ำในระบบ) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `PUT` | `/api/v1/admin/categories/{id}` | แก้ไขหมวดหมู่มาตรฐาน (ชื่อ, ประเภท, ไอคอน, สี, สถานะเปิด/ปิดใช้งาน) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `DELETE` | `/api/v1/admin/categories/{id}` | ลบหมวดหมู่มาตรฐาน (ป้องกันการลบหากมีรายการธุรกรรมอ้างอิงอยู่) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `PUT` | `/api/v1/admin/categories/reorder` | ปรับลำดับการแสดงผลหมวดหมู่มาตรฐาน (`items: [{ categoryId, sortOrder }]`) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |
| `POST` | `/api/v1/admin/categories/seed-defaults` | นำเข้า/คืนค่าเริ่มต้น 12 หมวดหมู่มาตรฐานของ PocketWise อัตโนมัติ (Idempotent) | `Admin` / `SYSTEM_CATEGORIES_MANAGE` |

### Business Rules
1. **ป้องกันชื่อซ้ำ:** ตรวจสอบ `SystemNameExistsAsync` เฉพาะในกลุ่ม `IsSystem = true`
2. **ป้องกัน Data Integrity:** หากหมวดหมู่มีรายการธุรกรรม (`Transactions`) ผูกอยู่ จะปฏิเสธการลบด้วยข้อผิดพลาด `409 Conflict: ไม่สามารถลบหมวดหมู่ระบบนี้ได้เนื่องจากมีรายการธุรกรรมอ้างอิงอยู่ (แนะนำให้ปิดการใช้งานแทน)`
3. **Audit Log:** บันทึกประวัติการเปลี่ยนแปลง (`AuditLogs`) ทุก Action (`Create`, `Update`, `Delete`, `system-reorder`, `seed-defaults`) พร้อม `actorUserId` และ Before/After state เสมอ

---

## 5M. Background Jobs & System Maintenance (contract — Hosted Services)

**สถานะ:** ✅ ล็อกแล้ว

ระบบงานเบื้องหลัง (ASP.NET Core Hosted Services) สำหรับบำรุงรักษาและป้องกันฐานข้อมูลบวมอัตโนมัติ:

### 1. รายการ Background Services

| Service | ความถี่และเวลาทำงาน | เป้าหมายการทำงาน | Configuration (appsettings) |
|---|---|---|---|
| `AuditLogCleanupBackgroundService` | **ทุกวัน ตอนกลางคืน** (ค่าเริ่มต้น: 02:00 น.) | ลบข้อมูลในตาราง `AuditLogs` ที่มีอายุมากกว่า 90 วัน (`OccurredAt < Now - 90 วัน`) เพื่อลดขนาด Database | `MaintenanceJobs:AuditLogCleanup:RunHour = 2`, `RetentionDays = 90` |
| `RefreshTokenCleanupBackgroundService` | **รายสัปดาห์ ทุกคืนวันอาทิตย์** (ค่าเริ่มต้น: วันอาทิตย์ 03:00 น.) | ลบข้อมูลในตาราง `UserRefreshTokens` ที่หมดอายุแล้ว (`ExpiresAt <= Now`) หรือถูกเพิกถอน (`RevokedAt <= Now`) | `MaintenanceJobs:RefreshTokenCleanup:RunDayOfWeek = "Sunday"`, `RunHour = 3` |

### 2. Manual Trigger / Maintenance Endpoints (สำหรับ Admin)

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| `POST` | `/api/v1/auth/purge-expired-tokens` | `Admin` | ล้าง Refresh Token ที่หมดอายุหรือถูกเพิกถอน (Revoked) ทันทีบนฐานข้อมูล คืนจำนวนที่ถูกลบ |
| `POST` | `/api/v1/audit-logs/purge` | `Admin` | ล้างประวัติ Audit Logs ที่เก่ากว่า X วัน (หรือทั้งหมด) ทันทีบนฐานข้อมูล |

---

## 6. SignalR Events (contract — ล็อกแล้วตาม D37)

**สถานะ:** ✅ ล็อกแล้ว (D37)

### การเชื่อมต่อและ Authentication
- **Hub Route:** `/hubs/notifications`
- **Transport:** WebSockets (fallback: Server-Sent Events, Long Polling)
- **Auth:** Client แนบ JWT Bearer Token ผ่าน query string `?access_token=<JWT_TOKEN>` ตอน negotiate/connect; Backend ตรวจสอบผ่าน `JwtBearerEvents.OnMessageReceived` สำหรับ path ที่ขึ้นต้นด้วย `/hubs/`
- **User Groups:** Server จัดการ per-user group `$"user_{userId}"` อัตโนมัติใน `OnConnectedAsync` ผ่าน ClaimsPrincipal `sub` / `NameIdentifier` — **ไม่รับ userId จาก client**

### Client-bound Events (Server -> Client)

#### 1. `ReceiveNotification`
ส่งเมื่อมี notification ใหม่เกิดขึ้น (เช่น แจ้งเตือนงบประมาณเกิน/ใกล้ถึงเกณฑ์, งานประมวลผลเสร็จสิ้น)
- **Payload:** `NotificationResponse` (ตรงกับ DTO ฝั่ง REST)
```json
{
  "notificationId": 101,
  "notificationType": "BUDGET_WARNING_20261001",
  "title": "งบ อาหาร ใกล้ถึงขีดจำกัด",
  "message": "ใช้ไปแล้ว 4,200.00 THB จาก 5,000.00 THB (84.00%)",
  "channel": "inApp",
  "status": "sent",
  "relatedEntityType": "Budget",
  "relatedEntityId": 12,
  "sentAt": "2026-10-20T09:00:00Z",
  "readAt": null,
  "createdAt": "2026-10-20T09:00:00Z"
}
```
- **การตอบสนองฝั่ง Client:**
  1. แสดง Toast แจ้งเตือน (Sonner)
  2. Invalidate React Query keys: `["notifications"]`, `["notifications", "unread-count"]`
  3. หาก `relatedEntityType === "Budget"` ให้ invalidate `["budgets"]` เพื่ออัปเดตยอดใช้

#### 2. `ReceiveRefreshHint`
ส่งเมื่อมีการเปลี่ยนแปลงข้อมูลที่ส่งผลให้หน้าจออื่นหรืออุปกรณ์อื่นของผู้ใช้ต้องโหลดข้อมูลใหม่ (Cache/Query Invalidation Hint)
- **Payload:**
```json
{
  "entityType": "budget",
  "hint": "budget-updated",
  "timestamp": "2026-10-20T09:00:00Z"
}
```
- `entityType`: `budget` / `transaction` / `category` / `all`
- **การตอบสนองฝั่ง Client:** Invalidate React Query cache ตาม `entityType` ที่ระบุ

### Business Rules ของ SignalR
1. **บันทึกลง SQL Server (ตาราง `Notifications`) ก่อน broadcast เสมอ** — SignalR ทำหน้าที่ส่งต่อแบบ real-time ไม่ทำหน้าที่เป็น data store
2. ห้าม broadcast ข้อมูลละเอียดอ่อน (รหัสผ่าน, token, เลขบัตรเต็ม)
3. หาก client ออฟไลน์ ข้อความจะอยู่ใน SQL Server และสามารถดึงผ่าน REST API `GET /api/v1/notifications` เมื่อออนไลน์

---

## 7. กติกาการใช้/อัปเดตเอกสารนี้

1. **ก่อน implement:** เพิ่ม/แก้ contract ลงไฟล์นี้ก่อน (กติกา §10 ของ playbook)
2. **ทุก endpoint ต้องสอดคล้อง:** conventions §1 + envelope §2 + status §3 + pagination §4 (ถ้า list) + auth §5 (ถ้ามี token)
3. **เทียบกับ OpenAPI:** dev เรียก `GET /openapi/v1.json` หรือเปิด `http://localhost:5268/swagger` — ต้องตรงกับเอกสารนี้ (ผลต่าง = ต้องแก้)
4. **แก้ contract ระหว่างทาง:** อัปเดตเอกสารนี้ + FE types + tests ในงานเดียวกัน — ห้ามมาครว่งเคอร์

---

*Contract of Record — Swagger/OpenAPI คือ spec หลัก (auto-generated), เอกสารนี้คือ convention กลาง + สัญญาที่ OpenAPI ไม่ครอบ (error codes, pagination, SignalR) ที่ต้องตรงกันทั้งสองฝั่ง*