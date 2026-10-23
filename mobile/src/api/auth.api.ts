import { apiClient } from "./client";

export type AuthUser = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type RegistrationDetails = {
  name: string;
  email: string;
  phone: string;
};

export type OtpMode = "register" | "login";

export type PhoneVerificationResult =
  | {
      nextStep: "email_verification";
      email: string;
      expiresInSeconds: number;
      message: string;
    }
  | AuthResponse;

export type PhoneEmailVerificationInput =
  | {
      mode: "register";
      token: string;
      expectedPhone: string;
      name: string;
      email: string;
    }
  | {
      mode: "login";
      token: string;
      expectedPhone: string;
    };

export async function verifyPhoneEmail(
  input: PhoneEmailVerificationInput,
): Promise<PhoneVerificationResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: PhoneVerificationResult;
  }>("/auth/phone-email/verify", input);

  return response.data.data;
}

export async function requestEmailOtp(phone: string): Promise<void> {
  await apiClient.post("/auth/request-email-otp", { phone });
}

export async function verifyEmailOtp(
  phone: string,
  otp: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: AuthResponse;
  }>("/auth/verify-email-otp", { phone, otp });

  return response.data.data;
}

export async function refreshSession(refreshToken: string) {
  const response = await apiClient.post<{
    success: boolean;
    data: Pick<
      AuthResponse,
      "accessToken" | "refreshToken" | "tokenType" | "expiresIn"
    >;
  }>("/auth/refresh", { refreshToken });

  return response.data.data;
}

export async function logoutSession(
  refreshToken: string,
): Promise<void> {
  await apiClient.post("/auth/logout", { refreshToken });
}