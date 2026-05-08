"use client";

import useHKPPerks from "@/hooks/seller/useHKPPerks";

type Props = {
  account?: string | null;
};

export default function HKPPerksPanel({
  account,
}: Props) {
  const {
    perks,
    loading,
  } = useHKPPerks(
    account || undefined
  );

  if (!account) {
    return (
      <p className="text-gray-500">
        Connect wallet to view
        HKP perks
      </p>
    );
  }

  if (loading || !perks) {
    return (
      <p className="text-gray-500">
        Loading HKP perks...
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Status */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">

        <h3 className="font-semibold text-blue-700 mb-4">
          HKP Holder Status
        </h3>

        <div className="space-y-2">

          <p>
            HKP Balance:{" "}
            <b>
              {perks.balance} HKP
            </b>
          </p>

          <p>
            Holder Status:{" "}
            <b>
              {perks.isHolder
                ? "Eligible"
                : "Not Eligible"}
            </b>
          </p>

        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gray-50 border p-4 rounded-xl">

        <h3 className="font-semibold mb-4">
          Snapshot Benefits
        </h3>

        <div className="space-y-2">

          <p>
            APR Discount:{" "}
            <b>
              -{
                perks.aprDiscount
              }
              %
            </b>
          </p>

          <p>
            Grace Extension:{" "}
            <b>
              +
              {
                perks.graceBonusDays
              }{" "}
              days
            </b>
          </p>

        </div>

      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">

        <p className="text-sm text-yellow-800 leading-7">
          ⚠️ HKP perks are
          snapshotted at the
          time of first
          drawdown.
          <br />
          Buying HKP after
          drawdown will NOT
          reduce APR or extend
          grace periods for an
          existing loan.
        </p>

      </div>

    </div>
  );
}