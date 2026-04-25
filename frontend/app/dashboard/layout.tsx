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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 text-white p-5">
        <h2 className="text-xl font-bold mb-6">HKPayFi</h2>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/dashboard/lp")}
            className={`block w-full text-left px-3 py-2 rounded ${
              pathname.includes("/lp") ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            LP Dashboard
          </button>

          <button
            onClick={() => router.push("/dashboard/seller")}
            className={`block w-full text-left px-3 py-2 rounded ${
              pathname.includes("/seller") ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            Seller Dashboard
          </button>

          <button
            onClick={() => router.push("/dashboard/admin")}
            className={`block w-full text-left px-3 py-2 rounded ${
              pathname.includes("/admin") ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            Admin Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow p-4 flex justify-between items-center">
          <span className="font-semibold">Dashboard</span>

          {account && (
            <span className="text-sm text-gray-600">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}
        </div>

        {/* Page Content */}
        <div className="p-6 bg-gray-100 flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}