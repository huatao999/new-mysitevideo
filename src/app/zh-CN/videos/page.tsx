// 【1. 注释多语言导入】只动这一行，保留VideosClient导入
// import {useTranslations} from "next-intl";
export const dynamic = "force-dynamic";
import VideosClient from "./VideosClient";

export default function VideosPage() {
  // 【2. 注释多语言函数调用】删掉t的定义，无其他改动
  // const t = useTranslations("videos");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {/* 【3/4. 替换翻译文本为中文】保留标签、样式class，只改内容 */}
        <h1 className="text-2xl font-semibold">视频列表</h1>
        <p className="text-sm text-neutral-300">浏览全部视频资源</p>
      </div>

      {/* 核心组件完全保留！广告/视频逻辑都在VideosClient里，不动 */}
      <VideosClient />
    </div>
  );
}

