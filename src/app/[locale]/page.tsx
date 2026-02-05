import {useTranslations} from "next-intl";
import HomeClient from "./HomeClient";
import AdStatus from "@/components/ads/AdStatus";
import {Suspense} from "react";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-neutral-300">{t("subtitle")}</p>
      </div>

      {/* 广告状态显示 */}
      <AdStatus />

      <Suspense>
        <HomeClient />
      </Suspense>

      {/* 默认测试播放器已移除 - 使用上方的播放测试功能 */}
    </div>
  );
}

