// Tag types (sync with backend DTOs.Tags)

export interface TagResponse {
  tagId: number;
  tagName: string;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateTagRequest {
  tagName: string;
  color: string | null;
}

export interface UpdateTagRequest {
  tagName: string;
  color: string | null;
}

export interface ReorderTagsRequest {
  items: { tagId: number; sortOrder: number }[];
}
