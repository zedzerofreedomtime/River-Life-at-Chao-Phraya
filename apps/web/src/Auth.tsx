import { useEffect, useState } from "react";
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

export default function Auth({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  useEffect(() => {
    void api<{ configured: boolean }>("/auth/google/status")
      .then(({ configured }) => setGoogleReady(configured))
      .catch(() => setGoogleReady(false));
  }, []);
  const requestOTP = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string; demo_code?: string }>(
        "/auth/signup/request",
        { method: "POST", body: JSON.stringify({ name, email }) },
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
        await api<AuthUser>("/auth/signup/verify", {
          method: "POST",
          body: JSON.stringify({ email, code }),
        }),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-page content-panel">
      <div className="orders-heading">
        <h1>เข้าสู่ระบบ หรือสมัครสมาชิก</h1>
        <p>
          เข้าสู่ระบบด้วย Google
          หรือสมัครสมาชิกด้วยอีเมลเพื่อเก็บบัตรและคำสั่งซื้อไว้กับบัญชีของคุณ
        </p>
      </div>
      <Button
        className="google-login"
        variant="outlined"
        onClick={() => window.location.assign("/api/v1/auth/google/start")}
        disabled={!googleReady}
      >
        {googleReady
          ? "เข้าสู่ระบบด้วย Google"
          : "Google Sign-In (รอการตั้งค่า)"}
      </Button>
      <div className="auth-divider">
        <span>หรือสมัครสมาชิกด้วยอีเมล</span>
      </div>
      <div className="auth-form">
        <TextField
          label="ชื่อ-นามสกุล"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="อีเมล"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          variant="contained"
          onClick={() => void requestOTP()}
          disabled={busy || !email}
        >
          ส่ง OTP เพื่อสมัครสมาชิก
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
          ยืนยันการสมัครสมาชิก
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </section>
  );
}
