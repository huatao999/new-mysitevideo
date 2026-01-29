"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      } else {
        alert("登出失败");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[LogoutButton] Failed to logout:", e);
      alert("登出失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md border border-neutral-700 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 disabled:opacity-50 touch-manipulation min-h-[44px]"
    >
      {loading ? "登出中..." : "登出"}
    </button>
  );
}
