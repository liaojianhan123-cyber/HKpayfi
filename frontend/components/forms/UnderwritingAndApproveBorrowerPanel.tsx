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
        <label className="hk-label">
          Borrower Address
        </label>

        <input
          type="text"
          value={borrower}
          onChange={(e) =>
            setBorrower(e.target.value)
          }
          placeholder="0x..."
          className="hk-input"
        />
      </div>

      {/* Credit Limit */}
      <div>
        <label className="hk-label">
          Credit Limit (USDC)
        </label>

        <input
          type="number"
          value={creditLimit}
          onChange={(e) =>
            setCreditLimit(e.target.value)
          }
          placeholder="50000"
          className="hk-input"
        />
      </div>

      {/* APR */}
      <div>
        <label className="hk-label">
          APR (basis points)
        </label>

        <input
          type="number"
          value={interestRate}
          onChange={(e) =>
            setInterestRate(e.target.value)
          }
          placeholder="1500"
          className="hk-input"
        />

        <p className="mt-1 text-sm text-neutral-500">
          Example: 1500 = 15%
        </p>
      </div>

      {/* Advance Rate */}
      <div>
        <label className="hk-label">
          Advance Rate (basis points)
        </label>

        <input
          type="number"
          value={advanceRate}
          onChange={(e) =>
            setAdvanceRate(e.target.value)
          }
          placeholder="9000"
          className="hk-input"
        />

        <p className="mt-1 text-sm text-neutral-500">
          Example: 9000 = 90%
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">

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
          className="hk-btn-primary"
        >
          Approve Borrower
        </button>

        <button
          onClick={() =>
            revokeBorrower(borrower)
          }
          disabled={loading}
          className="hk-btn-danger"
        >
          Revoke Borrower
        </button>

      </div>

    </div>
  );
}
