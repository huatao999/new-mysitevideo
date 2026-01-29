import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">管理后台</h1>
          <p className="mt-1 text-sm text-neutral-400">视频内容管理</p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/videos"
          className="group rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900/50 active:bg-neutral-900/60 touch-manipulation"
        >
          <div className="mb-2 flex items-center gap-3">
            <svg className="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold group-hover:text-white">视频管理</h2>
          </div>
          <p className="text-sm text-neutral-400">上传、编辑和删除视频</p>
        </Link>

        <Link
          href="/admin/upload"
          className="group rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900/50 active:bg-neutral-900/60 touch-manipulation"
        >
          <div className="mb-2 flex items-center gap-3">
            <svg className="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-lg font-semibold group-hover:text-white">上传视频</h2>
          </div>
          <p className="text-sm text-neutral-400">上传新视频到 R2 存储</p>
        </Link>
      </div>
    </div>
  );
}
