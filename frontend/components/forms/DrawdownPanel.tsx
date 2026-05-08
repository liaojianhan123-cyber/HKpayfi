"use client";

import { useState } from "react";

import useHKPStatus from "@/hooks/protocol/useHKPStatus";
import useDrawdown from "@/hooks/seller/useDrawdown";
import { useCreditFacility } from "@/hooks/seller/useCreditFacility";
import useBorrowerProfile from "@/hooks/seller/useBorrowerProfile";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};

export default function DrawdownPanel({
  wallet,
}: {
  wallet: WalletProps;
}) {
  const { account, connectWallet } = wallet;

  const [creditLineId, setCreditLineId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const {
    creditLine,
  } = useCreditFacility(
    creditLineId || undefined
  );

  const {
    profile,
    loading: profileLoading,
  } = useBorrowerProfile(
    account || undefined
  );

  const {
    status,
    loading: hkpLoading,
  } = useHKPStatus(account || undefined);

  const {
    approveStake,
    executeDrawdown,
    loading,
    txHash,
    error,
  } = useDrawdown();

  const requiredStake =
    amount && Number(amount) > 0
      ? Number(amount) * 0.2
      : 0;

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
            setCreditLineId(e.target.value)
          }
          className="w-full border rounded-lg p-3"
          placeholder="0"
        />
      </div>

      {/* Drawdown Amount */}
      <div>
        <label className="block mb-2 font-medium">
          Drawdown Amount (USDC)
        </label>

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          className="w-full border rounded-lg p-3"
          placeholder="100"
        />
      </div>

      {/* Credit Terms */}
      {profile &&
      !profileLoading && (
        <div className="bg-gray-50 p-4 rounded-xl space-y-2">

          <h3 className="font-semibold text-lg">
            Credit Terms
          </h3>

          <p>
            Credit Limit:{" "}
            {Number(
              profile.maxCreditLimit
            ) / 1e6}{" "}
            USDC
          </p>

          <p>
            APR:{" "}
            {Number(
              profile.interestRate
            ) / 100}
            %
          </p>

          <p>
            Advance Rate:{" "}
            {Number(
              profile.advanceRate
            ) / 100}
            %
          </p>

          {creditLine && (
            <>
              <p>
                Current Drawn:{" "}
                {Number(
                  creditLine.drawn
                ) / 1e6}{" "}
                USDC
              </p>

              <p>
                Stake Locked:{" "}
                {Number(
                  creditLine.stakeAmount
                ) / 1e6}{" "}
                USDC
              </p>
            </>
          )}
        </div>
    )}

      {/* Stake Requirement */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
        <h3 className="font-semibold mb-2">
          Seller Stake Requirement
        </h3>

        <p>
          Required Stake:{" "}
          <b>{requiredStake} USDC</b>
        </p>

        <p className="text-sm text-gray-500 mt-1">
          20% skin-in-the-game
          requirement
        </p>
      </div>

      {/* HKP Perks */}
      {!hkpLoading && status && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">

          <h3 className="font-semibold mb-2">
            HKP Perks
          </h3>

          <p>
            HKP Holder:{" "}
            {status.isHolder
              ? "Yes"
              : "No"}
          </p>

          <p>
            APR Discount:{" "}
            {status.isHolder
              ? `-${status.aprDiscount}%`
              : "Not eligible"}
          </p>

          <p>
            Grace Bonus:{" "}
            {status.isHolder
              ? `+${status.graceBonusDays} days`
              : "Standard only"}
          </p>

          <p className="text-sm text-gray-500 mt-2">
            ⚠️ HKP perks are
            snapshotted at first
            drawdown
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">

        <button
          onClick={() =>
            approveStake(
              requiredStake.toString()
            )
          }
          disabled={
            loading || !amount
          }
          className="bg-black text-white px-4 py-3 rounded-xl"
        >
          Approve Stake
        </button>

        <button
          onClick={() =>
            executeDrawdown(
              Number(creditLineId),
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
          Execute Drawdown
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