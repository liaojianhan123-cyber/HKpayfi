"use client";

import useRiskMetrics
  from "@/hooks/lp/useRiskMetrics";

export default function RiskPanel() {

  const {
    loading,
    totalLosses,
    totalBorrowed,
    defaultedLoans,
  } = useRiskMetrics();

  if (loading) {
    return (
      <p className="hk-muted">
        Loading risk metrics...
      </p>
    );
  }

  return (

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

      {/* Total Losses */}
      <div
        className="hk-stat-card"
      >

        <h3
          className="mb-2 font-semibold text-white"
        >
          Total Losses
        </h3>

        <p
          className="mb-2 text-4xl font-semibold text-white"
        >
          {totalLosses} USDC
        </p>

        <p className="hk-muted">
          Cumulative realized LP losses
        </p>

      </div>

      {/* Defaulted Loans */}
      <div
        className="hk-stat-card"
      >

        <h3
          className="mb-2 font-semibold text-white"
        >
          Defaulted Loans
        </h3>

        <p
          className="mb-2 text-4xl font-semibold text-white"
        >
          {defaultedLoans}
        </p>

        <p className="hk-muted">
          Borrowers currently in default
        </p>

      </div>

      {/* Seller Stake Coverage */}
      <div
        className="hk-stat-card"
      >

        <h3
          className="mb-2 font-semibold text-white"
        >
          Stake Coverage Model
        </h3>

        <p
          className="mb-3 text-lg font-medium text-neutral-100"
        >
          Seller stake absorbs first-loss
          risk before LP capital is impacted.
        </p>

        <p className="hk-muted">
          Institutional-style junior /
          senior capital protection.
        </p>

      </div>

      {/* Residual LP Loss */}
      <div
        className="hk-stat-card"
      >

        <h3
          className="mb-2 font-semibold text-white"
        >
          Residual LP Loss
        </h3>

        <p
          className="mb-2 text-4xl font-semibold text-white"
        >
          {totalLosses} USDC
        </p>

        <p className="hk-muted">
          Losses socialized across
          liquidity providers
        </p>

      </div>

      {/* Outstanding Borrowed */}
      <div
        className="hk-stat-card md:col-span-2"
      >

        <h3
          className="mb-2 font-semibold text-white"
        >
          Outstanding Borrowed Capital
        </h3>

        <p
          className="mb-2 text-4xl font-semibold text-white"
        >
          {totalBorrowed} USDC
        </p>

        <p className="hk-muted">
          Active borrower debt currently
          deployed from LP liquidity.
        </p>

      </div>

    </div>
  );
}
