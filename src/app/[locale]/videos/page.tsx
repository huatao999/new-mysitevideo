import {useTranslations} from "next-intl";
import VideosClient from "./VideosClient";

export default function VideosPage() {
  const t = useTranslations("videos");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-neutral-300">{t("subtitle")}</p>
      </div>

      <VideosClient />
    </div>
  );
}
