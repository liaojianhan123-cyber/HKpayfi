"use client";

import PoolOverviewPanel from "@/components/protocol/PoolOverviewPanel";
import DepositLiquidityPanel from "@/components/forms/DepositLiquidityPanel";
import WithdrawLiquidityPanel from "@/components/forms/WithdrawLiquidityPanel";

export default function LPDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">
          LP Dashboard
        </h1>

        <p className="text-gray-500">
          Manage liquidity positions and
          monitor pool performance
        </p>
      </div>

      {/* Pool Overview */}
      <div className="bg-white p-6 rounded-2xl shadow">

        <h2 className="text-lg font-semibold mb-4">
          Pool Overview
        </h2>

        <PoolOverviewPanel />

      </div>

      {/* Deposit Liquidity */}
      <div className="bg-white p-6 rounded-2xl shadow">

        <h2 className="text-lg font-semibold mb-4">
          Deposit Liquidity
        </h2>

        <DepositLiquidityPanel />

      </div>
      
      {/* Withdraw Liquidity */}
      <div className="bg-white p-6 rounded-2xl shadow">

        <h2 className="text-lg font-semibold mb-4">
          Withdraw Liquidity
        </h2>

        <WithdrawLiquidityPanel />

      </div>

    </div>
  );
}