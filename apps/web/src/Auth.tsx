import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { api } from "./api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  authenticated?: boolean;
};
type Mode = "login" | "signup";

export default function Auth({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  const switchMode = (next: Mode) => {
    setMode(next);
    setCode("");
    setDemoCode("");
    setMessage("");
    setError("");
  };
  const requestOTP = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string; demo_code?: string }>(
        isSignup ? "/auth/signup/request" : "/auth/login/request",
        {
          method: "POST",
          body: JSON.stringify(isSignup ? { name, email } : { email }),
        },
      );
      setMessage(result.message);
      setDemoCode(result.demo_code ?? "");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const verifyOTP = async () => {
    setBusy(true);
    setError("");
    try {
      onAuthenticated(
        await api<AuthUser>(
          isSignup ? "/auth/signup/verify" : "/auth/login/verify",
          { method: "POST", body: JSON.stringify({ email, code }) },
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page content-panel">
      <div className="auth-tabs" role="tablist" aria-label="การเข้าใช้งานบัญชี">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "active" : ""}
          onClick={() => switchMode("login")}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignup}
          className={isSignup ? "active" : ""}
          onClick={() => switchMode("signup")}
        >
          สมัครสมาชิก
        </button>
      </div>
      <div className="orders-heading">
        <h1>
          {isSignup ? "สมัครสมาชิก River Life" : "เข้าสู่ระบบ River Life"}
        </h1>
        <p>
          {isSignup
            ? "สมัครสมาชิกด้วยอีเมลเพื่อเก็บบัตรและคำสั่งซื้อไว้กับบัญชีของคุณ"
            : "กรอกอีเมลที่ใช้สมัครสมาชิก เพื่อรับรหัส OTP สำหรับเข้าสู่ระบบ"}
        </p>
      </div>
      <div className="auth-form">
        {isSignup && (
          <TextField
            label="ชื่อ-นามสกุล"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
        <TextField
          label="อีเมล"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          variant="contained"
          onClick={() => void requestOTP()}
          disabled={busy || !email || (isSignup && name.trim().length < 2)}
        >
          {isSignup ? "ส่ง OTP เพื่อสมัครสมาชิก" : "ส่ง OTP เพื่อเข้าสู่ระบบ"}
        </Button>
        {message && (
          <Alert severity="success">
            {message}
            {demoCode ? ` รหัสทดสอบ: ${demoCode}` : ""}
          </Alert>
        )}
        <TextField
          label="รหัส OTP 6 หลัก"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputProps={{ inputMode: "numeric", maxLength: 6 }}
        />
        <Button
          variant="contained"
          onClick={() => void verifyOTP()}
          disabled={busy || !email || code.length !== 6}
        >
          {isSignup ? "ยืนยันการสมัครสมาชิก" : "ยืนยันการเข้าสู่ระบบ"}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </section>
  );
}
