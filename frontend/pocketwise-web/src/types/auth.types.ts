// Auth types (sync with backend DTOs.Auth)

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  isEmailVerified: boolean;
  roles?: string[];
}

export interface UpdateUserProfileRequest {
  email: string;
  displayName: string;
  phoneNumber: string | null;
  birthDate: string | null;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: UserProfileResponse;
}

export interface SendVerificationEmailResponse {
  sent: boolean;
  email: string;
  cooldownSeconds: number;
  message: string;
}

export interface VerifyEmailRequest {
  userId: number;
  token: string;
}

export interface VerifyEmailResponse {
  verified: boolean;
  email: string;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  sent: boolean;
  cooldownSeconds: number;
  message: string;
}

export interface ResetPasswordRequest {
  userId: number;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
