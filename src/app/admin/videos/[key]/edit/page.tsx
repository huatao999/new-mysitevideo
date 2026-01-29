"use client";

import {useEffect, useState, useMemo} from "react";
import {useRouter, useParams} from "next/navigation";
import Link from "next/link";
import {locales, type Locale} from "@/i18n/locales";

const LOCALE_NAMES: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  es: "Español",
  ko: "한국어",
  ja: "日本語",
  fr: "Français",
  ar: "العربية",
};

type VideoMetadata = {
  videoKey: string;
  locales: Record<Locale, {
    title: string;
    description: string;
    coverUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export default function AdminVideoEditPage() {
  const router = useRouter();
  const params = useParams();
  // 确保正确解码 URL 参数
  // Next.js 的 useParams 应该自动解码，但如果参数仍然是编码的，我们需要手动解码
  const videoKey = useMemo(() => {
    const rawKey = params.key as string;
    try {
      // 尝试解码，如果已经是解码后的字符串，decodeURIComponent 不会改变它
      // 但如果包含 % 字符且是有效的编码，会被正确解码
      return decodeURIComponent(rawKey);
    } catch (e) {
      // 如果解码失败（比如包含无效的编码），使用原始值
      return rawKey;
    }
  }, [params.key]);

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedLocale, setSelectedLocale] = useState<Locale>("en");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoKey) {
      loadMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoKey]);

  // 当 metadata 或 selectedLocale 改变时，更新表单字段
  useEffect(() => {
    if (!metadata) {
      // 如果 metadata 还没有加载，清空表单
      setTitle("");
      setDescription("");
      setCoverUrl(null);
      setCoverPreview(null);
      setCoverFile(null);
      return;
    }

    // 获取当前语言的元数据
    const localeData = metadata.locales[selectedLocale];
    
    // eslint-disable-next-line no-console
    console.log(`[Edit] Updating form for locale ${selectedLocale}:`, {
      metadataExists: !!metadata,
      videoKey: metadata.videoKey,
      selectedLocale,
      localeData,
      allLocales: Object.keys(metadata.locales),
      allLocalesData: Object.entries(metadata.locales).map(([loc, data]) => ({
        locale: loc,
        title: data.title,
        description: data.description,
      })),
      hasTitle: !!localeData?.title,
      hasDescription: !!localeData?.description,
      title: localeData?.title || "",
      description: localeData?.description || "",
    });
    
    // 更新表单字段 - 确保使用元数据中的实际值
    // 注意：即使 title 或 description 是空字符串，也要设置，因为空字符串表示该语言还没有设置元数据
    const titleValue = localeData?.title ?? "";
    const descriptionValue = localeData?.description ?? "";
    const coverUrlValue = localeData?.coverUrl ?? null;
    
    // eslint-disable-next-line no-console
    console.log(`[Edit] Setting form values for ${selectedLocale}:`, {
      title: titleValue,
      description: descriptionValue,
      coverUrl: coverUrlValue,
      titleLength: titleValue.length,
      descriptionLength: descriptionValue.length,
    });
    
    // 强制更新表单字段
    setTitle(titleValue);
    setDescription(descriptionValue);
    setCoverUrl(coverUrlValue);
    
    // 切换语言时，清空封面预览和文件选择
    setCoverPreview(null);
    setCoverFile(null);
  }, [metadata, selectedLocale]);

  async function loadMetadata() {
    try {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line no-console
      console.log("[Edit] Loading metadata for videoKey:", {
        rawKeyFromParams: params.key,
        decodedKey: videoKey,
        encodedForAPI: encodeURIComponent(videoKey),
        apiUrl: `/api/admin/videos/${encodeURIComponent(videoKey)}/metadata`,
      });

      const res = await fetch(`/api/admin/videos/${encodeURIComponent(videoKey)}/metadata`);
      if (!res.ok) {
        if (res.status === 404) {
          // 元数据不存在，创建默认结构
          const defaultMetadata: VideoMetadata = {
            videoKey,
            locales: locales.reduce((acc, loc) => {
              acc[loc] = {title: "", description: ""};
              return acc;
            }, {} as Record<Locale, {title: string; description: string; coverUrl?: string}>),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setMetadata(defaultMetadata);
        } else {
          throw new Error("加载元数据失败");
        }
      } else {
        const data = (await res.json()) as VideoMetadata;
        // eslint-disable-next-line no-console
        console.log("[Edit] Raw metadata from API:", JSON.stringify(data, null, 2));
        
        // 确保所有语言都有元数据字段（即使为空）
        const normalizedMetadata: VideoMetadata = {
          ...data,
          locales: locales.reduce((acc, loc) => {
            // 如果该语言有元数据，使用元数据；否则创建空结构
            const existing = data.locales[loc];
            acc[loc] = existing 
              ? {
                  // 使用 ?? 而不是 ||，这样空字符串也能保留
                  title: existing.title ?? "",
                  description: existing.description ?? "",
                  coverUrl: existing.coverUrl,
                }
              : {title: "", description: ""};
            return acc;
          }, {} as Record<Locale, {title: string; description: string; coverUrl?: string}>),
        };
        
        // eslint-disable-next-line no-console
        console.log("[Edit] Normalized metadata:", JSON.stringify(normalizedMetadata, null, 2));
        
        // 设置元数据，这会触发 useEffect 更新表单字段
        setMetadata(normalizedMetadata);
        
        // 注意：不要在这里立即更新表单字段，让 useEffect 来处理
        // 这样可以确保当用户切换语言时，表单字段能正确更新
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. 如果有新封面，先上传封面
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        const coverData = coverPreview?.replace(/^data:image\/\w+;base64,/, "") || "";
        const contentType = coverFile.type || "image/jpeg";

        const coverRes = await fetch(`/api/admin/videos/${encodeURIComponent(videoKey)}/cover`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            locale: selectedLocale,
            coverData,
            contentType,
          }),
        });

        if (!coverRes.ok) {
          throw new Error("上传封面失败");
        }

        const coverResult = await coverRes.json();
        finalCoverUrl = coverResult.coverUrl;
      }

      // 2. 保存元数据
      const res = await fetch(`/api/admin/videos/${encodeURIComponent(videoKey)}/metadata`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          locale: selectedLocale,
          title: title.trim(),
          description: description.trim(),
          coverUrl: finalCoverUrl || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("保存失败");
      }

      const updatedMetadata = (await res.json()) as VideoMetadata;
      // 确保所有语言都有元数据字段（即使为空）
      const normalizedMetadata: VideoMetadata = {
        ...updatedMetadata,
        locales: locales.reduce((acc, loc) => {
          acc[loc] = updatedMetadata.locales[loc] || {title: "", description: ""};
          return acc;
        }, {} as Record<Locale, {title: string; description: string; coverUrl?: string}>),
      };
      setMetadata(normalizedMetadata);
      setSuccess(true);
      setCoverFile(null);
      setCoverPreview(null);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function loadCoverPreview(url: string) {
      try {
        const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(url)}&expires=3600`);
        if (res.ok) {
          const data = await res.json();
          setCoverUrl(data.url);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load cover preview:", e);
      }
    }

    if (coverUrl && !coverFile && !coverPreview && !coverUrl.startsWith("http")) {
      // 如果 coverUrl 是 R2 key，需要获取预签名 URL
      loadCoverPreview(coverUrl);
    }
  }, [coverUrl, coverFile, coverPreview]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-sm text-neutral-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">编辑视频</h1>
          <p className="mt-1 text-sm text-neutral-400">视频 Key: {videoKey}</p>
        </div>
        <Link
          href="/admin/videos"
          className="rounded-md border border-neutral-700 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[44px]"
        >
          返回
        </Link>
      </div>

      {error && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-900/20 border border-green-800 px-4 py-3 text-sm text-green-300">
          保存成功！
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 space-y-6">
        {/* Language Selector */}
        <div>
          <label htmlFor="locale" className="mb-2 block text-sm font-medium">
            选择语言
          </label>
          <select
            id="locale"
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value as Locale)}
            disabled={saving}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px] disabled:opacity-50"
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {LOCALE_NAMES[loc]}
              </option>
            ))}
          </select>
        </div>

        {/* Cover Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium">视频封面</label>
          <div className="space-y-4">
            {(coverPreview || coverUrl) && (
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950">
                <img
                  src={coverPreview || coverUrl || ""}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={saving}
              className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black file:hover:bg-neutral-200 file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-neutral-400">支持 JPG、PNG、WebP 格式</p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium">
            视频标题（{LOCALE_NAMES[selectedLocale]}）
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`输入${LOCALE_NAMES[selectedLocale]}标题`}
            disabled={saving}
            maxLength={200}
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px] disabled:opacity-50"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium">
            视频简介（{LOCALE_NAMES[selectedLocale]}）
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`输入${LOCALE_NAMES[selectedLocale]}简介`}
            disabled={saving}
            maxLength={2000}
            rows={6}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation disabled:opacity-50"
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 touch-manipulation min-h-[44px]"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <Link
            href="/admin/videos"
            className="rounded-md border border-neutral-700 bg-neutral-900/50 px-6 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[44px]"
          >
            取消
          </Link>
        </div>
      </div>
    </div>
  );
}
