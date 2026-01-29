/**
 * 视频元数据存储
 * 使用 R2 存储 JSON 文件：每个视频对应一个 metadata.json 文件
 * 格式：{videoKey}.metadata.json
 */

import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {env} from "@/lib/env";
import {getR2Client} from "@/lib/r2/client";
import {locales, type Locale} from "@/i18n/locales";

export type VideoMetadata = {
  videoKey: string;
  locales: Record<Locale, {
    title: string;
    description: string;
    coverUrl?: string; // R2 中的封面图片路径
  }>;
  createdAt: string;
  updatedAt: string;
};

const METADATA_SUFFIX = ".metadata.json";

function getMetadataKey(videoKey: string): string {
  return `${videoKey}${METADATA_SUFFIX}`;
}

/**
 * 获取视频元数据
 */
export async function getVideoMetadata(videoKey: string): Promise<VideoMetadata | null> {
  try {
    if (!env.R2_BUCKET) {
      throw new Error("R2_BUCKET missing");
    }

    const client = getR2Client();
    const metadataKey = getMetadataKey(videoKey);

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: metadataKey,
    });

    const response = await client.send(command);
    const body = await response.Body?.transformToString();

    if (!body) {
      return null;
    }

    return JSON.parse(body) as VideoMetadata;
  } catch (e: any) {
    // 如果文件不存在，返回 null
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw e;
  }
}

/**
 * 保存视频元数据
 */
export async function saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
  if (!env.R2_BUCKET) {
    throw new Error("R2_BUCKET missing");
  }

  const client = getR2Client();
  const metadataKey = getMetadataKey(metadata.videoKey);

  // eslint-disable-next-line no-console
  console.log("[video-metadata/store] Saving metadata:", {
    videoKey: metadata.videoKey,
    metadataKey,
    locales: Object.keys(metadata.locales),
    localesWithTitle: Object.entries(metadata.locales)
      .filter(([_, data]) => data.title && data.title.trim() !== "")
      .map(([loc, data]) => ({locale: loc, title: data.title})),
  });

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: metadataKey,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: "application/json",
  });

  await client.send(command);
  
  // eslint-disable-next-line no-console
  console.log("[video-metadata/store] Metadata saved successfully:", metadataKey);
}

/**
 * 创建或更新视频元数据
 */
export async function upsertVideoMetadata(
  videoKey: string,
  locale: Locale,
  data: {
    title: string;
    description: string;
    coverUrl?: string;
  }
): Promise<VideoMetadata> {
  const existing = await getVideoMetadata(videoKey);
  const now = new Date().toISOString();

  let metadata: VideoMetadata;

  if (existing) {
    // 更新现有元数据
    metadata = {
      ...existing,
      locales: {
        ...existing.locales,
        [locale]: {
          title: data.title,
          description: data.description,
          coverUrl: data.coverUrl || existing.locales[locale]?.coverUrl,
        },
      },
      updatedAt: now,
    };
  } else {
    // 创建新元数据 - 只为当前语言创建，其他语言不创建（避免空元数据）
    const newLocales: Record<Locale, {title: string; description: string; coverUrl?: string}> = {} as any;
    // 只为当前语言创建元数据
    newLocales[locale] = {
      title: data.title,
      description: data.description,
      coverUrl: data.coverUrl,
    };
    // 其他语言初始化为空字符串（但不会在列表中显示，因为检查时会跳过）
    for (const loc of locales) {
      if (loc !== locale) {
        newLocales[loc] = {
          title: "",
          description: "",
          coverUrl: undefined,
        };
      }
    }

    metadata = {
      videoKey,
      locales: newLocales,
      createdAt: now,
      updatedAt: now,
    };
  }

  await saveVideoMetadata(metadata);
  return metadata;
}

/**
 * 批量获取视频元数据
 */
export async function getVideoMetadataBatch(videoKeys: string[]): Promise<Map<string, VideoMetadata>> {
  const results = new Map<string, VideoMetadata>();

  await Promise.all(
    videoKeys.map(async (key) => {
      const metadata = await getVideoMetadata(key);
      if (metadata) {
        results.set(key, metadata);
      }
    })
  );

  return results;
}
