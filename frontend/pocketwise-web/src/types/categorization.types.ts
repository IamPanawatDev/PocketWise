export type CategoryMatchType = "merchantName" | "description" | "bankReference";

export interface MerchantResponse {
  merchantId: number;
  merchantName: string;
  defaultCategoryId: number | null;
  defaultCategoryName: string | null;
  bankOrProvider: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface MerchantRequest {
  merchantName: string;
  defaultCategoryId: number | null;
  bankOrProvider: string | null;
}

export interface UpdateMerchantRequest extends MerchantRequest {
  isVerified: boolean;
}

export interface CategoryRuleResponse {
  categoryRuleId: number;
  ruleName: string;
  matchType: CategoryMatchType;
  matchPattern: string;
  categoryId: number;
  categoryName: string | null;
  priority: number;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CategoryRuleRequest {
  ruleName: string;
  matchType: CategoryMatchType;
  matchPattern: string;
  categoryId: number;
  priority: number;
}

export interface UpdateCategoryRuleRequest extends CategoryRuleRequest {
  isActive: boolean;
}

export interface CategorySuggestionResponse {
  categoryId: number;
  categoryName: string | null;
  source: "category-rule" | "merchant";
}
