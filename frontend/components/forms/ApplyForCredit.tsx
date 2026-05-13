"use client";

import { useState } from "react";

import { useCreditFacility } from "@/hooks/seller/useCreditFacility";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};

export default function ApplyForCredit({
  wallet,
}: {
  wallet: WalletProps;
}) {

  const { account, connectWallet } = wallet;

  const { applyForCredit } = useCreditFacility();

  const [tokenId, setTokenId] = useState("");

  const [creditLimit, setCreditLimit] = useState("--");
  const [apr, setApr] = useState("--");
  const [advanceRate, setAdvanceRate] = useState("--");

  const [loading, setLoading] = useState(false);

  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleApply = async () => {
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const hash = await applyForCredit(Number(tokenId));

      setCreditLimit("Dynamic from protocol");
      setApr("Protocol APR");
      setAdvanceRate("Based on evaluation");

      setTxHash(hash);

    } catch (err) {
      console.error(err);

      setError("Failed to apply for credit");
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <button
        onClick={connectWallet}
        className="hk-btn-primary w-full"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="space-y-4">

      <input
        type="number"
        placeholder="Receivable NFT Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        className="hk-input"
      />

      <button
        onClick={handleApply}
        disabled={loading}
        className="hk-btn-primary w-full"
      >
        {loading ? "Applying..." : "Apply For Credit"}
      </button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="hk-stat-card">
          <p className="hk-stat-label">
            Credit Limit
          </p>

          <p className="mt-1 text-xl font-semibold text-white">
            {creditLimit}
          </p>
        </div>

        <div className="hk-stat-card">
          <p className="hk-stat-label">
            APR
          </p>

          <p className="mt-1 text-xl font-semibold text-white">
            {apr}
          </p>
        </div>

        <div className="hk-stat-card">
          <p className="hk-stat-label">
            Advance Rate
          </p>

          <p className="mt-1 text-xl font-semibold text-white">
            {advanceRate}
          </p>
        </div>

      </div>

      {txHash && (
        <p className="hk-success break-all">
          Success: {txHash}
        </p>
      )}

      {error && (
        <p className="hk-error">
          {error}
        </p>
      )}

    </div>
  );
}
