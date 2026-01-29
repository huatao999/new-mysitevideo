"use client";

import {useState, useEffect, useRef} from "react";
import {useTranslations} from "next-intl";

type CommentSectionProps = {
  videoKey: string;
};

type Comment = {
  id: string;
  username: string;
  content: string;
  timestamp: number;
};

type CommentsResponse = {
  comments: Comment[];
  total: number;
  limit: number;
  offset: number;
};

export default function CommentSection({videoKey}: CommentSectionProps) {
  const t = useTranslations("video");
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 加载评论
  useEffect(() => {
    async function loadComments() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/videos/${encodeURIComponent(videoKey)}/comments?limit=50`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "加载评论失败");
        }

        const data = (await res.json()) as CommentsResponse;
        setComments(data.comments);
        setTotal(data.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "未知错误");
      } finally {
        setLoading(false);
      }
    }

    loadComments();
  }, [videoKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoKey)}/comments`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          username: username.trim() || undefined,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "发表评论失败");
      }

      const data = await res.json();
      // 添加新评论到列表顶部
      setComments((prev) => [data.comment, ...prev]);
      setTotal((prev) => prev + 1);
      setContent("");
      setUsername("");
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t("justNow");
    if (minutes < 60) {
      // 使用 next-intl 的参数传递方式
      try {
        return t("minutesAgo", {count: minutes});
      } catch {
        // 如果参数传递失败，使用字符串替换
        const template = t("minutesAgo");
        return template.replace(/{count}/g, String(minutes));
      }
    }
    if (hours < 24) {
      try {
        return t("hoursAgo", {count: hours});
      } catch {
        const template = t("hoursAgo");
        return template.replace(/{count}/g, String(hours));
      }
    }
    if (days < 7) {
      try {
        return t("daysAgo", {count: days});
      } catch {
        const template = t("daysAgo");
        return template.replace(/{count}/g, String(days));
      }
    }

    // 超过7天显示具体日期时间
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* 评论标题和添加按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("comments")} ({total})
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 touch-manipulation min-h-[44px]"
          >
            {t("addComment")}
          </button>
        )}
      </div>

      {/* 评论表单 */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
          <div className="grid gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-neutral-300">{t("username")} ({t("optional")})</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")}
                maxLength={50}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-neutral-300">{t("comment")}</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={1000}
                rows={4}
                required
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation resize-y"
              />
            </label>
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 touch-manipulation min-h-[44px]"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              disabled={submitting}
              className="rounded-md border border-neutral-700 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 disabled:opacity-50 touch-manipulation min-h-[44px]"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-neutral-400">{t("loadingComments")}</div>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">{t("noComments")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-50">{comment.username}</span>
                <span className="text-xs text-neutral-400">{formatDate(comment.timestamp)}</span>
              </div>
              <p className="text-sm text-neutral-300 whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
