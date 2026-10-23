
import { apiClient } from "./client";

export interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
}

export async function requestOtp(phone: string) {
  const response = await apiClient.post<{
    success: boolean;
    data: RequestOtpResponse;
  }>("/auth/request-otp", { phone });

  return response.data.data;
}

export async function verifyOtp(phone: string, otp: string) {
  const response = await apiClient.post<{
    success: boolean;
    data: AuthResponse;
  }>("/auth/verify-otp", { phone, otp });

  return response.data.data;
}
