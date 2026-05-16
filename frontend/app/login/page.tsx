"use client";

import { useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { account, network, connectWallet } = useWallet();
  const [role, setRole] = useState("");
  const router = useRouter();

  const isSepolia = network === 11155111;

  const handleEnter = () => {
    if (!account) return alert("Connect wallet first");
    if (!isSepolia) return alert("Switch to Sepolia");
    if (!role) return alert("Select role");

    router.push(`/dashboard/${role}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_28rem),radial-gradient(circle_at_80%_70%,rgba(148,163,184,0.12),transparent_26rem)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="hk-hero hk-fade-in relative z-10 w-full max-w-5xl">
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6 text-left">
            <div className="hk-pill">Sepolia DeFi Payment Protocol</div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                HKPayFi
              </h1>

              <p className="max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
                Tokenized receivables, credit facilities, and liquidity
                controls in a clean on-chain payment dashboard.
              </p>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="hk-stat-card">
                <p className="hk-stat-label">Network</p>
                <p className="mt-2 text-lg font-semibold text-white">Sepolia</p>
              </div>

              <div className="hk-stat-card">
                <p className="hk-stat-label">Roles</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  LP / Seller / Admin
                </p>
              </div>

              <div className="hk-stat-card">
                <p className="hk-stat-label">Experience</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Protocol Console
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6">
            <div className="mb-6 text-left">
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Wallet Access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Enter dashboard
              </h2>
            </div>

            <button
              onClick={connectWallet}
              className="hk-btn-primary mb-4 w-full"
            >
              Connect MetaMask
            </button>

            {account && (
              <div className="space-y-4">
                <div className="hk-panel-subtle space-y-2 text-left">
                  <p className="break-all text-sm text-neutral-300">
                    <b className="text-white">Address:</b> {account}
                  </p>

                  <p className="text-sm text-neutral-300">
                    <b className="text-white">Network:</b>{" "}
                    {isSepolia ? "Sepolia Ready" : "Wrong Network"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["lp", "seller", "admin"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                        role === r
                          ? "border-white bg-white text-black shadow-lg shadow-white/10"
                          : "border-white/10 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.08]"
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleEnter}
                  disabled={!account || !isSepolia || !role}
                  className="hk-btn-primary w-full"
                >
                  Enter Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
