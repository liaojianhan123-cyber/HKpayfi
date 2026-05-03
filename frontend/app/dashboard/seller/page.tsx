"use client";

export default function SellerDashboard() {
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
        <p className="text-gray-400">[Form goes here]</p>
      </div>

      {/* Lifecycle Table */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Receivable Lifecycle</h2>
        <p className="text-gray-400">[Table goes here]</p>
      </div>

      {/* Credit Score */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Credit Score</h2>
        <p className="text-gray-400">[Score + Status]</p>
      </div>

      {/* ✅ ADD THIS (missing) */}
      {/* Apply for Credit */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Apply for Credit</h2>
        <p className="text-gray-400">[Limit, APR, Advance rate]</p>
      </div>

      {/* Drawdown */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Drawdown</h2>
        <p className="text-gray-400">
          Stake: 20% required <br />
          HKP status: [Yes/No] <br />
          APR discount / grace bonus
        </p>
      </div>

      {/* Repayment */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Repayment</h2>
        <p className="text-gray-400">
          Principal + Interest + Penalty
        </p>
      </div>

      {/* Default */}
      <div className="bg-white p-6 rounded-2xl shadow border border-red-300">
        <h2 className="text-lg font-semibold mb-4 text-red-600">
          Default & Penalty
        </h2>
        <p className="text-gray-400">
          Normal → APR <br />
          Late → 1.5× APR <br />
          After grace → Default
        </p>

        <div className="mt-4 text-sm text-red-600">
          <b>Loss Waterfall:</b><br />
          1. Seller stake (slashed)<br />
          2. Remaining → LP pool
        </div>
      </div>

      {/* HKP Perks */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">HKP Token Perks</h2>
        <p className="text-gray-400">
          Balance + Holder status + APR discount + Grace bonus <br />
          ⚠️ Snapshot at drawdown
        </p>
      </div>

    </div>
  );
}