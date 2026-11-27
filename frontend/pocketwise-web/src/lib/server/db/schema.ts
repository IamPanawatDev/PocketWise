import {
  pgTable,
  bigint,
  integer,
  smallint,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  date,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. AUTH & USER TABLES
// ==========================================

export const users = pgTable("Users", {
  id: bigint("Id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  displayName: varchar("DisplayName", { length: 150 }).notNull(),
  birthDate: date("BirthDate"),
  isEmailVerified: boolean("IsEmailVerified").default(false).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  isSuspended: boolean("IsSuspended").default(false).notNull(),
  suspendedAt: timestamp("SuspendedAt", { withTimezone: true, mode: "date" }),
  suspendedByUserId: bigint("SuspendedByUserId", { mode: "number" }),
  suspensionReason: text("SuspensionReason"),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }),
  userName: varchar("UserName", { length: 256 }),
  normalizedUserName: varchar("NormalizedUserName", { length: 256 }),
  email: varchar("Email", { length: 256 }),
  normalizedEmail: varchar("NormalizedEmail", { length: 256 }),
  emailConfirmed: boolean("EmailConfirmed").notNull().default(false),
  passwordHash: text("PasswordHash"),
  securityStamp: text("SecurityStamp"),
  concurrencyStamp: text("ConcurrencyStamp"),
  phoneNumber: text("PhoneNumber"),
  phoneNumberConfirmed: boolean("PhoneNumberConfirmed").notNull().default(false),
  twoFactorEnabled: boolean("TwoFactorEnabled").notNull().default(false),
  lockoutEnd: timestamp("LockoutEnd", { withTimezone: true, mode: "date" }),
  lockoutEnabled: boolean("LockoutEnabled").notNull().default(true),
  accessFailedCount: integer("AccessFailedCount").notNull().default(0),
});

export const roles = pgTable("Roles", {
  id: bigint("Id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("Name", { length: 256 }),
  normalizedName: varchar("NormalizedName", { length: 256 }),
  concurrencyStamp: text("ConcurrencyStamp"),
  description: varchar("Description", { length: 255 }),
  isActive: boolean("IsActive").default(true).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }),
});

export const userRoles = pgTable("UserRoles", {
  userId: bigint("UserId", { mode: "number" }).notNull(),
  roleId: bigint("RoleId", { mode: "number" }).notNull(),
  assignedAt: timestamp("AssignedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId], name: "PK_UserRoles" }),
]);

export const permissions = pgTable("Permissions", {
  permissionId: integer("PermissionId").primaryKey().generatedByDefaultAsIdentity(),
  permissionCode: varchar("PermissionCode", { length: 100 }).notNull(),
  permissionName: varchar("PermissionName", { length: 150 }).notNull(),
  module: varchar("Module", { length: 100 }).notNull(),
  description: varchar("Description", { length: 255 }),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const rolePermissions = pgTable("RolePermissions", {
  roleId: bigint("RoleId", { mode: "number" }).notNull(),
  permissionId: integer("PermissionId").notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId], name: "PK_RolePermissions" }),
]);

export const userRefreshTokens = pgTable("UserRefreshTokens", {
  refreshTokenId: bigint("RefreshTokenId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  tokenHash: varchar("TokenHash", { length: 500 }).notNull(),
  expiresAt: timestamp("ExpiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  createdByIp: varchar("CreatedByIp", { length: 50 }),
  userAgent: varchar("UserAgent", { length: 500 }),
  revokedAt: timestamp("RevokedAt", { withTimezone: true, mode: "date" }),
  revokedByIp: varchar("RevokedByIp", { length: 50 }),
  replacedByTokenHash: varchar("ReplacedByTokenHash", { length: 500 }),
  reasonRevoked: varchar("ReasonRevoked", { length: 100 }),
});

export const userSettings = pgTable("UserSettings", {
  userId: bigint("UserId", { mode: "number" }).primaryKey(),
  theme: varchar("Theme", { length: 20 }).default("dark").notNull(),
  currencyCode: varchar("CurrencyCode", { length: 10 }).default("THB").notNull(),
  locale: varchar("Locale", { length: 20 }).default("th-TH").notNull(),
  emailBudgetAlertsEnabled: boolean("EmailBudgetAlertsEnabled").default(true).notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ==========================================
// 2. MASTER DATA & FINANCIAL ACCOUNTS
// ==========================================

export const categories = pgTable("Categories", {
  categoryId: bigint("CategoryId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }),
  categoryName: varchar("CategoryName", { length: 100 }).notNull(),
  categoryType: varchar("CategoryType", { length: 20 }).notNull(), // "Expense", "Income", "Both"
  icon: varchar("Icon", { length: 100 }),
  color: varchar("Color", { length: 20 }),
  sortOrder: integer("SortOrder").default(0).notNull(),
  isSystem: boolean("IsSystem").default(false).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const categoryRules = pgTable("CategoryRules", {
  categoryRuleId: bigint("CategoryRuleId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }),
  ruleName: varchar("RuleName", { length: 150 }).notNull(),
  matchType: varchar("MatchType", { length: 30 }).notNull(), // "MerchantName", "Description", "BankReference"
  matchPattern: varchar("MatchPattern", { length: 300 }).notNull(),
  categoryId: bigint("CategoryId", { mode: "number" }).notNull(),
  priority: integer("Priority").default(100).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }),
});

export const userCategoryOrders = pgTable("UserCategoryOrders", {
  userId: bigint("UserId", { mode: "number" }).notNull(),
  categoryId: bigint("CategoryId", { mode: "number" }).notNull(),
  sortOrder: integer("SortOrder").notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.categoryId], name: "PK_UserCategoryOrders" }),
]);

export const tags = pgTable("Tags", {
  tagId: bigint("TagId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  tagName: varchar("TagName", { length: 50 }).notNull(),
  color: varchar("Color", { length: 20 }),
  sortOrder: integer("SortOrder").default(0).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const merchants = pgTable("Merchants", {
  merchantId: bigint("MerchantId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  merchantName: varchar("MerchantName", { length: 150 }).notNull(),
  normalizedName: varchar("NormalizedName", { length: 150 }).notNull(),
  defaultCategoryId: bigint("DefaultCategoryId", { mode: "number" }),
  bankOrProvider: varchar("BankOrProvider", { length: 100 }),
  isVerified: boolean("IsVerified").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const bankAccounts = pgTable("BankAccounts", {
  bankAccountId: bigint("BankAccountId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  bankCode: varchar("BankCode", { length: 30 }),
  bankName: varchar("BankName", { length: 100 }).notNull(),
  accountName: varchar("AccountName", { length: 100 }).notNull(),
  accountNumberMasked: varchar("AccountNumberMasked", { length: 30 }),
  accountType: varchar("AccountType", { length: 30 }).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const creditCards = pgTable("CreditCards", {
  creditCardId: bigint("CreditCardId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  bankName: varchar("BankName", { length: 100 }).notNull(),
  cardName: varchar("CardName", { length: 100 }).notNull(),
  cardNumberMasked: varchar("CardNumberMasked", { length: 30 }),
  billingDay: integer("BillingDay").notNull(),
  paymentDueDay: integer("PaymentDueDay").notNull(),
  creditLimit: numeric("CreditLimit", { precision: 18, scale: 2 }),
  isActive: boolean("IsActive").default(true).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const creditCardStatements = pgTable("CreditCardStatements", {
  statementId: bigint("StatementId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  creditCardId: bigint("CreditCardId", { mode: "number" }).notNull(),
  importJobId: bigint("ImportJobId", { mode: "number" }),
  statementPeriodStart: date("StatementPeriodStart", { mode: "string" }),
  statementPeriodEnd: date("StatementPeriodEnd", { mode: "string" }),
  statementDate: date("StatementDate", { mode: "string" }).notNull(),
  paymentDueDate: date("PaymentDueDate", { mode: "string" }),
  previousBalance: numeric("PreviousBalance", { precision: 18, scale: 2 }),
  purchaseAmount: numeric("PurchaseAmount", { precision: 18, scale: 2 }),
  installmentAmount: numeric("InstallmentAmount", { precision: 18, scale: 2 }),
  interestAmount: numeric("InterestAmount", { precision: 18, scale: 2 }),
  cashbackAmount: numeric("CashbackAmount", { precision: 18, scale: 2 }),
  paymentAmount: numeric("PaymentAmount", { precision: 18, scale: 2 }),
  totalDue: numeric("TotalDue", { precision: 18, scale: 2 }),
  status: varchar("Status", { length: 50 }).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const creditCardStatementItems = pgTable("CreditCardStatementItems", {
  statementItemId: bigint("StatementItemId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  statementId: bigint("StatementId", { mode: "number" }).notNull(),
  transactionDate: date("TransactionDate", { mode: "string" }).notNull(),
  description: varchar("Description", { length: 255 }).notNull(),
  itemType: varchar("ItemType", { length: 50 }).notNull(),
  amount: numeric("Amount", { precision: 18, scale: 2 }).notNull(),
  merchantId: bigint("MerchantId", { mode: "number" }),
  installmentPlanId: bigint("InstallmentPlanId", { mode: "number" }),
  transactionId: bigint("TransactionId", { mode: "number" }),
  externalReference: varchar("ExternalReference", { length: 100 }),
  isDuplicate: boolean("IsDuplicate").default(false).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const installmentPlans = pgTable("InstallmentPlans", {
  installmentPlanId: bigint("InstallmentPlanId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  creditCardId: bigint("CreditCardId", { mode: "number" }).notNull(),
  merchantId: bigint("MerchantId", { mode: "number" }),
  description: varchar("Description", { length: 255 }).notNull(),
  principalAmount: numeric("PrincipalAmount", { precision: 18, scale: 2 }).notNull(),
  installmentCount: integer("InstallmentCount").notNull(),
  installmentAmount: numeric("InstallmentAmount", { precision: 18, scale: 2 }).notNull(),
  interestRatePercent: numeric("InterestRatePercent", { precision: 5, scale: 2 }),
  startDate: date("StartDate", { mode: "string" }).notNull(),
  status: varchar("Status", { length: 50 }).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ==========================================
// 3. TRANSACTIONS & TRANSFERS
// ==========================================

export const transactions = pgTable("Transactions", {
  transactionId: bigint("TransactionId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  transactionType: varchar("TransactionType", { length: 50 }).notNull(),
  amount: numeric("Amount", { precision: 18, scale: 2 }).notNull(),
  currencyCode: varchar("CurrencyCode", { length: 10 }).default("THB").notNull(),
  transactionDate: timestamp("TransactionDate", { withTimezone: true, mode: "date" }).notNull(),
  description: varchar("Description", { length: 255 }),
  categoryId: bigint("CategoryId", { mode: "number" }),
  merchantId: bigint("MerchantId", { mode: "number" }),
  bankAccountId: bigint("BankAccountId", { mode: "number" }),
  creditCardId: bigint("CreditCardId", { mode: "number" }),
  sourceType: varchar("SourceType", { length: 50 }).notNull(),
  importJobId: bigint("ImportJobId", { mode: "number" }),
  slipImportFileId: bigint("SlipImportFileId", { mode: "number" }),
  statementItemId: bigint("StatementItemId", { mode: "number" }),
  transferGroupId: bigint("TransferGroupId", { mode: "number" }),
  recurringTransactionId: bigint("RecurringTransactionId", { mode: "number" }),
  installmentPlanId: bigint("InstallmentPlanId", { mode: "number" }),
  status: varchar("Status", { length: 50 }).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }),
});

export const transactionTags = pgTable("TransactionTags", {
  transactionId: bigint("TransactionId", { mode: "number" }).notNull(),
  tagId: bigint("TagId", { mode: "number" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.transactionId, table.tagId], name: "PK_TransactionTags" }),
]);

export const transferGroups = pgTable("TransferGroups", {
  transferGroupId: bigint("TransferGroupId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  fromBankAccountId: bigint("FromBankAccountId", { mode: "number" }).notNull(),
  toBankAccountId: bigint("ToBankAccountId", { mode: "number" }),
  amount: numeric("Amount", { precision: 18, scale: 2 }).notNull(),
  transferDate: timestamp("TransferDate", { withTimezone: true, mode: "date" }).notNull(),
  reference: varchar("Reference", { length: 100 }),
  status: varchar("Status", { length: 50 }).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ==========================================
// 4. BUDGETS & RECURRING
// ==========================================

export const budgets = pgTable("Budgets", {
  budgetId: bigint("BudgetId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  budgetName: varchar("BudgetName", { length: 150 }).notNull(),
  scopeType: varchar("ScopeType", { length: 50 }).notNull(),
  categoryId: bigint("CategoryId", { mode: "number" }),
  tagId: bigint("TagId", { mode: "number" }),
  amountLimit: numeric("AmountLimit", { precision: 18, scale: 2 }).notNull(),
  periodType: varchar("PeriodType", { length: 50 }).notNull(),
  startDate: date("StartDate").notNull(),
  endDate: date("EndDate"),
  alertThresholdPercent: smallint("AlertThresholdPercent").default(80).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const recurringTransactions = pgTable("RecurringTransactions", {
  recurringTransactionId: bigint("RecurringTransactionId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  transactionType: varchar("TransactionType", { length: 50 }).notNull(),
  amount: numeric("Amount", { precision: 18, scale: 2 }).notNull(),
  description: varchar("Description", { length: 255 }),
  categoryId: bigint("CategoryId", { mode: "number" }),
  frequency: varchar("Frequency", { length: 50 }).notNull(),
  intervalValue: integer("IntervalValue").default(1).notNull(),
  startDate: date("StartDate").notNull(),
  endDate: date("EndDate"),
  nextRunAt: timestamp("NextRunAt", { withTimezone: true, mode: "date" }).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  isDeleted: boolean("IsDeleted").default(false).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  daysOfWeek: varchar("DaysOfWeek", { length: 50 }),
});

export const recurringTransactionTags = pgTable("RecurringTransactionTags", {
  recurringTransactionId: bigint("RecurringTransactionId", { mode: "number" }).notNull(),
  tagId: bigint("TagId", { mode: "number" }).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.recurringTransactionId, table.tagId], name: "PK_RecurringTransactionTags" }),
]);

// ==========================================
// 5. SYSTEM, NOTIFICATIONS & AUDIT
// ==========================================

export const notifications = pgTable("Notifications", {
  notificationId: bigint("NotificationId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  notificationType: varchar("NotificationType", { length: 50 }).notNull(),
  title: varchar("Title", { length: 200 }).notNull(),
  message: varchar("Message", { length: 1000 }).notNull(),
  channel: varchar("Channel", { length: 20 }).notNull(),
  status: varchar("Status", { length: 20 }).notNull(),
  relatedEntityType: varchar("RelatedEntityType", { length: 50 }),
  relatedEntityId: bigint("RelatedEntityId", { mode: "number" }),
  sentAt: timestamp("SentAt", { withTimezone: true, mode: "date" }),
  readAt: timestamp("ReadAt", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const auditLogs = pgTable("AuditLogs", {
  auditLogId: bigint("AuditLogId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }),
  action: varchar("Action", { length: 100 }).notNull(),
  entityType: varchar("EntityType", { length: 100 }).notNull(),
  entityId: varchar("EntityId", { length: 100 }),
  detailsJson: text("DetailsJson"),
  occurredAt: timestamp("OccurredAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const securityEvents = pgTable("SecurityEvents", {
  securityEventId: bigint("SecurityEventId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  eventType: varchar("EventType", { length: 100 }).notNull(),
  targetUserId: bigint("TargetUserId", { mode: "number" }),
  actorUserId: bigint("ActorUserId", { mode: "number" }),
  succeeded: boolean("Succeeded").default(true).notNull(),
  ipAddress: varchar("IpAddress", { length: 50 }),
  userAgent: varchar("UserAgent", { length: 255 }),
  detailsJson: text("DetailsJson"),
  occurredAt: timestamp("OccurredAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const systemSettings = pgTable("SystemSettings", {
  settingKey: varchar("SettingKey", { length: 100 }).primaryKey(),
  settingValue: varchar("SettingValue", { length: 500 }).notNull(),
  description: varchar("Description", { length: 500 }),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedByUserId: bigint("UpdatedByUserId", { mode: "number" }),
});

export const announcements = pgTable("Announcements", {
  announcementId: bigint("AnnouncementId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("Title", { length: 200 }).notNull(),
  message: varchar("Message", { length: 2000 }).notNull(),
  startsAt: timestamp("StartsAt", { withTimezone: true, mode: "date" }).notNull(),
  endsAt: timestamp("EndsAt", { withTimezone: true, mode: "date" }).notNull(),
  isActive: boolean("IsActive").default(true).notNull(),
  createdByUserId: bigint("CreatedByUserId", { mode: "number" }).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("UpdatedAt", { withTimezone: true, mode: "date" }),
});

export const announcementTargets = pgTable("AnnouncementTargets", {
  announcementTargetId: bigint("AnnouncementTargetId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  announcementId: bigint("AnnouncementId", { mode: "number" }).notNull(),
  targetType: varchar("TargetType", { length: 50 }).notNull(),
  roleId: bigint("RoleId", { mode: "number" }),
  userId: bigint("UserId", { mode: "number" }),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const importJobs = pgTable("ImportJobs", {
  importJobId: bigint("ImportJobId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  importType: varchar("ImportType", { length: 50 }).notNull(),
  fileName: varchar("FileName", { length: 255 }),
  status: varchar("Status", { length: 50 }).notNull(),
  totalRecords: integer("TotalRecords").default(0).notNull(),
  importedRecords: integer("ImportedRecords").default(0).notNull(),
  duplicateRecords: integer("DuplicateRecords").default(0).notNull(),
  errorMessage: varchar("ErrorMessage", { length: 500 }),
  startedAt: timestamp("StartedAt", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("CompletedAt", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  retryCount: integer("RetryCount").default(0).notNull(),
});

export const slipImportFiles = pgTable("SlipImportFiles", {
  slipImportFileId: bigint("SlipImportFileId", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("UserId", { mode: "number" }).notNull(),
  importJobId: bigint("ImportJobId", { mode: "number" }),
  storageKey: varchar("StorageKey", { length: 500 }).notNull(),
  originalFileName: varchar("OriginalFileName", { length: 255 }).notNull(),
  mimeType: varchar("MimeType", { length: 100 }).notNull(),
  fileSizeBytes: bigint("FileSizeBytes", { mode: "number" }).notNull(),
  bankCode: varchar("BankCode", { length: 50 }),
  payerName: varchar("PayerName", { length: 255 }),
  payeeName: varchar("PayeeName", { length: 255 }),
  detectedAmount: numeric("DetectedAmount", { precision: 18, scale: 2 }),
  detectedAt: timestamp("DetectedAt", { withTimezone: true, mode: "date" }),
  transactionReference: varchar("TransactionReference", { length: 100 }),
  fileHash: varchar("FileHash", { length: 64 }),
  reviewStatus: varchar("ReviewStatus", { length: 50 }).notNull(),
  createdAt: timestamp("CreatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  merchantId: bigint("MerchantId", { mode: "number" }),
});
