import {z} from "zod";

const envSchema = z.object({
  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 32,
      "R2_ACCESS_KEY_ID must be exactly 32 characters (S3-compatible access key, not Cloudflare API token)",
    ),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  // Optional: public CDN base, e.g. https://cdn.example.com
  PUBLIC_CDN_BASE_URL: z.string().url().optional(),
  // VAST Ad URLs (ExoClick / Adsterra)
  // 预留接口：申请成功后填入对应的 VAST Tag URL
  VAST_EXOCLICK_PRE_ROLL: z.string().url().optional(),
  VAST_EXOCLICK_MID_ROLL: z.string().url().optional(),
  VAST_EXOCLICK_POST_ROLL: z.string().url().optional(),
  VAST_ADSTERRA_PRE_ROLL: z.string().url().optional(),
  VAST_ADSTERRA_MID_ROLL: z.string().url().optional(),
  VAST_ADSTERRA_POST_ROLL: z.string().url().optional(),
  // Ad provider selection: "exoclick" | "adsterra" | "both" | "none"
  AD_PROVIDER: z.enum(["exoclick", "adsterra", "both", "none"]).default("none"),
  // Enable/disable ads globally
  ADS_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  // Admin authentication
  ADMIN_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse({
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  PUBLIC_CDN_BASE_URL: process.env.PUBLIC_CDN_BASE_URL,
  VAST_EXOCLICK_PRE_ROLL: process.env.VAST_EXOCLICK_PRE_ROLL,
  VAST_EXOCLICK_MID_ROLL: process.env.VAST_EXOCLICK_MID_ROLL,
  VAST_EXOCLICK_POST_ROLL: process.env.VAST_EXOCLICK_POST_ROLL,
  VAST_ADSTERRA_PRE_ROLL: process.env.VAST_ADSTERRA_PRE_ROLL,
  VAST_ADSTERRA_MID_ROLL: process.env.VAST_ADSTERRA_MID_ROLL,
  VAST_ADSTERRA_POST_ROLL: process.env.VAST_ADSTERRA_POST_ROLL,
  AD_PROVIDER: process.env.AD_PROVIDER,
  ADS_ENABLED: process.env.ADS_ENABLED,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
});

