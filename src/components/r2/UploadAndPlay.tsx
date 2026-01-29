"use client";

import {useMemo, useState} from "react";

type PresignUploadResp = {url: string; expiresIn: number; key: string};
type PresignPlayResp = {url: string; expiresIn: number};

export default function UploadAndPlay({onReadyToPlay}: {onReadyToPlay: (url: string) => void}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "presigning" | "uploading" | "presigningPlay" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string>("");

  const suggestedKey = useMemo(() => {
    if (!file) return "";
    // Keep it simple: demo/<timestamp>-<filename>
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    return `demo/${Date.now()}-${safeName}`;
  }, [file]);

  async function handleUpload() {
    if (!file) return;

    setError(null);
    setStatus("presigning");

    try {
      const uploadKey = key.trim() || suggestedKey;
      if (!uploadKey) throw new Error("请先选择文件");

      const presignUpload = await fetch("/api/videos/presign-upload", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({key: uploadKey, contentType: file.type || "video/mp4"}),
      });
      if (!presignUpload.ok) throw new Error(`预签名上传失败：${presignUpload.status}`);
      const uploadJson = (await presignUpload.json()) as PresignUploadResp;

      setStatus("uploading");

      // Important: Only send headers that are in X-Amz-SignedHeaders
      // The presigned URL has X-Amz-SignedHeaders=host, so we should NOT send
      // checksum headers even if they appear in the URL query params
      // Sending unsigned headers causes signature mismatch (400 Bad Request)
      const putHeaders: Record<string, string> = {"Content-Type": file.type || "video/mp4"};

      const put = await fetch(uploadJson.url, {
        method: "PUT",
        headers: putHeaders,
        body: file,
      });
      if (!put.ok) throw new Error(`上传到 R2 失败：${put.status}`);

      setStatus("presigningPlay");

      const presignPlay = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(uploadJson.key)}`);
      if (!presignPlay.ok) throw new Error(`预签名播放失败：${presignPlay.status}`);
      const playJson = (await presignPlay.json()) as PresignPlayResp;

      onReadyToPlay(playJson.url);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "未知错误");
    }
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
      <div className="mb-2 text-sm font-semibold">上传到 R2 并播放（自检链路）</div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 md:col-span-1">
          <span className="text-xs text-neutral-300">选择视频文件</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs"
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs text-neutral-300">对象 Key（可留空自动生成）</span>
          <input
            value={key}
            placeholder={suggestedKey || "demo/<timestamp>-filename.mp4"}
            onChange={(e) => setKey(e.target.value)}
            className="block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || status === "presigning" || status === "uploading" || status === "presigningPlay"}
          className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
        >
          开始上传并播放
        </button>
        <div className="text-xs text-neutral-300">
          当前状态：{" "}
          <span className="font-mono">
            {status === "idle" && "idle"}
            {status === "presigning" && "presigning-upload"}
            {status === "uploading" && "uploading"}
            {status === "presigningPlay" && "presigning-play"}
            {status === "done" && "done"}
            {status === "error" && "error"}
          </span>
        </div>
        {error ? <div className="text-xs text-red-300">错误：{error}</div> : null}
      </div>

      <div className="mt-2 text-xs text-neutral-400">
        注意：浏览器直传到 R2 需要在 R2 bucket 配置 CORS（允许 PUT）。如果这里报 CORS，我会告诉你去哪点。
      </div>
    </section>
  );
}

