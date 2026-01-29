"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

export default function AdminAuthCheck({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 检查认证状态
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            router.push("/admin/login");
          }
        } else {
          router.push("/admin/login");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[AdminAuthCheck] Failed to check auth:", e);
        router.push("/admin/login");
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-sm text-neutral-400">检查认证状态...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
