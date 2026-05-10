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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Total Assets */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <h3 className="text-sm text-blue-700 font-medium">
            Total Assets
          </h3>

          <p className="text-2xl font-bold mt-2">
            {totalAssets} USDC
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Cash + outstanding loans
          </p>
        </div>

        {/* Available Liquidity */}
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <h3 className="text-sm text-green-700 font-medium">
            Available Liquidity
          </h3>

          <p className="text-2xl font-bold mt-2">
            {availableLiquidity} USDC
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Withdrawable pool cash
          </p>
        </div>

        {/* Outstanding Loans */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
          <h3 className="text-sm text-yellow-700 font-medium">
            Outstanding Loans
          </h3>

          <p className="text-2xl font-bold mt-2">
            {totalBorrowed} USDC
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Active borrower debt
          </p>
        </div>

        {/* Yield Earned */}
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
          <h3 className="text-sm text-purple-700 font-medium">
            Yield Earned
          </h3>

          <p className="text-2xl font-bold mt-2">
            {totalInterestEarned} USDC
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Lifetime LP yield
          </p>
        </div>

      </div>

      {/* Losses */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl">

        <h3 className="text-red-700 font-semibold">
          Pool Losses
        </h3>

        <p className="text-2xl font-bold mt-3">
          {totalLosses} USDC
        </p>

        <p className="text-sm text-gray-600 mt-2">
          Losses socialized across LPs
          after seller stake absorption.
        </p>

      </div>

      {loading && (
        <p className="text-gray-500">
          Loading pool overview...
        </p>
      )}

    </div>
  );
}