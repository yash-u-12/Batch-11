import QRCode from "qrcode";
import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export async function createQRCode(token, baseUrl) {
  const frontendUrl = baseUrl || getAppUrl();
  const qrUrl = `${frontendUrl}/qr-access/${token}`;
  return await QRCode.toDataURL(qrUrl);
}
