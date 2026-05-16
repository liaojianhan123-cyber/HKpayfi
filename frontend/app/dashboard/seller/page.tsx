"use client";
import MintReceivable from "@/components/forms/MintReceivable";
import ReceivableLifecycleTable from "@/components/tables/ReceivableLifecycleTable";
import useWallet from "@/hooks/useWallet";
import CreditScorePanel from "@/components/cards/CreditScorePanel";
import ApplyForCredit from "@/components/forms/ApplyForCredit";
import DrawdownPanel from "@/components/forms/DrawdownPanel";
import RepaymentPanel from "@/components/forms/RepaymentPanel";
import DefaultPenaltyPanel from "@/components/protocol/DefaultPenaltyPanel";
import HKPPerksPanel from "@/components/protocol/HKPPerksPanel";

export default function SellerDashboard() {
  const wallet = useWallet();

  return (
    <div className="hk-page hk-fade-in">
      {/* Header */}
      <div className="hk-hero">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="hk-pill">Seller Credit Workspace</div>
            <h1 className="hk-title">Seller Dashboard</h1>
            <p className="hk-muted max-w-2xl">
              Mint receivables, manage credit lines, draw down liquidity, and
              track repayment health across the HKPayFi protocol.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="hk-stat-card">
              <p className="hk-stat-label">Assets</p>
              <p className="mt-2 text-lg font-semibold text-white">Receivable NFTs</p>
            </div>
            <div className="hk-stat-card">
              <p className="hk-stat-label">Credit</p>
              <p className="mt-2 text-lg font-semibold text-white">Dynamic Terms</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Mint Receivable */}
        <div className="hk-panel">
          <h2 className="hk-section-title">Mint Receivable NFT</h2>
          <MintReceivable wallet={wallet} />
        </div>

        {/* Credit Score */}
        <div className="hk-panel">
          <h2 className="hk-section-title">Credit Score</h2>
          <CreditScorePanel wallet={wallet} />
        </div>
      </div>

      {/* Lifecycle Table */}
      <div className="hk-panel">
        <h2 className="hk-section-title">Receivable Lifecycle</h2>
        <ReceivableLifecycleTable wallet={wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Apply for Credit */}
        <div className="hk-panel xl:col-span-3">
          <h2 className="hk-section-title">Apply for Credit</h2>
          <ApplyForCredit wallet={wallet} />
        </div>

        {/* Drawdown */}
        <div className="hk-panel xl:col-span-2">
          <h2 className="hk-section-title">Drawdown</h2>
          <DrawdownPanel wallet={wallet} />
        </div>

        {/* HKP Perks */}
        <div className="hk-panel">
          <h2 className="hk-section-title">HKP Token Perks</h2>
          <HKPPerksPanel
            account={wallet.account}
          />
        </div>

        {/* Repayment */}
        <div className="hk-panel xl:col-span-2">
          <h2 className="hk-section-title">Repayment</h2>
          <RepaymentPanel wallet={wallet} />
        </div>

        {/* Default */}
        <div className="hk-panel-danger">
          <h2 className="hk-section-title text-red-100">
            Default & Penalty
          </h2>

          <DefaultPenaltyPanel />
        </div>
      </div>
    </div>
  );
}
