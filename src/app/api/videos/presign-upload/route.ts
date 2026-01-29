import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {z} from "zod";
import {env} from "@/lib/env";
import {getR2Client} from "@/lib/r2/client";

const bodySchema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1).default("video/mp4"),
  // seconds
  expires: z.coerce.number().int().min(60).max(60 * 60).default(15 * 60),
});

export async function POST(req: Request) {
  try {
    if (!env.R2_BUCKET) {
      return Response.json({error: "R2_BUCKET missing"}, {status: 500});
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    const {key, contentType, expires} = parsed.data;
    const client = getR2Client();

    const signed = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      {expiresIn: expires},
    );

    return Response.json({url: signed, expiresIn: expires, key});
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[presign-upload] failed:", e);
    return Response.json({error: "Presign upload failed", message}, {status: 500});
  }
}

