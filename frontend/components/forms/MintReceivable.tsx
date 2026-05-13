"use client";

import { useState } from "react";
import { useReceivableNFT } from "@/hooks/seller/useReceivableNFT";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};
export default function MintReceivable({wallet,}: {wallet: WalletProps;}) {
  const { mintReceivable } = useReceivableNFT();
  const { account, connectWallet } = wallet;

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
    <div className="space-y-4">
      <h2 className="sr-only">Mint Receivable NFT</h2>

      <div className="space-y-3">
        {!account && (
          <button
            onClick={connectWallet}
            className="hk-btn-primary w-full"
          >
            Connect Wallet
          </button>
        )}

        <input
          type="text"
          placeholder="Payer address"
          className="hk-input"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        />

        <input
          type="number"
          placeholder="Face amount (USDC)"
          className="hk-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          type="date"
          className="hk-input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <input
          type="text"
          placeholder="Invoice Reference ID"
          className="hk-input"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
        />

        <button
          onClick={handleMint}
          disabled={loading}
          className="hk-btn-primary w-full"
        >
          {loading ? "Minting..." : "Mint Receivable"}
        </button>

        {txHash && (
          <p className="hk-success break-all">
            Success: {txHash.slice(0, 10)}...
          </p>
        )}

        {error && (
          <p className="hk-error break-all">{error}</p>
        )}
      </div>
    </div>
  );
}
