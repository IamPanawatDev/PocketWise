// Category types (sync with backend DTOs.Categories + Domain.Enums.CategoryType)

export type CategoryType = "income" | "expense" | "both";

export interface CategoryResponse {
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  categoryName: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
}

export interface UpdateCategoryRequest {
  categoryName: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export interface ReorderCategoriesRequest {
  items: { categoryId: number; sortOrder: number }[];
}
