"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import VideoPlayer from "@/components/video/VideoPlayer";
import LikeButton from "@/components/video/LikeButton";
import CommentSection from "@/components/video/CommentSection";

type PresignPlayResponse = {
  url: string;
  expiresIn: number;
};

export default function VideoDetailClient({videoKey}: {videoKey: string}) {
  const t = useTranslations("videos");
  const router = useRouter();
  const [playUrl, setPlayUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVideo() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(videoKey)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `加载视频失败：${res.status}`);
        }

        const data = (await res.json()) as PresignPlayResponse;
        setPlayUrl(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "未知错误");
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
  }, [videoKey]);

  const videoTitle = videoKey.split("/").pop()?.replace(/\.[^.]+$/, "") || videoKey;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200 touch-manipulation min-h-[44px] px-2 -ml-2 active:text-neutral-300"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("backToList")}
      </button>

      {/* Video Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{videoTitle}</h1>
        <p className="text-xs text-neutral-400">{videoKey}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-neutral-400">{t("loading")}</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Video Player */}
      {playUrl && !loading && !error && (
        <>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
            <VideoPlayer key={playUrl} src={playUrl} poster="" vastTagUrl={null} />
          </div>

          {/* Like Button */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
            <LikeButton videoKey={videoKey} />
          </div>

          {/* Comment Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
            <CommentSection videoKey={videoKey} />
          </div>
        </>
      )}
    </div>
  );
}
