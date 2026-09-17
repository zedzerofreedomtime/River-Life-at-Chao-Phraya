import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { CircleCheckBig, Ticket } from "lucide-react";
import { api, money, type Booking } from "./api";
import { FlowSteps } from "./Payment";

export default function BookingSuccess({
  initial,
  initialToken,
  onOpenTickets,
  onOpenOrders,
}: {
  initial: Booking | null;
  initialToken: string;
  onOpenTickets: (booking: Booking) => void;
  onOpenOrders: () => void;
}) {
  const [booking, setBooking] = useState(initial);
  const [error, setError] = useState("");
  const token =
    initialToken || sessionStorage.getItem("riverlife.booking.token") || "";

  useEffect(() => {
    const id = initial?.id || sessionStorage.getItem("riverlife.booking.id");
    if (!id || !token) return;
    void api<Booking>(`/bookings/${encodeURIComponent(id)}`, {}, token)
      .then(setBooking)
      .catch((cause: Error) => setError(cause.message));
  }, [initial?.id, token]);

  return (
    <section className="flow-page success-page">
      <FlowSteps activeStep={3} />
      <div className="success-card">
        <CircleCheckBig aria-hidden="true" />
        <h1>ทำรายการสำเร็จ</h1>
        {error && <Alert severity="error">{error}</Alert>}
        {!booking && !error && <p>กำลังเปิดรายการของคุณ…</p>}
        {booking && (
          <>
            <p>
              คำสั่งซื้อของคุณได้รับการยืนยันแล้ว และออก QR Ticket ให้เรียบร้อย
            </p>
            <dl>
              <div>
                <dt>รหัสคำสั่งซื้อ</dt>
                <dd>#{booking.id.toUpperCase()}</dd>
              </div>
              <div>
                <dt>รายการ</dt>
                <dd>
                  โซน {booking.zone_id} · {booking.quantity} ใบ
                </dd>
              </div>
              <div>
                <dt>ยอดชำระ</dt>
                <dd>{money(booking.total)}</dd>
              </div>
            </dl>
            <div className="success-actions">
              <Button
                variant="contained"
                size="large"
                startIcon={<Ticket size={19} />}
                onClick={() => onOpenTickets(booking)}
              >
                เปิด QR Ticket
              </Button>
              <Button variant="outlined" onClick={onOpenOrders}>
                ดูคำสั่งซื้อของฉัน
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
