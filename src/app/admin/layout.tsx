"use client";

import {usePathname} from "next/navigation";
import AdminAuthCheck from "./AdminAuthCheck";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // 登录页面不需要认证检查和布局包装
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 其他页面需要认证检查
  return (
    <AdminAuthCheck>
      <div className="min-h-dvh bg-neutral-950 text-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
      </div>
    </AdminAuthCheck>
  );
}
