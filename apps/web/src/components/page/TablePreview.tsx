import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Minus,
  Plus,
  X,
  Armchair,
} from "lucide-react";
import type { Language } from "../../data/i18n";
import {
  api,
  money,
  newToken,
  type Booking,
  type TableCatalogue,
} from "../../data/api";
import {
  previewStatus,
  previewTables,
  type PreviewDeck,
} from "../../data/tablePreview";
import VesselWorkspace, { DeckProfile } from "../booking/VesselWorkspace";
import DeckGallery from "../cruise/DeckGallery";
import "../../TablePreview.css";
import "../../VesselBooking.css";
const loadCatalogue = () => api<TableCatalogue>("/tables");

export default function TablePreview({
  language,
  onBack,
  isAuthenticated,
  onRequireLogin,
  onBooked,
}: {
  language: Language;
  onBack: () => void;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
  onBooked: (booking: Booking, accessToken: string) => void;
}) {
  const en = language === "en";
  const [deck, setDeck] = useState<PreviewDeck>("upper");
  const [guests, setGuests] = useState(4);
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [catalogue, setCatalogue] = useState<TableCatalogue | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<{
    fingerprint: string;
    key: string;
    token: string;
  } | null>(null);
  useEffect(() => {
    let stopped = false;
    const refresh = () =>
      loadCatalogue()
        .then((data) => {
          if (!stopped) {
            setCatalogue(data);
            setCheckoutError("");
          }
        })
        .catch(() => {
          if (!stopped) {
            setCatalogue(null);
            setCheckoutError(
              en
                ? "Unable to check tables. Please refresh before paying."
                : "ตรวจสอบโต๊ะไม่ได้ กรุณารีเฟรชก่อนชำระเงิน",
            );
          }
        });
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [en]);
  const allTables = previewTables.map((table) => {
    const entry = catalogue?.tables.find((item) => item.id === table.id);
    return entry
      ? { ...table, status: entry.status, seats: entry.seats }
      : table;
  });
  const tables = allTables.filter((table) => table.deck === deck);
  const chosen = allTables.filter((table) => selected.includes(table.id));
  const seats = chosen.reduce((sum, table) => sum + table.seats, 0);
  const total = chosen.reduce(
    (sum, table) =>
      sum +
      (catalogue?.tables.find((item) => item.id === table.id)?.price ?? 0),
    0,
  );
  const sameDeck = new Set(chosen.map((table) => table.deck)).size <= 1;
  const selectionAvailable = chosen.every(
    (table) => table.status === "available",
  );
  const canContinue =
    chosen.length > 0 &&
    seats >= guests &&
    sameDeck &&
    selectionAvailable &&
    catalogue?.enabled === true &&
    catalogue.demo === true &&
    total > 0;
  const demoSeatLimit = previewTables.reduce(
    (sum, table) => sum + table.seats,
    0,
  );
  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : allTables.find((table) => table.id === id)?.status === "available"
          ? [...current, id]
          : current,
    );
  };
  const createReservation = async () => {
    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }
    if (!canContinue || busy) return;
    setBusy(true);
    setCheckoutError("");
    const fingerprint = JSON.stringify({
      table_ids: [...selected].sort(),
      guest_count: guests,
      expected_total: total,
    });
    const nextAttempt =
      attempt?.fingerprint === fingerprint
        ? attempt
        : { fingerprint, key: crypto.randomUUID(), token: newToken() };
    setAttempt(nextAttempt);
    try {
      const booking = await api<Booking>(
        "/table-bookings",
        {
          method: "POST",
          headers: { "Idempotency-Key": nextAttempt.key },
          body: fingerprint,
        },
        nextAttempt.token,
      );
      onBooked(booking, nextAttempt.token);
    } catch (cause) {
      setCheckoutError((cause as Error).message);
      void loadCatalogue()
        .then(setCatalogue)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  const disclaimer = en
    ? "Demo layout and prices. Confirm to reserve tables for test checkout only; not actual boarding rights."
    : "ผังและราคาทดลอง ยืนยันแล้วจะสำรองโต๊ะเพื่อทดสอบชำระเงิน ไม่ใช่สิทธิ์ขึ้นเรือจริง";
  return (
    <section className="table-preview vessel-booking">
      <div className="vessel-page-heading">
        <div>
          <h1>{en ? "Choose your table" : "เลือกโต๊ะบนเรือ"}</h1>
          <p className="preview-subtitle">
            Unicorn Cruise ·{" "}
            {en
              ? "Choose a deck, then your table"
              : "เลือกชั้น แล้วเลือกโต๊ะของคุณ"}
          </p>
        </div>
        <div className="preview-notice">
          <Info size={17} />
          <span>
            {en
              ? "Illustrative layout · Test bookings only"
              : "ผังจำลอง · สำหรับทดลองจองเท่านั้น"}
          </span>
        </div>
      </div>
      <div className="preview-layout-notes vessel-reference-note">
        <a
          className="preview-reference-thumb"
          href="#preview-real-vessel"
          aria-label={
            en ? "See the reference vessel photos" : "ดูภาพอ้างอิงการจัดโต๊ะ"
          }
        >
          <img
            src={
              deck === "upper"
                ? "/images/boat/unicorn-supplied-upper-layout.webp"
                : "/images/boat/unicorn-supplied-lower-layout.webp"
            }
            alt={
              deck === "upper"
                ? en
                  ? "Upper deck: long table and side tables"
                  : "ชั้นบน: โต๊ะยาวและโต๊ะสองฝั่ง"
                : en
                  ? "Lower deck: central buffet"
                  : "ชั้นล่าง: บุฟเฟต์กลางห้อง"
            }
            width={1706}
            height={960}
          />
        </a>
        <h2>{en ? "Dining layout" : "พื้นที่และรูปแบบโต๊ะ"}</h2>
        <p>
          {deck === "upper"
            ? en
              ? "Upper deck: a central long-table run, separate tables on both sides and two aisles. 18 tables × 4 guests are demo fixtures; divisions of the long table await confirmation."
              : "ชั้นบน: โต๊ะยาวกลางลำ โต๊ะแยกสองฝั่ง และทางเดินสองแนว · 18 โต๊ะ × 4 คนเป็นข้อมูลทดลอง การแบ่งช่วงโต๊ะยาวยังรอยืนยัน"
            : en
              ? "Lower deck: a central buffet island, dining tables on both sides and two aisles. The 12 tables and their capacities are illustrative."
              : "ชั้นล่าง: ไลน์บุฟเฟต์กลางห้อง โต๊ะอาหารสองฝั่ง และทางเดินสองแนว · 12 โต๊ะและจำนวนคนต่อโต๊ะเป็นข้อมูลทดลอง"}
        </p>
        <a className="preview-photo-link" href="#preview-real-vessel">
          {en ? "Explore real vessel photos" : "ดูภาพจริงของเรือและพื้นที่นั่ง"}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
      <div className="preview-workspace">
        <div className="preview-plan">
          <VesselWorkspace
            deck={deck}
            onDeck={setDeck}
            tables={tables}
            selected={selected}
            onSelect={toggle}
            language={language}
          />
          <div className="preview-legend">
            {Object.entries(previewStatus).map(([state, label]) => (
              <span key={state}>
                <i className={`state-${state}`} />
                {label[language]}
              </span>
            ))}
          </div>
          <p className="preview-simulated">
            {en
              ? "U = upper deck · L = lower deck. "
              : "U = ชั้นบน · L = ชั้นล่าง "}
            {en
              ? "All availability, table IDs and capacities shown are simulated."
              : "สถานะว่าง หมายเลขโต๊ะ และจำนวนคนต่อโต๊ะทั้งหมดเป็นข้อมูลจำลอง"}
          </p>
        </div>
        <aside className="preview-summary">
          <h2>
            <Armchair size={24} />
            {en ? "Your tables" : "โต๊ะของคุณ"}
          </h2>
          <label htmlFor="preview-guests">
            {en ? "Number of guests" : "จำนวนผู้ร่วมเดินทาง"}
          </label>
          <div className="vessel-guest-stepper">
            <button
              type="button"
              aria-label={en ? "Fewer guests" : "ลดจำนวนคน"}
              disabled={guests <= 1}
              onClick={() => setGuests((v) => Math.max(1, v - 1))}
            >
              <Minus size={18} />
            </button>
            <input
              id="preview-guests"
              type="number"
              min={1}
              max={demoSeatLimit}
              value={guests}
              onChange={(event) =>
                setGuests(
                  Math.min(
                    demoSeatLimit,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                )
              }
            />
            <button
              type="button"
              aria-label={en ? "More guests" : "เพิ่มจำนวนคน"}
              disabled={guests >= demoSeatLimit}
              onClick={() => setGuests((v) => Math.min(demoSeatLimit, v + 1))}
            >
              <Plus size={18} />
            </button>
          </div>
          <h3>{en ? "Selected table(s)" : "โต๊ะที่เลือก"}</h3>
          <div className="preview-selected" aria-live="polite">
            {chosen.length ? (
              chosen.map((table) => (
                <div key={table.id}>
                  <span>
                    <strong>{table.id}</strong> · {table.seats}{" "}
                    {en ? "guests" : "คน"}
                    <small>
                      {table.deck === "upper"
                        ? en
                          ? "Upper deck"
                          : "ชั้นบน"
                        : en
                          ? "Lower deck"
                          : "ชั้นล่าง"}
                    </small>
                    {table.kind === "banquet" && (
                      <small>
                        {en
                          ? "Long-table section · demo"
                          : "ช่วงโต๊ะยาว · ตัวอย่าง"}
                      </small>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(table.id)}
                    aria-label={`${en ? "Remove" : "นำออก"} ${table.id}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p>
                {en
                  ? "Select an available table on the map or list."
                  : "กดโต๊ะว่างบนผัง หรือเลือกจากรายการ"}
              </p>
            )}
          </div>
          <p className="preview-seat-total">
            {en ? "Illustrative seats selected" : "ที่นั่งตัวอย่างที่เลือก"}:{" "}
            <strong>{seats}</strong> / {guests}
          </p>
          {chosen.length > 0 && catalogue && (
            <div className="preview-payment-total">
              <span>
                {en ? "Demo total · whole tables" : "ยอดทดลอง · จองเต็มโต๊ะ"}
              </span>
              <strong>{money(total)}</strong>
              <small>
                {chosen.length} {en ? "table(s)" : "โต๊ะ"} · {seats}{" "}
                {en ? "reserved seats" : "ที่นั่งที่สำรอง"} · {guests}{" "}
                {en ? "attending guests" : "ผู้ร่วมเดินทาง"}
              </small>
            </div>
          )}
          {!sameDeck && (
            <Alert severity="warning">
              {en
                ? "Choose tables on one deck per order. Book the other deck separately."
                : "เลือกโต๊ะในชั้นเดียวกันต่อคำสั่งซื้อ หากต้องการอีกชั้นให้จองแยกรายการ"}
            </Alert>
          )}
          {!selectionAvailable && (
            <Alert severity="warning">
              {en
                ? "Some selected tables are no longer available. Remove them and choose again."
                : "บางโต๊ะที่เลือกไม่ว่างแล้ว กรุณานำออกแล้วเลือกใหม่"}
            </Alert>
          )}
          {seats > 0 && seats < guests && (
            <p className="preview-shortfall" role="status">
              {en
                ? "Choose more tables to accommodate your party."
                : "กรุณาเลือกโต๊ะเพิ่มให้รองรับจำนวนคน"}
            </p>
          )}
          <div className="preview-local-only">
            <Info size={20} />
            <p>
              {en
                ? "Demo table booking · Prices are test-only. The server holds tables after you confirm. Never use real money."
                : "จองโต๊ะทดลอง · ราคาใช้ทดสอบ ระบบล็อกโต๊ะหลังยืนยันรายการ ห้ามชำระเงินจริง"}
            </p>
          </div>
          <Button
            variant="contained"
            disabled={!canContinue || busy}
            onClick={() => setReview(true)}
            endIcon={<ArrowRight size={18} />}
          >
            {en
              ? "Review tables and payment (test)"
              : "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)"}
          </Button>
          {!catalogue && (
            <p role="status">
              {en ? "Checking table availability…" : "กำลังตรวจสอบสถานะโต๊ะ…"}
            </p>
          )}
          {catalogue && !catalogue.enabled && (
            <Alert severity="warning">
              {en
                ? "Table checkout is not enabled."
                : "ยังไม่เปิดการชำระเงินสำหรับผังโต๊ะนี้"}
            </Alert>
          )}
          {checkoutError && !review && (
            <Alert severity="error">{checkoutError}</Alert>
          )}
          {chosen.length > 0 && (
            <button
              className="preview-reset"
              type="button"
              onClick={() => setSelected([])}
            >
              {en ? "Clear selection" : "ล้างรายการที่เลือก"}
            </button>
          )}
          <button className="preview-back" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            {en ? "Back to sailing details" : "กลับไปดูรายละเอียดรอบเรือ"}
          </button>
          <a className="preview-contact" href="/help/contact">
            {en
              ? "Questions about this event? Contact River Life"
              : "สอบถามงานและการจองกับ River Life"}
          </a>
        </aside>
      </div>
      <section
        className="vessel-deck-explainer"
        aria-label={
          en ? "Understand the two decks" : "รู้จักพื้นที่ทั้งสองชั้น"
        }
      >
        {(["upper", "lower"] as const).map((value) => (
          <button
            type="button"
            key={value}
            className={value === deck ? "is-active" : ""}
            onClick={() => setDeck(value)}
          >
            <img
              src={`/images/boat/unicorn-supplied-${value}-layout.webp`}
              alt={
                value === "upper"
                  ? en
                    ? "Actual open-air upper deck"
                    : "ภาพจริงดาดฟ้าเปิดโล่งชั้นบน"
                  : en
                    ? "Actual air-conditioned lower deck"
                    : "ภาพจริงห้องอาหารชั้นล่าง"
              }
              width={1706}
              height={960}
              loading="lazy"
            />
            <span>
              <DeckProfile deck={value} />
              <strong>
                {value === "upper"
                  ? en
                    ? "Upper deck · Open air"
                    : "ชั้นบน · ดาดฟ้าเปิดโล่ง"
                  : en
                    ? "Lower deck · Air-conditioned"
                    : "ชั้นล่าง · ห้องปรับอากาศ"}
              </strong>
              <small>
                {value === "upper"
                  ? en
                    ? "Central long table, side tables and proposed bow stage"
                    : "โต๊ะยาวกลางลำ โต๊ะสองฝั่ง และเวทีเสนอด้านหัวเรือ"
                  : en
                    ? "Side tables with a central buffet island"
                    : "โต๊ะอาหารสองฝั่ง พร้อมไลน์บุฟเฟต์กลางห้อง"}
              </small>
            </span>
          </button>
        ))}
      </section>
      <section id="preview-real-vessel" className="preview-real-vessel">
        <DeckGallery language={language} />
      </section>
      <details className="preview-research">
        <summary>
          {en ? "About this illustrated plan" : "เกี่ยวกับภาพจำลองและผังโต๊ะ"}
        </summary>
        <p>
          {en
            ? "This editable 3D cutaway is inspired by supplied Unicorn Cruise photos, not a measured reconstruction. The upper floor lifts away to reveal the lower dining room. Tables, stairs, the pilothouse and proposed bow stage are schematic; stage orientation is not established by the photos."
            : "โมเดล 3D นี้อ้างอิงภาพที่จัดส่งของ Unicorn Cruise ไม่ใช่การจำลองตามขนาดจริง ดาดฟ้าบนเปิดออกเพื่อให้เห็นห้องอาหารชั้นล่าง ตำแหน่งโต๊ะ บันได ห้องควบคุม และเวทีหัวเรือเป็นแบบเสนอ ภาพถ่ายยังไม่ยืนยันทิศทางของเวที"}
        </p>
        <p>
          {en
            ? "Real vessel photos show its usual atmosphere. River Life will announce the final tables, stage arrangement, prices and inclusions for each event."
            : "ภาพถ่ายจริงแสดงบรรยากาศทั่วไปของเรือ River Life จะประกาศผังโต๊ะ การจัดเวที ราคา และสิ่งที่รวมในบัตรสำหรับแต่ละงาน"}
        </p>
      </details>
      <Dialog
        open={review}
        onClose={() => {
          if (!busy) setReview(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="preview-review-title"
      >
        <DialogTitle id="preview-review-title">
          {en ? "Review tables and test payment" : "ตรวจสอบโต๊ะและยอดชำระทดลอง"}
        </DialogTitle>
        <DialogContent>
          <p>{disclaimer}</p>
          <p>
            {en ? "Tables" : "โต๊ะ"}: {selected.join(", ")}
          </p>
          <p>
            <strong>
              {en ? "Test total" : "ยอดชำระทดลอง"}: {money(total)}
            </strong>
          </p>
          <p>
            {en
              ? "Whole-table pricing: every table reserves four seats, even when fewer guests attend. Upper-deck pricing uses the current demo bow tariff; lower deck uses the current demo lower-deck tariff. Final event prices are unconfirmed."
              : "คิดราคาเต็มโต๊ะ โต๊ะละ 4 ที่นั่ง แม้เดินทางน้อยกว่า 4 คน ชั้นบนใช้อัตราทดลองหัวเรือและชั้นล่างใช้อัตราทดลองชั้นล่างจากระบบ ราคาจริงของงานยังไม่ยืนยัน"}
          </p>
          {checkoutError && <Alert severity="error">{checkoutError}</Alert>}
          <p>
            {guests} {en ? "guests" : "คน"} · {seats}{" "}
            {en ? "illustrative seats" : "ที่นั่งตัวอย่าง"}
          </p>
          {chosen.some((table) => table.kind === "banquet") && (
            <p>
              {en
                ? "Long-table divisions and guest counts are illustrative, pending River Life's final arrangement."
                : "การแบ่งช่วงโต๊ะยาวและจำนวนคนเป็นตัวอย่าง รอการจัดโต๊ะจริงจาก River Life"}
            </p>
          )}
          <p>
            {en
              ? "No booking, ticket, price or table hold has been created."
              : "ไม่มีการสร้างคำสั่งซื้อ ตั๋ว ราคา หรือการล็อกโต๊ะ"}
          </p>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setReview(false)}>
            {en ? "Continue editing" : "กลับไปปรับการเลือก"}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !canContinue}
            onClick={() => void createReservation()}
          >
            {busy
              ? en
                ? "Reserving tables…"
                : "กำลังสำรองโต๊ะ…"
              : !isAuthenticated
                ? en
                  ? "Log in to continue"
                  : "เข้าสู่ระบบเพื่อดำเนินการต่อ"
                : en
                  ? "Reserve tables and continue to payment (test)"
                  : "ยืนยันโต๊ะและไปชำระเงิน (ทดลอง)"}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
