import {notFound} from "next/navigation";
import VideoDetailClient from "./VideoDetailClient";

type PageProps = {
  params: Promise<{locale: string; key: string}>;
};

export default async function VideoDetailPage({params}: PageProps) {
  const {key: encodedKey} = await params;
  const key = decodeURIComponent(encodedKey);

  if (!key) {
    notFound();
  }

  return <VideoDetailClient videoKey={key} />;
}
