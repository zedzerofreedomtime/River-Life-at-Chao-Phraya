export type OmiseConfig = {
  payment_gateway_enabled: boolean;
  public_key?: string;
  payment_methods?: string[];
  methods_unavailable?: boolean;
};
export const paymentMethodName = (method: string, en: boolean) => {
  const names: Record<string, string> = {
    promptpay: "PromptPay QR",
    card: en ? "Credit / debit card" : "บัตรเครดิต / เดบิต",
    mobile_banking_kbank: "K PLUS",
    mobile_banking_scb: "SCB EASY",
    mobile_banking_bbl: "Bangkok Bank",
    mobile_banking_bay: "Krungsri KMA",
    mobile_banking_ktb: "Krungthai NEXT",
    rabbit_linepay: "Rabbit LINE Pay",
    truemoney_jumpapp: "TrueMoney",
    shopeepay: "ShopeePay",
    grabpay: "GrabPay",
    alipay: "Alipay",
    alipay_cn: "Alipay CN",
    installment: en ? "Card installments" : "ผ่อนชำระผ่านบัตร",
    googlepay: "Google Pay",
  };
  return names[method] ?? method;
};
export function checkoutMethods(config: OmiseConfig): string[] {
  return [
    ...new Set(
      (config.payment_methods ?? ["promptpay"]).map((m) =>
        m.startsWith("installment_")
          ? "installment"
          : m === "shopeepay_jumpapp"
            ? "shopeepay"
            : m,
      ),
    ),
  ];
}
type OmiseCard = {
  configure: (options: { publicKey: string }) => void;
  open: (options: {
    amount: number;
    currency: string;
    locale: string;
    defaultPaymentMethod: string;
    otherPaymentMethods: string;
    frameLabel: string;
    onCreateTokenSuccess: (nonce: string) => void;
    onFormClosed: () => void;
  }) => void;
};
declare global {
  interface Window {
    OmiseCard?: OmiseCard;
  }
}
let scriptLoad: Promise<OmiseCard> | undefined;
export function loadOmiseCard(): Promise<OmiseCard> {
  if (window.OmiseCard) return Promise.resolve(window.OmiseCard);
  if (!scriptLoad)
    scriptLoad = new Promise<OmiseCard>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.omise.co/omise.js";
      script.async = true;
      const failed = () => {
        script.remove();
        scriptLoad = undefined;
        reject(new Error("โหลดฟอร์ม Omise ไม่สำเร็จ กรุณาลองใหม่"));
      };
      script.onload = () =>
        window.OmiseCard ? resolve(window.OmiseCard) : failed();
      script.onerror = failed;
      document.head.append(script);
    });
  return scriptLoad;
}
