"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({password: password.trim()}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "登录失败");
      }

      // 登录成功，跳转到管理后台首页
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50">
      <div className="flex min-h-dvh items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-neutral-800 bg-neutral-900/30 p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">管理员登录</h1>
            <p className="text-sm text-neutral-400">请输入管理员密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                required
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px]"
                autoFocus
              />
            </div>

            {error && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 touch-manipulation min-h-[44px]"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
