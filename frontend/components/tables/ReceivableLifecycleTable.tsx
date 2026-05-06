"use client";

import { useReceivables } from "@/hooks/useReceivables";

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
      <p className="text-gray-500">
        Connect wallet to view receivables.
      </p>
    );
  }

  if (loading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (receivables.length === 0) {
    return (
      <p className="text-gray-500">
        No receivables found.
      </p>
    );
  }

return (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-3">Token ID</th>
          <th className="p-3">Invoice</th>
          <th className="p-3">Amount</th>
          <th className="p-3">Due Date</th>
          <th className="p-3">State</th>
        </tr>
      </thead>

      <tbody>
        {receivables.map((r) => (
          <tr
            key={r.tokenId}
            className="border-t"
          >
            <td className="p-3">
              #{r.tokenId}
            </td>

            <td className="p-3">
              {r.invoiceId}
            </td>

            <td className="p-3">
              {(Number(r.faceAmount) / 1e6).toLocaleString()} USDC
            </td>

            <td className="p-3">
              {new Date(r.dueDate * 1000).toLocaleDateString()}
            </td>

            <td className="p-3">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
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