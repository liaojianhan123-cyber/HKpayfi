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
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 text-center">
        <h1 className="text-2xl font-bold mb-6">HKPayFi</h1>

        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full mb-4"
        >
          Connect MetaMask
        </button>

        {account && (
          <>
            <p className="text-sm break-all mb-2">
              <b>Address:</b> {account}
            </p>

            <p className="text-sm mb-4">
              <b>Network:</b>{" "}
              {isSepolia ? "Sepolia ✅" : "Wrong Network ❌"}
            </p>

            <div className="flex justify-between mb-4">
              {["lp", "seller", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-lg border ${
                    role === r
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={handleEnter}
              disabled={!account || !isSepolia || !role}
              className="bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg w-full"
            >
              Enter Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}