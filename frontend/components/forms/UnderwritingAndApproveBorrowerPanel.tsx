"use client";

import { useState } from "react";

import useUnderwritingAndApproveBorrower from "@/hooks/admin/useUnderwritingAndApproveBorrower";

export default function UnderwritingAndApproveBorrowerPanel() {

  const {
    approveBorrower,
    revokeBorrower,
    loading,
  } = useUnderwritingAndApproveBorrower();

  const [borrower, setBorrower] =
    useState("");

  const [creditLimit, setCreditLimit] =
    useState("");

  const [interestRate, setInterestRate] =
    useState("");

  const [advanceRate, setAdvanceRate] =
    useState("");

  return (
    <div className="space-y-6">

      {/* Borrower Address */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Borrower Address
        </label>

        <input
          type="text"
          value={borrower}
          onChange={(e) =>
            setBorrower(e.target.value)
          }
          placeholder="0x..."
          className="w-full border rounded-xl p-3"
        />
      </div>

      {/* Credit Limit */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Credit Limit (USDC)
        </label>

        <input
          type="number"
          value={creditLimit}
          onChange={(e) =>
            setCreditLimit(e.target.value)
          }
          placeholder="50000"
          className="w-full border rounded-xl p-3"
        />
      </div>

      {/* APR */}
      <div>
        <label className="block text-sm font-medium mb-2">
          APR (basis points)
        </label>

        <input
          type="number"
          value={interestRate}
          onChange={(e) =>
            setInterestRate(e.target.value)
          }
          placeholder="1500"
          className="w-full border rounded-xl p-3"
        />

        <p className="text-sm text-gray-500 mt-1">
          Example: 1500 = 15%
        </p>
      </div>

      {/* Advance Rate */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Advance Rate (basis points)
        </label>

        <input
          type="number"
          value={advanceRate}
          onChange={(e) =>
            setAdvanceRate(e.target.value)
          }
          placeholder="9000"
          className="w-full border rounded-xl p-3"
        />

        <p className="text-sm text-gray-500 mt-1">
          Example: 9000 = 90%
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">

        <button
          onClick={() =>
            approveBorrower(
              borrower,
              creditLimit,
              interestRate,
              advanceRate
            )
          }
          disabled={loading}
          className="
            bg-green-600
            hover:bg-green-700
            text-white
            px-6
            py-3
            rounded-xl
            font-medium
          "
        >
          Approve Borrower
        </button>

        <button
          onClick={() =>
            revokeBorrower(borrower)
          }
          disabled={loading}
          className="
            bg-red-600
            hover:bg-red-700
            text-white
            px-6
            py-3
            rounded-xl
            font-medium
          "
        >
          Revoke Borrower
        </button>

      </div>

    </div>
  );
}