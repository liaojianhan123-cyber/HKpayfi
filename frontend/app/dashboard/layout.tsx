"use client";

import { ReactNode } from "react";
import useWallet from "@/hooks/useWallet";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { account } = useWallet();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="relative isolate min-h-screen bg-black text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.10),transparent_28rem),radial-gradient(circle_at_90%_20%,rgba(148,163,184,0.10),transparent_24rem),linear-gradient(135deg,#020202,#090909_52%,#111111)]" />

      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="border-b border-white/10 bg-black/70 p-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5 flex items-center justify-between lg:mb-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Protocol
              </p>
              <h2 className="text-xl font-semibold text-white">HKPayFi</h2>
            </div>

            <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.75)]" />
          </div>

          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:space-y-2">
            <button
              onClick={() => router.push("/dashboard/lp")}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                pathname.includes("/lp")
                  ? "border-white bg-white text-black shadow-lg shadow-white/10"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              LP Dashboard
            </button>

            <button
              onClick={() => router.push("/dashboard/seller")}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                pathname.includes("/seller")
                  ? "border-white bg-white text-black shadow-lg shadow-white/10"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Seller Dashboard
            </button>

            <button
              onClick={() => router.push("/dashboard/admin")}
              className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                pathname.includes("/admin")
                  ? "border-white bg-white text-black shadow-lg shadow-white/10"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Admin Dashboard
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 border-b border-white/10 bg-black/65 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Dashboard
              </span>

              {account && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-neutral-300">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
