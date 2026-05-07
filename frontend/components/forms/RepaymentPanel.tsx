"use client";

import { useState } from "react";

import {
  useCreditFacility,
} from "@/hooks/useCreditFacility";

import useRepayment from "@/hooks/useRepayment";

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
        className="bg-black text-white px-4 py-2 rounded-lg"
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

  const interest =
    creditLine
      ? (
          principal *
          (Number(
            creditLine.interestRate
          ) /
            100) /
          100
        ).toFixed(2)
      : "0";

  const isOverdue =
    creditLine
      ? Math.floor(currentTime) >
        Number(creditLine.dueDate)
      : false;

  const penalty =
    isOverdue
      ? (
          Number(interest) * 1.5
        ).toFixed(2)
      : "0";

  return (
    <div className="space-y-6">

      {/* Credit Line ID */}
      <div>
        <label className="block mb-2 font-medium">
          Credit Line ID
        </label>

        <input
          type="number"
          value={creditLineId}
          onChange={(e) =>
            setCreditLineId(
              e.target.value
            )
          }
          className="w-full border rounded-lg p-3"
          placeholder="0"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block mb-2 font-medium">
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
          className="w-full border rounded-lg p-3"
          placeholder="100"
        />
      </div>

      {/* Repayment Breakdown */}
      {creditLine && (
        <div className="bg-gray-50 p-4 rounded-xl space-y-2">

          <h3 className="font-semibold text-lg">
            Repayment Breakdown
          </h3>

          <p>
            Principal:{" "}
            <b>
              {principal} USDC
            </b>
          </p>

          <p>
            Interest:{" "}
            <b>
              {interest} USDC
            </b>
          </p>

          <p>
            Penalty:{" "}
            <b>
              {penalty} USDC
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
      <div className="flex gap-4">

        <button
          onClick={() =>
            approveRepayment(
              amount
            )
          }
          disabled={
            loading || !amount
          }
          className="bg-black text-white px-4 py-3 rounded-xl"
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
          className="bg-blue-600 text-white px-4 py-3 rounded-xl"
        >
          Repay
        </button>
      </div>

      {/* Status */}
      {loading && (
        <p className="text-gray-500">
          Processing transaction...
        </p>
      )}

      {txHash && (
        <p className="text-green-600 break-all">
          Success: {txHash}
        </p>
      )}

      {error && (
        <p className="text-red-600 break-all">
          {error}
        </p>
      )}

    </div>
  );
}