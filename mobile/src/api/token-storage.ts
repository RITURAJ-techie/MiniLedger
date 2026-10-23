
import * as SecureStore from "expo-secure-store";
import type { AuthResponse } from "./auth.api";

const ACCESS_TOKEN_KEY = "miniledger_access_token";
const REFRESH_TOKEN_KEY = "miniledger_refresh_token";

export async function saveTokens(auth: AuthResponse): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, auth.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, auth.refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
