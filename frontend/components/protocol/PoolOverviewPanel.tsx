"use client";

import useLiquidityPool
  from "@/hooks/lp/useLiquidityPool";

export default function PoolOverviewPanel() {
  const {
    loading,
    totalAssets,
    availableLiquidity,
    totalBorrowed,
    totalInterestEarned,
    totalLosses,
  } = useLiquidityPool();

  return (
    <div className="space-y-6">

      {/* Overview Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Total Assets */}
        <div className="hk-stat-card">
          <h3 className="hk-stat-label">
            Total Assets
          </h3>

          <p className="hk-stat-value">
            {totalAssets} USDC
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Cash + outstanding loans
          </p>
        </div>

        {/* Available Liquidity */}
        <div className="hk-stat-card">
          <h3 className="hk-stat-label">
            Available Liquidity
          </h3>

          <p className="hk-stat-value">
            {availableLiquidity} USDC
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Withdrawable pool cash
          </p>
        </div>

        {/* Outstanding Loans */}
        <div className="hk-stat-card">
          <h3 className="hk-stat-label">
            Outstanding Loans
          </h3>

          <p className="hk-stat-value">
            {totalBorrowed} USDC
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Active borrower debt
          </p>
        </div>

        {/* Yield Earned */}
        <div className="hk-stat-card">
          <h3 className="hk-stat-label">
            Yield Earned
          </h3>

          <p className="hk-stat-value">
            {totalInterestEarned} USDC
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Lifetime LP yield
          </p>
        </div>

      </div>

      {/* Losses */}
      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">

        <h3 className="font-semibold text-white">
          Pool Losses
        </h3>

        <p className="mt-3 text-3xl font-semibold text-white">
          {totalLosses} USDC
        </p>

        <p className="hk-muted mt-2">
          Losses socialized across LPs
          after seller stake absorption.
        </p>

      </div>

      {loading && (
        <p className="hk-muted">
          Loading pool overview...
        </p>
      )}

    </div>
  );
}
