import {z} from "zod";
import {getLikeCount, hasUserLiked, toggleLike} from "@/lib/video-interactions/store";
import {getUserIdFromRequest} from "@/lib/video-interactions/user-id";

const paramsSchema = z.object({
  key: z.string().min(1),
});

const bodySchema = z.object({
  action: z.enum(["get", "toggle"]).default("get"),
});

/**
 * GET: 获取视频的点赞数和用户点赞状态
 * POST: 切换点赞状态
 */
export async function GET(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    const {key} = await params;
    const userId = getUserIdFromRequest(req);

    const likeCount = getLikeCount(key);
    const liked = hasUserLiked(key, userId);

    return Response.json({
      count: likeCount,
      liked,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[videos/likes] GET failed:", e);
    return Response.json({error: "Get likes failed", message}, {status: 500});
  }
}

export async function POST(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    const {key} = await params;
    const userId = getUserIdFromRequest(req);

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const action = parsed.success ? parsed.data.action : "toggle";

    if (action === "toggle") {
      const result = toggleLike(key, userId);
      return Response.json({
        liked: result.liked,
        count: result.count,
      });
    }

    // Default: get
    const likeCount = getLikeCount(key);
    const liked = hasUserLiked(key, userId);
    return Response.json({
      count: likeCount,
      liked,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[videos/likes] POST failed:", e);
    return Response.json({error: "Toggle like failed", message}, {status: 500});
  }
}
