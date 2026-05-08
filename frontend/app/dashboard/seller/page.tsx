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
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <p className="text-gray-500">Manage receivables and credit</p>
      </div>

      {/* Mint Receivable */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Mint Receivable NFT</h2>
        <div className="text-gray-400"><MintReceivable wallet={wallet} /></div>
      </div>

      {/* Lifecycle Table */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Receivable Lifecycle</h2>
        <ReceivableLifecycleTable wallet={wallet} />
      </div>

      {/* Credit Score */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Credit Score</h2>
        <CreditScorePanel wallet={wallet} />
      </div>

      {/* ✅ ADD THIS (missing) */}
      {/* Apply for Credit */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Apply for Credit</h2>
        <ApplyForCredit wallet={wallet} />
      </div>

      {/* Drawdown */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Drawdown</h2>
        <DrawdownPanel wallet={wallet} />
      </div>

      {/* Repayment */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Repayment</h2>
        <RepaymentPanel wallet={wallet} />
      </div>

      {/* Default */}
      <div className="bg-white p-6 rounded-2xl shadow border border-red-300">

        <h2 className="text-lg font-semibold mb-4 text-red-600">
          Default & Penalty
        </h2>

        <DefaultPenaltyPanel />

      </div>

      {/* HKP Perks */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">HKP Token Perks</h2>
        <HKPPerksPanel
          account={wallet.account}
        />
      </div>
    </div>
  );
}