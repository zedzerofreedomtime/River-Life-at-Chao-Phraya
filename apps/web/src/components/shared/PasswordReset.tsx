import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { api } from "../../data/api";
import type { Language } from "../../data/i18n";

export default function PasswordReset({
  language,
  initialEmail,
  modal,
  onBack,
}: {
  language: Language;
  initialEmail: string;
  modal: boolean;
  onBack: () => void;
}) {
  const en = language === "en";
  const [step, setStep] = useState<"email" | "otp" | "password" | "complete">(
    "email",
  );
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = async () => {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCode("");
      setResetToken("");
      setStep("otp");
      setMessage(
        en
          ? "If this email has a password-based account, a code will be sent. Check your inbox and spam folder. The code expires in 10 minutes."
          : "หากอีเมลนี้มีบัญชีที่ใช้รหัสผ่าน ระบบจะส่ง OTP ให้ กรุณาตรวจสอบกล่องจดหมายและจดหมายขยะ รหัสมีอายุ 10 นาที",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (busy) return;
    if (step === "email") {
      await request();
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (step === "otp") {
        if (code.length !== 6) return;
        const result = await api<{ reset_token: string }>(
          "/auth/password-reset/verify",
          { method: "POST", body: JSON.stringify({ email, code }) },
        );
        setResetToken(result.reset_token);
        setCode("");
        setMessage("");
        setStep("password");
      } else if (step === "password") {
        if (password.length < 8 || password !== confirm) return;
        await api("/auth/password-reset/complete", {
          method: "POST",
          body: JSON.stringify({ email, reset_token: resetToken, password }),
        });
        setPassword("");
        setConfirm("");
        setResetToken("");
        setStep("complete");
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className={`auth-page content-panel${modal ? " auth-modal-content" : ""}`}
    >
      <div className="orders-heading">
        <h1>
          {step === "email"
            ? en
              ? "Forgot password"
              : "ลืมรหัสผ่าน"
            : step === "otp"
              ? en
                ? "Verify reset code"
                : "ยืนยัน OTP ตั้งรหัสใหม่"
              : step === "password"
                ? en
                  ? "Set a new password"
                  : "ตั้งรหัสผ่านใหม่"
                : en
                  ? "Password updated"
                  : "เปลี่ยนรหัสผ่านสำเร็จ"}
        </h1>
        <p>
          {step === "email"
            ? en
              ? "Use the email you registered with River Life."
              : "กรอกอีเมลที่ใช้สมัครสมาชิก River Life"
            : step === "otp"
              ? email
              : step === "password"
                ? en
                  ? "Choose a new password and confirm it."
                  : "กรอกรหัสผ่านใหม่และยืนยันให้ตรงกัน"
                : en
                  ? "Sign in again with your new password. Existing sessions have been signed out."
                  : "กรุณาเข้าสู่ระบบด้วยรหัสใหม่ ระบบยกเลิก session เดิมแล้ว"}
        </p>
      </div>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {message && <Alert severity="info">{message}</Alert>}
        {step === "email" && (
          <TextField
            label={en ? "Email" : "อีเมล"}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        )}
        {step === "otp" && (
          <TextField
            label={en ? "6-digit OTP" : "รหัส OTP 6 หลัก"}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputProps={{ inputMode: "numeric", maxLength: 6 }}
            disabled={busy}
            required
          />
        )}
        {step === "password" && (
          <>
            <TextField
              label={en ? "New password" : "รหัสผ่านใหม่"}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={en ? "At least 8 characters" : "อย่างน้อย 8 ตัวอักษร"}
              inputProps={{ maxLength: 72 }}
              required
              disabled={busy}
            />
            <TextField
              label={en ? "Confirm new password" : "ยืนยันรหัสผ่านใหม่"}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm !== "" && password !== confirm}
              helperText={
                confirm !== "" && password !== confirm
                  ? en
                    ? "Passwords do not match"
                    : "รหัสผ่านไม่ตรงกัน"
                  : ""
              }
              required
              disabled={busy}
            />
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {step !== "complete" && (
          <Button
            type="submit"
            variant="contained"
            disabled={
              busy ||
              (step === "email" && !email.trim()) ||
              (step === "otp" && code.length !== 6) ||
              (step === "password" &&
                (password.length < 8 || password !== confirm))
            }
          >
            {busy
              ? en
                ? "Processing…"
                : "กำลังดำเนินการ…"
              : step === "email"
                ? en
                  ? "Send OTP"
                  : "ส่ง OTP ทางอีเมล"
                : step === "otp"
                  ? en
                    ? "Verify OTP"
                    : "ยืนยัน OTP"
                  : en
                    ? "Save new password"
                    : "บันทึกรหัสผ่านใหม่"}
          </Button>
        )}
        {step === "otp" && (
          <Button
            type="button"
            variant="outlined"
            onClick={() => void request()}
            disabled={busy}
          >
            {en ? "Resend OTP" : "ส่ง OTP อีกครั้ง"}
          </Button>
        )}
        {step === "password" && (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setResetToken("");
              setPassword("");
              setConfirm("");
              setError("");
              setMessage("");
            }}
          >
            {en ? "Request a new code" : "ขอ OTP ใหม่"}
          </Button>
        )}
        <Button type="button" disabled={busy} onClick={onBack}>
          {en ? "Back to login" : "กลับไปเข้าสู่ระบบ"}
        </Button>
      </form>
    </section>
  );
}
