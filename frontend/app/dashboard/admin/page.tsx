"use client";

import UnderwritingAndApproveBorrowerPanel
from "@/components/forms/UnderwritingAndApproveBorrowerPanel";

import BlacklistViewTable
from "@/components/tables/BlacklistViewTable";

export default function AdminDashboard() {

  return (

    <div className="
      min-h-screen
      bg-gray-100
      p-6
      space-y-6
    ">

      {/* Header */}
      <div className="
        bg-white
        p-6
        rounded-2xl
        shadow
      ">

        <h1 className="
          text-2xl
          font-bold
        ">
          Admin Dashboard
        </h1>

        <p className="text-gray-500">
          Manage borrower approvals,
          underwriting,
          and protocol controls
        </p>

      </div>

      {/* Underwriting & Approval */}
      <div className="
        bg-white
        p-6
        rounded-2xl
        shadow
      ">

        <h2 className="
          text-lg
          font-semibold
          mb-4
        ">
          Underwriting &
          Borrower Approval
        </h2>

        <UnderwritingAndApproveBorrowerPanel />

      </div>

      {/* Blacklist View */}
      <div className="
        bg-white
        p-6
        rounded-2xl
        shadow
      ">

        <h2 className="
          text-lg
          font-semibold
          mb-4
        ">
          Blacklisted Borrowers
        </h2>

        <BlacklistViewTable />

      </div>

    </div>
  );
}