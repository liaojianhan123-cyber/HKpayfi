"use client";

import UnderwritingAndApproveBorrowerPanel
from "@/components/forms/UnderwritingAndApproveBorrowerPanel";

import BlacklistViewTable
from "@/components/tables/BlacklistViewTable";

import ProtocolControlPanel
from "@/components/protocol/ProtocolControlPanel";

export default function AdminDashboard() {

  return (

    <div className="hk-page hk-fade-in">

      {/* Header */}
      <div className="hk-hero">

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="hk-pill">Protocol Operations</div>

            <h1 className="hk-title">
              Admin Dashboard
            </h1>

            <p className="hk-muted max-w-2xl">
              Manage borrower approvals, underwriting parameters, blacklist
              visibility, and protocol configuration.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="hk-stat-card">
              <p className="hk-stat-label">Controls</p>
              <p className="mt-2 text-lg font-semibold text-white">Governance</p>
            </div>

            <div className="hk-stat-card">
              <p className="hk-stat-label">Risk</p>
              <p className="mt-2 text-lg font-semibold text-white">Underwriting</p>
            </div>
          </div>
        </div>

      </div>

      {/* Underwriting & Approval */}
      <div className="hk-panel">

        <h2 className="hk-section-title">
          Underwriting & Borrower Approval
        </h2>

        <UnderwritingAndApproveBorrowerPanel />

      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Blacklist View */}
        <div className="hk-panel">

          <h2 className="hk-section-title">
            Blacklisted Borrowers
          </h2>

          <BlacklistViewTable />

        </div>

        {/* Protocol Control Panel */}
        <div className="hk-panel">

          <h2 className="hk-section-title">
            Protocol Control Panel
          </h2>

          <ProtocolControlPanel />

        </div>
      </div>

    </div>
  );
}
