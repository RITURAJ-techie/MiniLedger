
import { useState } from "react";
import axios from "axios";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import PhoneEmailScreen from "./src/screens/PhoneEmailScreen";
import OtpScreen from "./src/screens/OtpScreen";
import HomeScreen from "./src/screens/HomeScreen";
import {
  verifyPhoneEmail,
  requestEmailOtp,
  verifyEmailOtp,
} from "./src/api/auth.api";
import type {
  AuthUser,
  AuthResponse,
  RegistrationDetails,
  OtpMode,
} from "./src/api/auth.api";
import { clearTokens, saveTokens } from "./src/api/token-storage";

type Screen = "register" | "login" | "phoneEmail" | "emailOtp" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("register");
  const [authMode, setAuthMode] = useState<OtpMode>("register");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleRequestOtp(details: RegistrationDetails): Promise<void> {
    setAuthMode("register");
    setPhone(details.phone.trim());
    setUserName(details.name.trim());
    setUserEmail(details.email.trim().toLowerCase());
    setScreen("phoneEmail");
  }

  async function handleLoginRequestOtp(loginPhone: string): Promise<void> {
    setAuthMode("login");
    setPhone(loginPhone.trim());
    setUserName("");
    setUserEmail("");
    setScreen("phoneEmail");
  }

  async function handleVerifyPhoneEmail(token: string): Promise<void> {
    try {
      const result =
        authMode === "register"
          ? await verifyPhoneEmail({
              mode: "register",
              token,
              expectedPhone: phone,
              name: userName,
              email: userEmail,
            })
          : await verifyPhoneEmail({
              mode: "login",
              token,
              expectedPhone: phone,
            });

      if ("nextStep" in result) {
        setUserEmail(result.email);
        setScreen("emailOtp");
        return;
      }

      await completeAuthentication(result);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleVerifyEmailOtp(otp: string): Promise<void> {
    try {
      const auth = await verifyEmailOtp(phone, otp);
      await completeAuthentication(auth);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleResendEmailOtp(): Promise<void> {
    try {
      await requestEmailOtp(phone);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function completeAuthentication(auth: AuthResponse): Promise<void> {
    await saveTokens(auth);
    setUser(auth.user);
    setPhone(auth.user.phone);
    setUserName(auth.user.name ?? "");
    setUserEmail(auth.user.email ?? "");
    setScreen("home");
  }

  async function handleLogout(): Promise<void> {
    try {
      await clearTokens();
    } catch (error) {
      console.warn("Failed to clear tokens:", error);
    } finally {
      setUser(null);
      setUserName("");
      setUserEmail("");
      setPhone("");
      setAuthMode("login");
      setScreen("login");
    }
  }

  async function handleProfileUpdated(
    name: string,
    email: string,
  ): Promise<void> {
    setUserName(name);
    setUserEmail(email);

    setUser((currentUser) =>
      currentUser
        ? { ...currentUser, name, email }
        : currentUser,
    );
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        onContinue={handleRequestOtp}
        onLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onContinue={handleLoginRequestOtp}
        onBack={() => setScreen("register")}
      />
    );
  }

  if (screen === "phoneEmail") {
    return (
      <PhoneEmailScreen
        onVerified={handleVerifyPhoneEmail}
        onBack={() => setScreen(authMode === "register" ? "register" : "login")}
        phone={phone}
      />
    );
  }

  if (screen === "emailOtp") {
    return (
      <OtpScreen
        key="email-otp"
        phone={userEmail}
        channel="email"
        onVerify={handleVerifyEmailOtp}
        onResend={handleResendEmailOtp}
        onBack={() => setScreen("phoneEmail")}
      />
    );
  }

  return (
    <HomeScreen
      userPhone={user?.phone ?? phone}
      userName={userName}
      userEmail={userEmail}
      onLogout={handleLogout}
      onProfileUpdated={handleProfileUpdated}
    />
  );
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach MiniLedger. Check the backend and emulator connection.";
    }

    const message = (
      error.response.data as { message?: unknown } | undefined
    )?.message;

    if (typeof message === "string" && message) return message;
    if (Array.isArray(message) && message.length) return message.join("\n");
    return "Something went wrong. Please try again.";
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}
