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
type SignupStep = "details" | "otp" | "complete";

export default function Auth({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser, source: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  const switchMode = (next: Mode) => {
    setMode(next);
    setSignupStep("details");
    setCode("");
    setDemoCode("");
    setMessage("");
    setError("");
  };
  const requestOTP = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ message: string; demo_code?: string }>(
        "/auth/signup/request",
        {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        },
      );
      setMessage(result.message);
      setDemoCode(result.demo_code ?? "");
      setSignupStep("otp");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const login = async () => {
    setBusy(true);
    setError("");
    try {
      onAuthenticated(
        await api<AuthUser>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
        "login",
      );
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
      const user = await api<AuthUser>("/auth/signup/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      onAuthenticated(user, "signup");
      setSignupStep("complete");
      setMessage(
        "สมัครสมาชิกสำเร็จแล้ว คุณสามารถใช้บัญชีนี้เข้าสู่ระบบได้ทันที",
      );
      setPassword("");
      setCode("");
      setDemoCode("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const details = (
    <>
      <TextField
        label="ชื่อ-นามสกุล"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="อีเมล"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="รหัสผ่าน"
        type="password"
        autoComplete="new-password"
        helperText="อย่างน้อย 8 ตัวอักษร"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button
        variant="contained"
        onClick={() => void requestOTP()}
        disabled={
          busy || !email || name.trim().length < 2 || password.length < 8
        }
      >
        สมัครสมาชิก
      </Button>
    </>
  );
  const otp = (
    <>
      <Alert severity="success">
        {message}
        {demoCode ? ` รหัสทดสอบ: ${demoCode}` : ""}
      </Alert>
      <p className="auth-otp-copy">
        กรอกรหัส OTP ที่ส่งไปยัง <strong>{email}</strong>
      </p>
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
        disabled={busy || code.length !== 6}
      >
        ยืนยัน OTP
      </Button>
      <Button
        variant="outlined"
        onClick={() => void requestOTP()}
        disabled={busy}
      >
        ส่ง OTP อีกครั้ง
      </Button>
    </>
  );

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
          {isSignup
            ? signupStep === "otp"
              ? "ยืนยันอีเมล"
              : signupStep === "complete"
                ? "สมัครสมาชิกสำเร็จ"
                : "สมัครสมาชิก River Life"
            : "เข้าสู่ระบบ River Life"}
        </h1>
        <p>
          {isSignup
            ? signupStep === "otp"
              ? "ยืนยัน OTP เพื่อเปิดใช้งานบัญชีของคุณ"
              : signupStep === "complete"
                ? "บัญชีของคุณพร้อมใช้งานแล้ว"
                : "สมัครสมาชิกเพื่อเก็บบัตรและคำสั่งซื้อไว้กับบัญชีของคุณ"
            : "กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ"}
        </p>
      </div>
      <div className="auth-form">
        {isSignup ? (
          signupStep === "details" ? (
            details
          ) : signupStep === "otp" ? (
            otp
          ) : (
            <Alert severity="success">{message}</Alert>
          )
        ) : (
          <>
            <TextField
              label="อีเมล"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => void login()}
              disabled={busy || !email || !password}
            >
              เข้าสู่ระบบ
            </Button>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </section>
  );
}
