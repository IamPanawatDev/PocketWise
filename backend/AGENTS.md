# PocketWise Backend — AI Engineering Rules & Clean Architecture Guide

> **สำคัญมากสำหรับ AI Assistant**: เอกสารนี้เป็นกฎและแนวทางการพัฒนาฝั่ง Backend (.NET 10 Web API) ที่ AI ต้องอ่านและปฏิบัติตามทุกครั้งก่อนเพิ่มหรือแก้ไขโค้ดในโฟลเดอร์ `backend/`

---

> 🏛️ **แผนผังสถาปัตยกรรมฉบับล็อกแล้วอยู่ที่ [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md)** — ผังระบบทั้งหมด, ทิศทาง dependency ระหว่าง project (ตาราง "อ้างอิงได้/ห้ามอ้างอิง"), request lifecycle, auth flow, กฎการเชื่อมต่อ SQL Server/SignalR — **ห้ามสร้างสถาปัตยกรรมคนละแบบในแต่ละ Feature (อ่านก่อนเสมอ)** — ส่วนนี้สรุปเฉพาะโครงสร้างโฟลเดอร์ของ solution

โปรเจค Backend จัดโครงสร้างตามหลัก **Clean Architecture** แบ่งเป็น 4 เลเยอร์หลัก:

```text
backend/
├── PocketWise.sln
├── src/
│   ├── PocketWise.Domain/           # แกนกลางของระบบ (ไม่มี Dependency ภายนอก)
│   ├── PocketWise.Application/      # Use Cases, DTOs, Business Logic Orchestration
│   ├── PocketWise.Infrastructure/   # ฐานข้อมูล (EF Core), Repositories, External Services
│   └── PocketWise.Api/              # Presentation Layer: Controllers, Hubs, Middlewares
└── tests/
    ├── PocketWise.UnitTests/        # Unit Tests (Domain & Application)
    └── PocketWise.IntegrationTests/ # Integration Tests (WebApplicationFactory)
```

### กฎการพึ่งพา (Dependency Rules):
- **ทิศทาง dependency ฉบับเต็มต่อ project อยู่ที่ `/docs/ARCHITECTURE.md` §2 เท่านั้น** — สรุปสั้น: Domain ไม่มี dependency, Application → Domain เท่านั้น, Infrastructure/Api → Application + Domain
- **Controllers ต้องเบา (Thin Controllers)**: ไม่ใส่ Business Logic ใน Controller ให้ส่งต่อไปยัง Application Layer

---

## 🚨 2. กฎเหล็กที่ต้องปฏิบัติตามอย่างเคร่งครัด (Core Rules)

1. **ห้ามตัดสินใจเองเด็ดขาด — ถ้าไม่เข้าใจให้หยุดแล้วถามฉัน (Zero Guessing / Ask When Unclear)**
   - หากความสัมพันธ์ของ Entity (1-to-many, many-to-many), โครงสร้าง Field, ประเภทข้อมูล หรือ Business Rule ใดไม่ชัดเจน **ห้ามคิดหรือออกแบบเองเด็ดขาด** ให้หยุดถามผู้ใช้ทันที
2. **ห้ามติดตั้ง NuGet Package เพิ่มเติมโดยไม่ได้รับคำสั่ง (Strict NuGet Policy)**
   - ห้ามรันคำสั่ง `dotnet add package` โดยพลการ หากต้องการใช้ Package ใหม่ ต้องขออนุญาตผู้ใช้และให้เหตุผลก่อนเสมอ
3. **ศึกษาโมเดลเดิมและสัญญากับ Frontend ก่อนแก้ไข (Sync with Frontend)**
   - ก่อนจะสร้างหรือเปลี่ยน DTOs/Endpoints ต้องตรวจสอบว่าฝั่ง `frontend/` คาดหวังข้อมูลแบบใด และส่งผลกระทบต่อ TypeScript Type/Schema ของ Frontend หรือไม่
4. **ต้อง Build ผ่าน 100% เสมอ**:
   - ทุกครั้งที่เขียนหรือแก้ไขโค้ดเสร็จ ต้องรัน `dotnet build` ตรวจสอบว่าไม่มี Build Error ก่อนส่งงาน
5. **Swagger/OpenAPI ใช้เฉพาะ Development**:
   - ใช้ `Microsoft.AspNetCore.OpenApi` สร้างเอกสารที่ `/openapi/v1.json` และ NSwag Swagger UI ที่ `/swagger` โดยเปิดให้บริการเฉพาะ Development ตาม `Program.cs`
   - เมื่อแก้ API contract ให้ตรวจทั้ง OpenAPI JSON และ Swagger UI ให้ตรงกับ [`/docs/API_SPECIFICATION.md`](../docs/API_SPECIFICATION.md)

---

## 📁 3. คู่มือตำแหน่งไฟล์ (Code Placement Guide) — ต้องเขียนไว้ที่โฟลเดอร์ไหน?

เมื่อต้องการเพิ่มหรือแก้ไขโค้ดฝั่ง Backend ให้วางไฟล์ลงในโฟลเดอร์ตามความรับผิดชอบอย่างเคร่งครัด:

```text
backend/src/
├── PocketWise.Domain/
│   ├── Entities/                    # Database Entities (เช่น User, Transaction, Category, Budget)
│   ├── ValueObjects/                # Value Objects (เช่น Money, Currency)
│   ├── Enums/                       # Domain Enums (เช่น TransactionType, AccountType)
│   └── Rules/                       # Domain Invariant Rules & Custom Exceptions
│
├── PocketWise.Application/
│   ├── Features/                    # Use Cases จัดกลุ่มตามฟีเจอร์ (Commands / Queries)
│   ├── DTOs/                        # Request / Response Models สำหรับแลกเปลี่ยนข้อมูลกับ Frontend
│   ├── Interfaces/                  # Repository Interfaces (เช่น ITransactionRepository), UnitOfWork, Service Contracts
│   └── Validators/                  # FluentValidation Rules สำหรับตรวจสอบ Input
│
├── PocketWise.Infrastructure/
│   ├── Persistence/                 # ApplicationDbContext, Database Context Factory
│   ├── Configurations/              # EF Core EntityTypeConfiguration (Fluent API mapping)
│   ├── Migrations/                  # EF Core Migration files
│   ├── Repositories/                # Repository Implementations
│   └── Services/                    # External Service Implementations (Email, Blob Storage, Clock)
│
└── PocketWise.Api/
    ├── Controllers/                 # REST API Controllers (Thin endpoints)
    ├── Hubs/                        # SignalR Hubs (เช่น NotificationHub ที่ route /hubs/notifications)
    ├── Middleware/                  # Exception Handling, Request Logging, Auth Middlewares
    ├── Authentication/              # Auth Handlers, Claims & Token Helpers
    ├── Configuration/               # DI Container Extensions, Swagger / OpenAPI config
    └── Program.cs                   # Application Entry point & Pipeline configuration
```

> 🗺️ **ก่อนเริ่มงานทุกครั้ง** ให้อ่าน Playbook ต่อ Phase ที่ [`/docs/DEVELOPMENT_GUIDELINE.md`](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) ร่วมด้วยเสมอ (ขั้นตอน, คำสั่ง, สถานะ Phase, Decision Points) — แตะ schema ใด ๆ ต้องอ้างอิง [`/docs/DataDictionary.md`](file:///D:/Projects/PocketWise/docs/DataDictionary.md) และแตะ requirement ใด ๆ ต้องอ้างอิง [`/docs/REQUIREMENTS.md`](file:///D:/Projects/PocketWise/docs/REQUIREMENTS.md) (รายการ FR + สถานะ — Source of Truth ของ "ทำอะไร/ไม่ทำอะไร") — สัญญา REST/SignalR ระหว่าง Frontend–Backend อยู่ที่ [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) — **จบงาน implement ต้องอัปเดตสถานะที่ [`/docs/IMPLEMENTATION_CHECKLIST.md`](file:///D:/Projects/PocketWise/docs/IMPLEMENTATION_CHECKLIST.md) ทุกครั้ง**

### ตารางจับคู่ประเภทงานกับโฟลเดอร์:

| สิ่งที่ต้องการเขียนเพิ่ม | โฟลเดอร์ที่ต้องวาง | ตัวอย่างไฟล์ |
|---|---|---|
| **Entity / Table Model** | `src/PocketWise.Domain/Entities/` | `Transaction.cs`, `Budget.cs` |
| **Enum ประจำโดเมน** | `src/PocketWise.Domain/Enums/` | `TransactionType.cs` |
| **Value Object** | `src/PocketWise.Domain/ValueObjects/` | `Money.cs` |
| **DTO (Request/Response)** | `src/PocketWise.Application/DTOs/` | `CreateTransactionDto.cs`, `TransactionResponseDto.cs` |
| **Interface ของ Repository** | `src/PocketWise.Application/Interfaces/` | `ITransactionRepository.cs` |
| **Business Logic / Use Case** | `src/PocketWise.Application/Features/<Feature>/` | `CreateTransactionCommandHandler.cs` |
| **Input Validator** | `src/PocketWise.Application/Validators/` | `CreateTransactionValidator.cs` |
| **Entity Configuration (EF)** | `src/PocketWise.Infrastructure/Configurations/` | `TransactionConfiguration.cs` |
| **DbContext** | `src/PocketWise.Infrastructure/Persistence/` | `PocketWiseDbContext.cs` |
| **Repository Implementation** | `src/PocketWise.Infrastructure/Repositories/` | `TransactionRepository.cs` |
| **REST Controller / Endpoint** | `src/PocketWise.Api/Controllers/` | `TransactionsController.cs` |
| **SignalR Hub** | `src/PocketWise.Api/Hubs/` | `NotificationHub.cs` |
| **Middleware** | `src/PocketWise.Api/Middleware/` | `GlobalExceptionHandlerMiddleware.cs` |
| **Unit Test** | `tests/PocketWise.UnitTests/` | `TransactionTests.cs` |
| **Integration Test** | `tests/PocketWise.IntegrationTests/` | `TransactionsApiTests.cs` |

---

## ⚡ 4. SignalR & Real-time Guideline

> หลัก SignalR ทั้งหมด (route, บันทึกก่อน broadcast, auth ผ่าน claims, event contract) อยู่ที่ [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) §6 และสัญญา events อยู่ที่ [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) (section SignalR) — ส่วนนี้เหลือเฉพาะข้อที่อยู่ในบริบท backend โดยตรง:
>
> - Hub code อยู่ `src/PocketWise.Api/Hubs/` (ดูตารางวางไฟล์ด้านบน)
> - Server ไม่ต้องติดตั้ง NuGet เพิ่ม — AddSignalR อยู่ใน shared framework
> - ฝั่ง implement ตาม playbook ของ Phase 6 ที่ [`/docs/DEVELOPMENT_GUIDELINE.md`](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md)
