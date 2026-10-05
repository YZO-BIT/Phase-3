import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { MAX_SCREENSHOT_BYTES, SCREENSHOT_TYPES } from "../registration-data";
import { HttpError } from "./errors";

export const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
export async function validateScreenshot(file: File) {
  if (!file.size) throw new HttpError(400, "Payment screenshot required. Choose a non-empty image.");
  if (file.size > MAX_SCREENSHOT_BYTES) throw new HttpError(413, "Payment screenshot must be no larger than 5MB.");
  if (!SCREENSHOT_TYPES.includes(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) throw new HttpError(400, "Choose a PNG, JPG, or WEBP payment screenshot.");
  const input = Buffer.from(await file.arrayBuffer());
  const formats: Record<string, { mime: string; ext: RegExp }> = { png: { mime: "image/png", ext: /\.png$/i }, jpeg: { mime: "image/jpeg", ext: /\.jpe?g$/i }, webp: { mime: "image/webp", ext: /\.webp$/i } };
  try {
    const image = sharp(input, { failOn: "warning", limitInputPixels: 16_000_000, animated: false });
    const meta = await image.metadata();
    const format = formats[meta.format || ""];
    if (!format || format.mime !== file.type || !format.ext.test(file.name) || !meta.width || !meta.height || (meta.pages ?? 1) > 1) throw new Error("Invalid image");
    const bytes = await image.rotate().resize({ width: 2400, height: 4000, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    if (!bytes.length || bytes.length > MAX_SCREENSHOT_BYTES) throw new Error("Invalid decoded size");
    return { bytes, hash: sha256(bytes), size: bytes.length };
  } catch { throw new HttpError(400, "Payment screenshot is not a valid PNG, JPG, or WEBP image, or exceeds the image dimension limit."); }
}
