"use client";

import {useState, useEffect} from "react";
import {useTranslations} from "next-intl";

type LikeButtonProps = {
  videoKey: string;
};

type LikeData = {
  count: number;
  liked: boolean;
};

export default function LikeButton({videoKey}: LikeButtonProps) {
  const t = useTranslations("video");
  const [likeData, setLikeData] = useState<LikeData>({count: 0, liked: false});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载点赞数据
  useEffect(() => {
    async function loadLikes() {
      try {
        const res = await fetch(`/api/videos/${encodeURIComponent(videoKey)}/likes`);
        if (res.ok) {
          const data = (await res.json()) as LikeData;
          setLikeData(data);
        }
      } catch (e) {
        // 静默失败，不影响页面显示
        // eslint-disable-next-line no-console
        console.error("[LikeButton] Failed to load likes:", e);
      }
    }

    loadLikes();
  }, [videoKey]);

  async function handleToggleLike() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoKey)}/likes`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "toggle"}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "点赞失败");
      }

      const data = (await res.json()) as LikeData;
      // 确保状态正确更新
      setLikeData({
        count: data.count ?? 0,
        liked: data.liked ?? false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleLike}
        disabled={loading}
        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] ${
          likeData.liked
            ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600"
        } disabled:opacity-50`}
        aria-label={likeData.liked ? t("unlike") : t("like")}
      >
        {/* 心形图标 - 在数字前面 */}
        <svg
          className={`h-5 w-5 flex-shrink-0 ${likeData.liked ? "fill-current" : "fill-none"}`}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span className="font-semibold">{likeData.count}</span>
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
