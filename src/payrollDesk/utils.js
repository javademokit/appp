export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export const NAMES = { P: "Present", A: "Absent", H: "Half day", L: "Paid leave", W: "Weekly off" };
export const NEXT = { P: "A", A: "H", H: "L", L: "P" };
export const CODE_TO_STATUS = { P: "PRESENT", A: "ABSENT", H: "HALF_DAY", L: "PAID_LEAVE" };

export const EARN_TYPES = { PCT_BASIC: "% of basic", PCT_GROSS: "% of gross", FIXED: "Fixed ₹", BALANCE: "Balance (remainder)" };
export const DED_TYPES = { PCT_BASIC: "% of basic (with cap)", PCT_GROSS: "% of gross", FIXED: "Fixed ₹" };

/** Current month and the five before it, newest first. */
export function monthOptions() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const value = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: x.toLocaleString("en-IN", { month: "long", year: "numeric" }) });
  }
  return out;
}
