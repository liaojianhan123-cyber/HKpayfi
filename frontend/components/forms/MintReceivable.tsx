"use client";

import { useState } from "react";
import { useReceivableNFT } from "@/hooks/useReceivableNFT";
import useWallet from "@/hooks/useWallet";

export default function MintReceivable() {
  const { mintReceivable } = useReceivableNFT();
  const { account, connectWallet } = useWallet();

  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleMint = async () => {
    try {
      if (!account) {
        await connectWallet();
        return;
      }

      setLoading(true);
      setError("");
      setTxHash("");

      const timestamp = Math.floor(new Date(dueDate).getTime() / 1000);

      const hash = await mintReceivable({
        payer,
        amount,
        dueDate: timestamp,
        invoiceId,
      });

      setTxHash(hash);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Mint failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h2 className="text-lg font-semibold mb-4">Mint Receivable NFT</h2>

      <div className="space-y-3">
        {!account && (
          <button
            onClick={connectWallet}
            className="w-full bg-black text-white py-2 rounded"
          >
            Connect Wallet
          </button>
        )}

        <input
          type="text"
          placeholder="Payer address"
          className="w-full border p-2 rounded"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        />

        <input
          type="number"
          placeholder="Face amount (USDC)"
          className="w-full border p-2 rounded"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          type="date"
          className="w-full border p-2 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <input
          type="text"
          placeholder="Invoice Reference ID"
          className="w-full border p-2 rounded"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
        />

        <button
          onClick={handleMint}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Minting..." : "Mint Receivable"}
        </button>

        {txHash && (
          <p className="text-green-600 text-sm">
            Success: {txHash.slice(0, 10)}...
          </p>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}