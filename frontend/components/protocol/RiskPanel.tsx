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
      <p className="text-gray-500">
        Loading risk metrics...
      </p>
    );
  }

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Total Losses */}
      <div
        className="
          border border-red-200
          bg-red-50
          rounded-2xl
          p-6
        "
      >

        <h3
          className="
            text-red-700
            font-semibold
            mb-2
          "
        >
          Total Losses
        </h3>

        <p
          className="
            text-4xl
            font-bold
            mb-2
          "
        >
          {totalLosses} USDC
        </p>

        <p className="text-gray-500">
          Cumulative realized LP losses
        </p>

      </div>

      {/* Defaulted Loans */}
      <div
        className="
          border border-orange-200
          bg-orange-50
          rounded-2xl
          p-6
        "
      >

        <h3
          className="
            text-orange-700
            font-semibold
            mb-2
          "
        >
          Defaulted Loans
        </h3>

        <p
          className="
            text-4xl
            font-bold
            mb-2
          "
        >
          {defaultedLoans}
        </p>

        <p className="text-gray-500">
          Borrowers currently in default
        </p>

      </div>

      {/* Seller Stake Coverage */}
      <div
        className="
          border border-blue-200
          bg-blue-50
          rounded-2xl
          p-6
        "
      >

        <h3
          className="
            text-blue-700
            font-semibold
            mb-2
          "
        >
          Stake Coverage Model
        </h3>

        <p
          className="
            text-lg
            font-medium
            mb-3
          "
        >
          Seller stake absorbs first-loss
          risk before LP capital is impacted.
        </p>

        <p className="text-gray-500">
          Institutional-style junior /
          senior capital protection.
        </p>

      </div>

      {/* Residual LP Loss */}
      <div
        className="
          border border-purple-200
          bg-purple-50
          rounded-2xl
          p-6
        "
      >

        <h3
          className="
            text-purple-700
            font-semibold
            mb-2
          "
        >
          Residual LP Loss
        </h3>

        <p
          className="
            text-4xl
            font-bold
            mb-2
          "
        >
          {totalLosses} USDC
        </p>

        <p className="text-gray-500">
          Losses socialized across
          liquidity providers
        </p>

      </div>

      {/* Outstanding Borrowed */}
      <div
        className="
          md:col-span-2
          border border-yellow-200
          bg-yellow-50
          rounded-2xl
          p-6
        "
      >

        <h3
          className="
            text-yellow-700
            font-semibold
            mb-2
          "
        >
          Outstanding Borrowed Capital
        </h3>

        <p
          className="
            text-4xl
            font-bold
            mb-2
          "
        >
          {totalBorrowed} USDC
        </p>

        <p className="text-gray-500">
          Active borrower debt currently
          deployed from LP liquidity.
        </p>

      </div>

    </div>
  );
}