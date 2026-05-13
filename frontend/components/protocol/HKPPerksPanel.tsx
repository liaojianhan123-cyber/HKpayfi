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
      <p className="hk-muted">
        Connect wallet to view
        HKP perks
      </p>
    );
  }

  if (loading || !perks) {
    return (
      <p className="hk-muted">
        Loading HKP perks...
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Status */}
      <div className="hk-panel-subtle">

        <h3 className="mb-4 font-semibold text-white">
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
      <div className="hk-panel-subtle">

        <h3 className="mb-4 font-semibold text-white">
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
      <div className="hk-warning">

        <p className="text-sm leading-7 text-neutral-300">
          HKP perks are
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
