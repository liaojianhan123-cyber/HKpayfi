"use client";

import PoolOverviewPanel from "@/components/protocol/PoolOverviewPanel";
import DepositLiquidityPanel from "@/components/forms/DepositLiquidityPanel";
import WithdrawLiquidityPanel from "@/components/forms/WithdrawLiquidityPanel";
import RiskPanel from "@/components/protocol/RiskPanel";

export default function LPDashboard() {
  return (
    <div className="hk-page hk-fade-in">
      {/* Header */}
      <div className="hk-hero">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="hk-pill">Liquidity Provider Console</div>
            <h1 className="hk-title">LP Dashboard</h1>
            <p className="hk-muted max-w-2xl">
              Manage liquidity positions, monitor pool performance, and review
              risk exposure from one streamlined protocol view.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="hk-stat-card">
              <p className="hk-stat-label">Capital</p>
              <p className="mt-2 text-lg font-semibold text-white">USDC Pool</p>
            </div>
            <div className="hk-stat-card">
              <p className="hk-stat-label">Vault</p>
              <p className="mt-2 text-lg font-semibold text-white">hkLP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Overview */}
      <div className="hk-panel">
        <h2 className="hk-section-title">Pool Overview</h2>
        <PoolOverviewPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Deposit Liquidity */}
        <div className="hk-panel">
          <h2 className="hk-section-title">Deposit Liquidity</h2>
          <DepositLiquidityPanel />
        </div>

        {/* Withdraw Liquidity */}
        <div className="hk-panel">
          <h2 className="hk-section-title">Withdraw Liquidity</h2>
          <WithdrawLiquidityPanel />
        </div>
      </div>

      {/* Risk Panel */}
      <div className="hk-panel">
        <h2 className="hk-section-title">Risk Metrics</h2>
        <RiskPanel />
      </div>
    </div>
  );
}
