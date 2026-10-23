
import { useState } from "react";
import axios from "axios";

import LoginScreen from "./src/screens/LoginScreen";
import OtpScreen from "./src/screens/OtpScreen";
import HomeScreen from "./src/screens/HomeScreen";

import { requestOtp, verifyOtp } from "./src/api/auth.api";
import { saveTokens } from "./src/api/token-storage";
import type { AuthUser } from "./src/api/auth.api";

type Screen = "login" | "otp" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleRequestOtp(value: string) {
    try {
      await requestOtp(value);
      setPhone(value);
      setScreen("otp");
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleVerifyOtp(otp: string) {
    try {
      const auth = await verifyOtp(phone, otp);
      await saveTokens(auth);
      setUser(auth.user);
      setScreen("home");
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleResendOtp() {
    try {
      await requestOtp(phone);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  if (screen === "login") {
    return <LoginScreen onContinue={handleRequestOtp} />;
  }

  if (screen === "otp") {
    return (
      <OtpScreen
        phone={phone}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onBack={() => setScreen("login")}
      />
    );
  }

  return <HomeScreen userPhone={user?.phone} />;
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach MiniLedger. Check the backend and emulator connection.";
    }

    const data = error.response.data as
      | { message?: string }
      | undefined;

    return data?.message ?? "Something went wrong. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}
