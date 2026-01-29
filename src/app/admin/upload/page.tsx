"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {locales, type Locale} from "@/i18n/locales";

type UploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

const LOCALE_NAMES: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  es: "Español",
  ko: "한국어",
  ja: "日本語",
  fr: "Français",
  ar: "العربية",
};

type LocaleMetadata = {
  title: string;
  description: string;
};

export default function AdminUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [videoKey, setVideoKey] = useState("");
  const [selectedLocales, setSelectedLocales] = useState<Set<Locale>>(new Set());
  const [localeMetadata, setLocaleMetadata] = useState<Record<Locale, LocaleMetadata>>(() => {
    const initial: Record<Locale, LocaleMetadata> = {} as any;
    for (const loc of locales) {
      initial[loc] = {title: "", description: ""};
    }
    return initial;
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // 自动生成 key（文件名）
      if (!videoKey) {
        setVideoKey(selectedFile.name);
      }
      setError(null);
      setSuccess(false);
    }
  }

  function handleLocaleToggle(locale: Locale) {
    const newSelected = new Set(selectedLocales);
    if (newSelected.has(locale)) {
      // 如果取消选择，清空该语言的元数据
      setLocaleMetadata((prev) => ({
        ...prev,
        [locale]: {title: "", description: ""},
      }));
      newSelected.delete(locale);
    } else {
      newSelected.add(locale);
    }
    setSelectedLocales(newSelected);
  }

  function handleLocaleMetadataChange(locale: Locale, field: "title" | "description", value: string) {
    setLocaleMetadata((prev) => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !videoKey.trim() || uploading) return;

    setUploading(true);
    setError(null);
    setSuccess(false);
    setProgress(null);

    try {
      // 1. 获取预签名上传 URL
      const presignRes = await fetch("/api/videos/presign-upload", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          key: videoKey.trim(),
          contentType: file.type || "video/mp4",
          expires: 900, // 15 分钟
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error || "获取上传 URL 失败");
      }

      const {url} = await presignRes.json();

      // 2. 上传文件到 R2
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`上传失败：HTTP ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("上传失败：网络错误"));
        });

        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 3. 为每个选中的语言创建元数据（必须保存，即使标题为空也要用 videoKey 作为标题）
      if (selectedLocales.size > 0) {
        try {
          // 为每个选中的语言保存元数据
          const saveResults = await Promise.all(
            Array.from(selectedLocales).map(async (locale) => {
              const meta = localeMetadata[locale];
              // 使用用户输入的标题，如果为空则使用 videoKey
              const title = meta.title.trim() || videoKey.trim();
              const description = meta.description.trim();

              // eslint-disable-next-line no-console
              console.log(`[Upload] Saving metadata for locale ${locale}:`, {
                title,
                description,
                videoKey: videoKey.trim(),
              });

              // 始终保存元数据（即使描述为空，标题也会使用 videoKey）
              const res = await fetch(`/api/admin/videos/${encodeURIComponent(videoKey.trim())}/metadata`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                  locale,
                  title,
                  description,
                }),
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(`保存 ${locale} 元数据失败: ${res.status} - ${errorData.error || "未知错误"}`);
              }

              const savedMetadata = await res.json();
              // eslint-disable-next-line no-console
              console.log(`[Upload] Saved metadata for locale ${locale}:`, savedMetadata);
              
              return savedMetadata;
            })
          );
          
          // eslint-disable-next-line no-console
          console.log("[Upload] All metadata saved:", saveResults);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Failed to save metadata:", e);
          // 不影响上传成功，但记录错误
          setError(`视频上传成功，但保存元数据时出错: ${e instanceof Error ? e.message : "未知错误"}`);
        }
      }

      setSuccess(true);
      setFile(null);
      setVideoKey("");
      setSelectedLocales(new Set());
      setLocaleMetadata(() => {
        const reset: Record<Locale, LocaleMetadata> = {} as any;
        for (const loc of locales) {
          reset[loc] = {title: "", description: ""};
        }
        return reset;
      });
      setProgress(null);

      // 3 秒后跳转到视频管理页面
      setTimeout(() => {
        router.push("/admin/videos");
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">上传视频</h1>
          <p className="mt-1 text-sm text-neutral-400">上传视频文件到 Cloudflare R2</p>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-neutral-700 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[44px]"
        >
          返回
        </Link>
      </div>

      <form onSubmit={handleUpload} className="space-y-6 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="file" className="mb-2 block text-sm font-medium">
              选择视频文件
            </label>
            <input
              id="file"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              required
              disabled={uploading}
              className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black file:hover:bg-neutral-200 file:cursor-pointer disabled:opacity-50"
            />
            {file && (
              <p className="mt-2 text-xs text-neutral-400">
                文件大小: {(file.size / 1024 / 1024).toFixed(2)} MB | 类型: {file.type || "未知"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="key" className="mb-2 block text-sm font-medium">
              视频 Key（R2 中的文件名）
            </label>
            <input
              id="key"
              type="text"
              value={videoKey}
              onChange={(e) => setVideoKey(e.target.value)}
              placeholder="例如: videos/episode1.mp4"
              required
              disabled={uploading}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px] disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-neutral-400">建议使用有意义的文件名，如 videos/episode1.mp4</p>
          </div>

          {/* Language Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              目标语言（可多选）
            </label>
            <div className="flex flex-wrap gap-3 rounded-md border border-neutral-700 bg-neutral-950 p-3">
              {locales.map((locale) => (
                <label
                  key={locale}
                  className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] min-w-[100px] px-3 py-2 rounded hover:bg-neutral-900/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocales.has(locale)}
                    onChange={() => handleLocaleToggle(locale)}
                    disabled={uploading}
                    className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-white focus:ring-2 focus:ring-white focus:ring-offset-0 focus:ring-offset-neutral-950 disabled:opacity-50 flex-shrink-0"
                  />
                  <span className="text-sm text-neutral-50 whitespace-nowrap">{LOCALE_NAMES[locale]}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-400">选择一个或多个语言，视频将在所选语言的界面中显示</p>
          </div>

          {/* Metadata for Selected Languages */}
          {Array.from(selectedLocales).map((locale) => (
            <div key={locale} className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-950/50 p-4">
              <div className="text-sm font-medium text-neutral-300">{LOCALE_NAMES[locale]} 元数据</div>
              
              <div>
                <label htmlFor={`title-${locale}`} className="mb-2 block text-xs font-medium text-neutral-400">
                  视频标题
                </label>
                <input
                  id={`title-${locale}`}
                  type="text"
                  value={localeMetadata[locale].title}
                  onChange={(e) => handleLocaleMetadataChange(locale, "title", e.target.value)}
                  placeholder={`输入${LOCALE_NAMES[locale]}标题`}
                  disabled={uploading}
                  maxLength={200}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px] disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-neutral-400">可选，可在上传后编辑</p>
              </div>

              <div>
                <label htmlFor={`description-${locale}`} className="mb-2 block text-xs font-medium text-neutral-400">
                  视频简介
                </label>
                <textarea
                  id={`description-${locale}`}
                  value={localeMetadata[locale].description}
                  onChange={(e) => handleLocaleMetadataChange(locale, "description", e.target.value)}
                  placeholder={`输入${LOCALE_NAMES[locale]}简介`}
                  disabled={uploading}
                  maxLength={2000}
                  rows={3}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-neutral-400">可选，可在上传后编辑</p>
              </div>
            </div>
          ))}
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">上传进度</span>
              <span className="font-semibold">{progress.percentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{width: `${progress.percentage}%`}}
              />
            </div>
            <p className="text-xs text-neutral-400">
              {((progress.loaded / 1024 / 1024).toFixed(2))} MB / {((progress.total / 1024 / 1024).toFixed(2))} MB
            </p>
          </div>
        )}

        {error && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}

        {success && (
          <div className="rounded-md bg-green-900/20 border border-green-800 px-4 py-3 text-sm text-green-300">
            上传成功！3 秒后自动跳转到视频管理页面...
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!file || !videoKey.trim() || uploading || selectedLocales.size === 0}
            className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 touch-manipulation min-h-[44px]"
          >
            {uploading ? "上传中..." : "开始上传"}
          </button>
          <Link
            href="/admin/videos"
            className="rounded-md border border-neutral-700 bg-neutral-900/50 px-6 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[44px]"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
