import PolicyLinks from "../shared/PolicyLinks";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowUpRight, MessageCircle, Send, ShieldCheck } from "lucide-react";
import type { Language } from "../../data/i18n";
import "../../ContactForm.css";

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};
const subjects = ["booking", "group", "order", "general"] as const;
const subjectLabels = {
  th: ["สอบถามการจอง", "จองแบบกลุ่ม", "คำสั่งซื้อ / บัตร", "สอบถามทั่วไป"],
  en: [
    "Booking enquiry",
    "Group booking",
    "Orders / tickets",
    "General enquiry",
  ],
};

export default function ContactPage({ language }: { language: Language }) {
  const en = language === "en";
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState<"" | "sent" | "failed">("");
  const requestId = useRef(crypto.randomUUID());
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "booking",
      message: "",
    },
  });
  const required = en
    ? "Please complete this field."
    : "กรุณากรอกข้อมูลช่องนี้";
  const labels = {
    firstName: en ? "First name" : "ชื่อ",
    lastName: en ? "Last name" : "นามสกุล",
    email: en ? "Email" : "อีเมล",
    phone: en ? "Phone number (optional)" : "เบอร์โทรศัพท์ (ไม่บังคับ)",
  };
  async function prepare(values: Values) {
    if (sending || delivery === "sent") return;
    setSending(true);
    setDelivery("");
    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, id: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || result.id !== requestId.current)
        throw new Error("save failed");
      setDelivery("sent");
    } catch {
      setDelivery("failed");
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="rl-contact-page" aria-labelledby="help-title">
      <div className="rl-contact-heading">
        <h1 id="help-title">{en ? "Contact us" : "ติดต่อเรา"}</h1>
        <p>
          {en
            ? "Your next river experience starts with a conversation."
            : "มีคำถามเกี่ยวกับค่ำคืนบนเรือ? คุยกับทีม River Life ได้เลย"}
        </p>
      </div>
      <div className="rl-contact-layout">
        <aside
          className="rl-contact-information"
          aria-labelledby="contact-info-title"
        >
          <div>
            <h2 id="contact-info-title">{en ? "Let’s talk" : "คุยกับเรา"}</h2>
            <p>
              {en
                ? "Sailing details, group bookings or a little help with your tickets."
                : "สอบถามรอบล่องเรือ จองแบบกลุ่ม หรือให้เราช่วยดูแลเรื่องบัตรของคุณ"}
            </p>
          </div>
          <div className="rl-contact-channels">
            <a
              href="https://line.me/R/ti/p/%40480xbltt"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              <span>
                <small>LINE OFFICIAL</small>
                <strong>RiverLife ChaoPhraya</strong>
                <span>@480xbltt</span>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61593323984060"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              <span>
                <small>FACEBOOK</small>
                <strong>River Life at Chao Phraya</strong>
                <span>{en ? "Message our team" : "ส่งข้อความถึงทีมงาน"}</span>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <p className="rl-contact-safety">
            <ShieldCheck aria-hidden="true" />
            {en
              ? "Never share passwords, OTPs or full payment-card details."
              : "ไม่ส่งรหัสผ่าน รหัส OTP หรือข้อมูลบัตรชำระเงินเต็มชุดผ่านข้อความ"}
          </p>
        </aside>
        <PolicyLinks language={language} />
        <form
          className="rl-contact-form"
          noValidate
          onSubmit={handleSubmit(prepare)}
          onChange={() => {
            if (delivery) requestId.current = crypto.randomUUID();
            setDelivery("");
          }}
        >
          <div className="rl-contact-fields">
            {(["firstName", "lastName", "email", "phone"] as const).map(
              (name) => (
                <div className="rl-contact-field" key={name}>
                  <label htmlFor={`contact-${name}`}>
                    {labels[name]}
                    {name !== "phone" && <span aria-hidden="true"> *</span>}
                  </label>
                  <input
                    id={`contact-${name}`}
                    type={
                      name === "email"
                        ? "email"
                        : name === "phone"
                          ? "tel"
                          : "text"
                    }
                    autoComplete={
                      {
                        firstName: "given-name",
                        lastName: "family-name",
                        email: "email",
                        phone: "tel",
                      }[name]
                    }
                    maxLength={name === "email" ? 254 : 80}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={
                      errors[name] ? `contact-${name}-error` : undefined
                    }
                    {...register(name, {
                      validate: (value) =>
                        name === "phone"
                          ? !value.trim() ||
                            (/^[+\d\s().-]+$/.test(value) &&
                              value.replace(/\D/g, "").length >= 7 &&
                              value.replace(/\D/g, "").length <= 15) ||
                            (en
                              ? "Enter a valid phone number."
                              : "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง")
                          : Boolean(value.trim()) || required,
                      ...(name === "email"
                        ? {
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: en
                                ? "Enter a valid email address."
                                : "กรุณากรอกอีเมลให้ถูกต้อง",
                            },
                          }
                        : {}),
                    })}
                  />
                  {errors[name] && (
                    <span
                      className="rl-contact-error"
                      id={`contact-${name}-error`}
                      role="alert"
                    >
                      {errors[name]?.message}
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
          <fieldset className="rl-contact-subject">
            <legend>
              {en ? "What can we help with?" : "ต้องการสอบถามเรื่องอะไร?"}
            </legend>
            <div>
              {subjects.map((subject, index) => (
                <label key={subject}>
                  <input
                    type="radio"
                    value={subject}
                    {...register("subject", { required: true })}
                  />
                  <span>{subjectLabels[language][index]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rl-contact-field">
            <label htmlFor="contact-message">
              {en ? "Message" : "ข้อความ"} <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="contact-message"
              rows={4}
              maxLength={1500}
              placeholder={
                en
                  ? "Tell us how we can help…"
                  : "บอกเราได้เลยว่าต้องการให้ช่วยเรื่องอะไร…"
              }
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? "contact-message-error" : undefined
              }
              {...register("message", {
                validate: (value) =>
                  value.trim().length >= 10 ||
                  (en
                    ? "Please write at least 10 characters."
                    : "กรุณาระบุรายละเอียดอย่างน้อย 10 ตัวอักษร"),
                maxLength: 1500,
              })}
            />
            {errors.message && (
              <span
                id="contact-message-error"
                className="rl-contact-error"
                role="alert"
              >
                {errors.message.message}
              </span>
            )}
          </div>
          <div className="rl-contact-submit">
            <p>
              {en
                ? "Send your enquiry directly to the River Life team."
                : "ส่งข้อมูลถึงทีม River Life ได้โดยตรง"}
            </p>
            <button type="submit" disabled={sending || delivery === "sent"}>
              {sending
                ? en
                  ? "Sending…"
                  : "กำลังส่ง…"
                : delivery === "sent"
                  ? en
                    ? "Sent"
                    : "ส่งแล้ว"
                  : en
                    ? "Send message"
                    : "ส่งข้อความ"}
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          {delivery && (
            <p
              role={delivery === "failed" ? "alert" : "status"}
              className={delivery === "failed" ? "rl-contact-error" : ""}
            >
              {delivery === "sent"
                ? en
                  ? "Message received. Our team will contact you using the details provided."
                  : "รับข้อความเรียบร้อยแล้ว ทีมงานจะติดต่อกลับตามข้อมูลที่คุณระบุ"
                : en
                  ? "Could not confirm delivery. Please retry; your information is still here."
                  : "ยังยืนยันการส่งไม่ได้ กรุณาลองใหม่ ข้อมูลที่กรอกยังอยู่ครบ"}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
