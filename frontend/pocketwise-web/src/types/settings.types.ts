export type Theme = "light" | "dark";

export interface UserSettingsResponse {
  theme: Theme;
  currencyCode: string;
  locale: string;
  emailBudgetAlertsEnabled: boolean;
  isEmailServiceEnabled?: boolean;
  updatedAt: string;
}

export interface UpdateUserSettingsRequest {
  theme: Theme;
  currencyCode: string;
  locale: string;
  emailBudgetAlertsEnabled: boolean;
}

export interface DataResetResponse {
  resetAt: string;
}
