import QRCode from "qrcode";
import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createQRCode(token) {
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  const qrUrl = `${frontendUrl}/qr-access/${token}`;
  return await QRCode.toDataURL(qrUrl);
}
