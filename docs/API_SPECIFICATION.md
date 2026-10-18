# PocketWise — API_SPECIFICATION.md (สัญญา Frontend ↔ Backend)

> **สำคัญสำหรับ AI Assistant:** เอกสารนี้คือ **สัญญาก่อนพัฒนาจริง (Contract of Record)** ระหว่าง Frontend และ Backend — **เขียน/แก้ endpoint ใด ๆ ต้องอัปเดตที่นี่ก่อน implement เสมอ** (กติกา §10 ของ playbook) — OpenAPI/Swagger ใน dev ต้องตรงกับเอกสารนี้
> **Swagger เป็น Specification หลักของ REST:** เอกสารนี้ (md) ให้หลักการ + conventions + ตัวอย่างที่ OpenAPI ไม่อธิบาย (error codes, มาตรฐาน pagination, SignalR) — จุดบริการจริงใช้ OpenAPI doc ที่ Api สร้างให้อัตโนมัติ (`/openapi/v1.json` ตอน dev)
> อ่านคู่กับ: `/docs/ARCHITECTURE.md` (สถาปัตยกรรม), `/docs/DataDictionary.md` (schema), `/docs/REQUIREMENTS.md` (FR), playbook (Decision Ledger)

---

## 1. Conventions กลาง (ล็อกแล้ว — D1, D8, D11)

| หัวข้อ | กำหนด |
|---|---|
| Base URL (dev) | `https://localhost:7023` (ตาม launchSettings + `.env.example` — D7) |
| Versioning | **path segment vN**: `/api/v1/...` — endpoint ชุดแรกทั้งหมดเป็น `/api/v1` (D11) |
| Content type | `application/json; charset=utf-8` (ทั้ง request และ response; upload file ยกเว้น multipart) |
| Auth | `Authorization: Bearer <access-token>` ทุก endpoint ยกเว้น `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh` |
| Response envelope | **Wrapped ทุก endpoint** — ดู §2.1 (D8) |
| Status codes | เข้ม REST-style — ดู §3 (D11) |
| ค่าเวลา | ส่ง/รับเป็น ISO 8601 UTC (เช่น `2026-01-31T10:00:00Z`) — client สนใจ timezone เองตอน render |
| ค่าเงิน | ส่งเป็น `decimal` (เช่น `1234.56`) + `currency` (ISO 4217, default `THB`) |
| ชื่อ field | `camelCase` ทั้ง request/response (JSON) — .NET ปรับผ่าน `JsonSerializerOptions` |
| Ids | `Guid`/`string` ตาม schema ใน DataDictionary (UserId เป็น string ของ Identity) |
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

**Filter params (ประกาศต่อ endpoint บน OpenAPI):** ใช้เฉพาะชื่อที่ endpoint นั้นกำหนด — กลุ่ม Transactions (FR4.x) คาดว่าจะใช้: `categoryId`, `tagId`, `bankAccountId`, `type` (`income|expense`), `fromDate`/`toDate` (UTC ISO), `q` (คำค้นใน note/ผู้รับ) — **ก่อน implement ต้องยืนยันทุกชื่อผู้กรองลงเอกสารนี้ก่อน**

**Sorting:** `sortBy=<field>&sortDesc=true` — default ต่อ endpoint ประกาศใน spec ของ endpoint นั้น (เช่น transactions default `sortBy=occurredAt&sortDesc=true`); sortBy จำกัดเฉพาะ field ที่ endpoint ประกาศ

---

## 5. Authentication & Permission (D1, รายละเอียด flow ใน ARCHITECTURE §5)

- **Access Token:** JWT — ส่งใน header `Authorization: Bearer ...` ทุกตัวบนนอกจากแถวไม่ต้อง auth ด้านล่าง
- **Refresh Token:** อยู่ใน request body ตอนเรียก `/auth/refresh` — ฝั่ง backend เก็บ SHA-256 hash ตาราง `UserRefreshTokens` (ไม่เก็บ plain token ใน DB ทุกกรณี)
- **Ownership:** ทุก query/command จำกัดผลลัพธ์โดย UserId ที่มาจาก claims — **ห้าม**รับ UserId เป็น query/body param ใน endpoint ใด ๆ
- **เมื่อ access token หมดอายุ:** ตอบ `401 + TOKEN_EXPIRED` — client เรียก `/auth/refresh` ด้วย refresh token, ได้ token คู่ใหม่, ทำ retry request เดิม (ฝั่ง `api-client.ts` จัดตามนี้)
- **Rotation กัน reuse:** การเรียก refresh ทำ rotation — พบใช้ token เก่าซ้ำ → `401 + INVALID_REFRESH_TOKEN` และระบบ revoke ทุก session ของ user นั้น (ฝั่ง client ตอบสนองด้วยการ logout ไปหน้า login)

### Endpoints ชุดแรก —/Auth (contract แรกที่จะ implement ใน Phase 3 — ชื่อ route ล็อกจาก D11)

| Method | Path | Auth | คำอธิบาย |
|:-:|---|:-:|---|
| `POST` | `/api/v1/auth/register` | ไม่ต้อง | สมัครใช้งาน |
| `POST` | `/api/v1/auth/login` | ไม่ต้อง | เข้าสู่ระบบ — ตอบ token pair (ดู §5.1) |
| `POST` | `/api/v1/auth/refresh` | ไม่ต้อง (ใช้ refresh token แทน) | ต่ออายุ — rotation |
| `POST` | `/api/v1/auth/logout` | ต้อง | revoke refresh token ของ session ที่เรียก (ดีไซน์จาก UserRefreshTokens) |
| `GET` | `/api/v1/auth/me` | ต้อง | profile จาก claims (ไม่อิง DB จริงยกเว้นจำเป็น) |

#### 5.1 ตัวอย่าง contract (login) — ใช้เป็นแบบมาตรฐานเวลาเขียน endpoint อื่น

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
    "user": { "id": "u_29f4...", "email": "user@example.com", "displayName": "..." }
  }
}
```

```json
// 401 — รหัสไม่ถูก
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "traceId": "0HN7GK..." } }
```

- ❓ **ยังเปิด:** อายุจริง access/refresh (แนวทาง 15–60 นาที / 7–30 วัน) + relation `Users` ↔ `IdentityUser` — ล็อกก่อน implement Phase 3 แล้วค่ายมาอัปเดตค่าจริงในหัวข้อนี้
- **FE types:** สร้าง `src/types/api.types.ts` จาก envelope + `src/types/auth.types.ts` จาก section นี้ **หลัง response จริงถูก implement** (ตรงตามกฎ Sync with Frontend)

#### 5.2 วิธีขยาย endpoint อื่น (ตาม playbook §10) ทุกครั้ง:

1. เพิ่มแถวตาราง endpoint + request/response DTO + code ที่อาจตอบ ลงเอกสารนี้ก่อน (ตาม section 5.1 เป็น template)
2. Backend: implement + ตรวจ OpenAPI ว่าตรง
3. Frontend: เพิ่ม types/schemas ตามข้อ 1
4. ผ่าน Gate ตาม DoD ของ playbook

---

## 6. SignalR Events (section เปิด — ล็อกตอน Phase 6 เริ่ม, ตาม D11 แต่ 5ข)

**สถานะ:** ยัง**ไม่ล็อก** — กำหนด event contract ลง section นี้ **ก่อน implement Phase 6** โดยใช้ข้อมูลจาก playbook (ขั้นที่ 4 ของ Phase 6) + ผ้งการชี้ของ ARCHITECTURE §6

**แนวกรอบที่รอจัดจริง (ยังไม่ commit ทุกจุด):**

- Hub route เดียว: `/hubs/notifications` (`NEXT_PUBLIC_SIGNALR_HUB_URL` ใน `.env.example` ว่าไว้แล้ว)
- Auth: ส่ง access token ของ JWT ชุดเดียวกับ REST ผ่าน `access_token` ของ query string ต่อการ negotiate (รายละเอียดยังไม่ล็อก)
- Event candidates ที่อาจกำหนด (มาจาก playbook Phase 6 / FR5.2): `budget.warning`, `budget.exceeded`, `import.progress`, `import.completed`, `data.refresh-hint` — **ชื่อ+payload จริงต้องยืนยันตอน Phase 6**
- Payload ทุก event: ระบุ `{ type, occurredAt, ... }` แบบเดียวข้าม event — พร้อมหลัก "ห้าม broadcast ข้อมูลการเงินละเอียด ให้ใช้ record id/ประเภทพอ"
- ฝั่ง FE: โครงผ่าน `src/lib/signalr.ts` — ทำ reconnect + การ refresh query หลังได้ event

---

## 7. กติกาการใช้/อัปเดตเอกสารนี้

1. **ก่อน implement:** เพิ่ม/แก้ contract ลงไฟล์นี้ก่อน (กติกา §10 ของ playbook)
2. **ทุก endpoint ต้องสอดคล้อง:** conventions §1 + envelope §2 + status §3 + pagination §4 (ถ้า list) + auth §5 (ถ้ามี token)
3. **เทียบกับ OpenAPI:** dev เรียก `GET /openapi/v1.json` หรือใช้ Swagger UI — ต้องตรงกับเอกสารนี้ (ผลต่าง = ต้องแก้)
4. **แก้ contract ระหว่างทาง:** อัปเดตเอกสารนี้ + FE types + tests ในงานเดียวกัน — ห้ามมาครว่งเคอร์

---

*Contract of Record — Swagger/OpenAPI คือ spec หลัก (auto-generated), เอกสารนี้คือ convention กลาง + สัญญาที่ OpenAPI ไม่ครอบ (error codes, pagination, SignalR) ที่ต้องตรงกันทั้งสองฝั่ง*