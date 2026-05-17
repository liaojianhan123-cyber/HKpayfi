"use client";

import { useState } from "react";

import {
  useCreditFacility,
} from "@/hooks/seller/useCreditFacility";

import useRepayment from "@/hooks/seller/useRepayment";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};

export default function RepaymentPanel({
  wallet,
}: {
  wallet: WalletProps;
}) {
  const { account, connectWallet } =
    wallet;

  const [creditLineId, setCreditLineId] =
    useState("");

  const [amount, setAmount] =
    useState("");
  const currentTime = new Date().getTime() / 1000;

  const {
    creditLine,
  } = useCreditFacility(
    creditLineId || undefined
  );

  const {
    approveRepayment,
    repay,
    loading,
    txHash,
    error,
  } = useRepayment();

  if (!account) {
    return (
      <button
        onClick={connectWallet}
        className="hk-btn-primary"
      >
        Connect Wallet
      </button>
    );
  }

  const principal =
    creditLine
      ? Number(
          creditLine.drawn
        ) / 1e6
      : 0;

  // Real accrued interest pulled from chain (already includes the 1.5x
  // penalty bump if the loan is overdue). Falls back to 0 if not loaded.
  const interest =
    creditLine && creditLine.accruedInterest
      ? (Number(creditLine.accruedInterest) / 1e6).toFixed(2)
      : "0";

  const totalOwed =
    creditLine && creditLine.totalOwed
      ? (Number(creditLine.totalOwed) / 1e6).toFixed(2)
      : "0";

  const isOverdue =
    creditLine
      ? Math.floor(currentTime) >
        Number(creditLine.dueDate)
      : false;

  return (
    <div className="space-y-6">

      {/* Credit Line ID */}
      <div>
        <label className="hk-label">
          Credit Line ID
        </label>

        <input
          type="number"
          min="0"
          step="1"
          value={creditLineId}
          onChange={(e) =>
            setCreditLineId(
              e.target.value
            )
          }
          className="hk-input"
          placeholder="0"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="hk-label">
          Repayment Amount (USDC)
        </label>

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }
          className="hk-input"
          placeholder="100"
        />
      </div>

      {/* Repayment Breakdown */}
      {creditLine && (
        <div className="hk-panel-subtle space-y-2">

          <h3 className="text-lg font-semibold text-white">
            Repayment Breakdown
          </h3>

          <p>
            Principal:{" "}
            <b>
              {principal} USDC
            </b>
          </p>

          <p>
            Accrued Interest:{" "}
            <b>
              {interest} USDC
            </b>
            <span className="ml-2 text-xs text-neutral-500">
              {isOverdue ? "(includes 1.5x penalty)" : "(live, time-based)"}
            </span>
          </p>

          <p>
            Total Owed Now:{" "}
            <b className="text-emerald-300">
              {totalOwed} USDC
            </b>
          </p>

          <p>
            Status:{" "}
            <b>
              {isOverdue
                ? "Overdue"
                : "Active"}
            </b>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">

        <button
          onClick={() =>
            approveRepayment(
              amount
            )
          }
          disabled={
            loading || !amount
          }
          className="hk-btn-secondary"
        >
          Approve USDC
        </button>

        <button
          onClick={() =>
            repay(
              Number(
                creditLineId
              ),
              amount
            )
          }
          disabled={
            loading ||
            !creditLineId ||
            !amount
          }
          className="hk-btn-primary"
        >
          Repay
        </button>
      </div>

      {/* Status */}
      {loading && (
        <p className="hk-muted">
          Processing transaction...
        </p>
      )}

      {txHash && (
        <p className="hk-success break-all">
          Success: {txHash}
        </p>
      )}

      {error && (
        <p className="hk-error break-all">
          {error}
        </p>
      )}

    </div>
  );
}
