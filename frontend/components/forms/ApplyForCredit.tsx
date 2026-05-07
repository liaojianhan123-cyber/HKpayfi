"use client";

import { useState } from "react";

import { useCreditFacility } from "@/hooks/useCreditFacility";

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
        className="w-full bg-black text-white py-3 rounded-lg"
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
        className="w-full border rounded-lg p-3"
      />

      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        {loading ? "Applying..." : "Apply For Credit"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-gray-50 rounded-xl p-4 border">
          <p className="text-sm text-gray-500">
            Credit Limit
          </p>

          <p className="text-xl font-semibold mt-1">
            {creditLimit}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border">
          <p className="text-sm text-gray-500">
            APR
          </p>

          <p className="text-xl font-semibold mt-1">
            {apr}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border">
          <p className="text-sm text-gray-500">
            Advance Rate
          </p>

          <p className="text-xl font-semibold mt-1">
            {advanceRate}
          </p>
        </div>

      </div>

      {txHash && (
        <p className="text-green-600 text-sm break-all">
          Success: {txHash}
        </p>
      )}

      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}

    </div>
  );
}