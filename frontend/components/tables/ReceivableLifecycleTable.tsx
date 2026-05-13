"use client";

import { useReceivables } from "@/hooks/seller/useReceivables";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};
export default function ReceivableLifecycleTable({wallet,}: {wallet: WalletProps;}) {
  const { account } = wallet;

  const {
    receivables,
    loading,
    STATE_LABELS,
  } = useReceivables(account || undefined);

  if (!account) {
    return (
      <p className="hk-muted">
        Connect wallet to view receivables.
      </p>
    );
  }

  if (loading) {
    return <p className="hk-muted">Loading...</p>;
  }

  if (receivables.length === 0) {
    return (
      <p className="hk-muted">
        No receivables found.
      </p>
    );
  }

return (
  <div className="hk-table-wrap">
    <table className="hk-table">
      <thead>
        <tr>
          <th className="hk-th">Token ID</th>
          <th className="hk-th">Invoice</th>
          <th className="hk-th">Amount</th>
          <th className="hk-th">Due Date</th>
          <th className="hk-th">State</th>
        </tr>
      </thead>

      <tbody>
        {receivables.map((r) => (
          <tr
            key={r.tokenId}
            className="transition hover:bg-white/[0.03]"
          >
            <td className="hk-td">
              #{r.tokenId}
            </td>

            <td className="hk-td">
              {r.invoiceId}
            </td>

            <td className="hk-td">
              {(Number(r.faceAmount) / 1e6).toLocaleString()} USDC
            </td>

            <td className="hk-td">
              {new Date(r.dueDate * 1000).toLocaleDateString()}
            </td>

            <td className="hk-td">
              <span className="hk-pill">
                {STATE_LABELS[r.state]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

}
