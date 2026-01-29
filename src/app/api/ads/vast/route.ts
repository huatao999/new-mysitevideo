import {getAdConfig} from "@/lib/ads/config";
import {z} from "zod";

const querySchema = z.object({
  position: z.enum(["pre-roll", "mid-roll", "post-roll"]),
});

/**
 * 获取指定位置的 VAST URL
 * 这个 API 用于在客户端需要实际 VAST URL 时调用
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json({error: "Invalid query", details: parsed.error.flatten()}, {status: 400});
    }

    const {position} = parsed.data;
    const config = getAdConfig();

    if (!config) {
      return Response.json({vastUrl: null, enabled: false});
    }

    let vastUrl: string | null = null;
    switch (position) {
      case "pre-roll":
        vastUrl = config.preRoll || null;
        break;
      case "mid-roll":
        vastUrl = config.midRoll || null;
        break;
      case "post-roll":
        vastUrl = config.postRoll || null;
        break;
    }

    return Response.json({
      vastUrl,
      enabled: !!vastUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[ads/vast] failed:", e);
    return Response.json({error: "Get VAST URL failed", message}, {status: 500});
  }
}
