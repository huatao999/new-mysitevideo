import {z} from "zod";
import {getComments, addComment, getCommentCount} from "@/lib/video-interactions/store";
import {getUserIdFromRequest} from "@/lib/video-interactions/user-id";

const paramsSchema = z.object({
  key: z.string().min(1),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const postBodySchema = z.object({
  username: z.string().min(1).max(50).optional(),
  content: z.string().min(1).max(1000),
});

/**
 * GET: 获取视频的评论列表
 * POST: 添加新评论
 */
export async function GET(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    const {key} = await params;
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

    if (!parsed.success) {
      return Response.json({error: "Invalid query", details: parsed.error.flatten()}, {status: 400});
    }

    const {limit, offset} = parsed.data;
    const comments = getComments(key, limit, offset);
    const total = getCommentCount(key);

    return Response.json({
      comments,
      total,
      limit: limit || comments.length,
      offset: offset || 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[videos/comments] GET failed:", e);
    return Response.json({error: "Get comments failed", message}, {status: 500});
  }
}

export async function POST(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    const {key} = await params;
    const userId = getUserIdFromRequest(req);

    const json = await req.json().catch(() => ({}));
    const parsed = postBodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    const {username, content} = parsed.data;
    const comment = addComment(key, userId, username || "Anonymous", content);

    return Response.json({
      comment,
      success: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[videos/comments] POST failed:", e);
    return Response.json({error: "Add comment failed", message}, {status: 500});
  }
}
