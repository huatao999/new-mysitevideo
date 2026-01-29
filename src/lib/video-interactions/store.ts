/**
 * 视频互动数据存储
 * 当前使用内存存储（开发环境）
 * 生产环境应替换为数据库（如 PostgreSQL、MongoDB 等）
 */

type LikeData = {
  videoKey: string;
  userId: string; // 使用 IP 或 session ID 作为临时用户标识
  timestamp: number;
};

type CommentData = {
  id: string;
  videoKey: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
};

// 内存存储（仅用于开发）
const likesStore = new Map<string, Set<string>>(); // videoKey -> Set<userId>
const commentsStore = new Map<string, CommentData[]>(); // videoKey -> CommentData[]

/**
 * 获取视频的点赞数
 */
export function getLikeCount(videoKey: string): number {
  return likesStore.get(videoKey)?.size || 0;
}

/**
 * 检查用户是否已点赞
 */
export function hasUserLiked(videoKey: string, userId: string): boolean {
  return likesStore.get(videoKey)?.has(userId) || false;
}

/**
 * 切换点赞状态（点赞/取消点赞）
 */
export function toggleLike(videoKey: string, userId: string): {liked: boolean; count: number} {
  if (!likesStore.has(videoKey)) {
    likesStore.set(videoKey, new Set());
  }

  const userLikes = likesStore.get(videoKey)!;
  const wasLiked = userLikes.has(userId);

  if (wasLiked) {
    userLikes.delete(userId);
  } else {
    userLikes.add(userId);
  }

  return {
    liked: !wasLiked,
    count: userLikes.size,
  };
}

/**
 * 获取视频的评论列表
 */
export function getComments(videoKey: string, limit?: number, offset?: number): CommentData[] {
  const comments = commentsStore.get(videoKey) || [];
  const sorted = comments.sort((a, b) => b.timestamp - a.timestamp); // 最新的在前

  if (offset !== undefined || limit !== undefined) {
    const start = offset || 0;
    const end = limit !== undefined ? start + limit : undefined;
    return sorted.slice(start, end);
  }

  return sorted;
}

/**
 * 添加评论
 */
export function addComment(
  videoKey: string,
  userId: string,
  username: string,
  content: string,
): CommentData {
  if (!commentsStore.has(videoKey)) {
    commentsStore.set(videoKey, []);
  }

  const comment: CommentData = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    videoKey,
    userId,
    username: username.trim() || "Anonymous",
    content: content.trim(),
    timestamp: Date.now(),
  };

  const comments = commentsStore.get(videoKey)!;
  comments.push(comment);

  return comment;
}

/**
 * 获取评论总数
 */
export function getCommentCount(videoKey: string): number {
  return commentsStore.get(videoKey)?.length || 0;
}
