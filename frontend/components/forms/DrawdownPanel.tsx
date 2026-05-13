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
        className="hk-btn-primary"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="space-y-6">

      {/* Credit Line ID */}
      <div>
        <label className="hk-label">
          Credit Line ID
        </label>

        <input
          type="number"
          value={creditLineId}
          onChange={(e) =>
            setCreditLineId(e.target.value)
          }
          className="hk-input"
          placeholder="0"
        />
      </div>

      {/* Drawdown Amount */}
      <div>
        <label className="hk-label">
          Drawdown Amount (USDC)
        </label>

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          className="hk-input"
          placeholder="100"
        />
      </div>

      {/* Credit Terms */}
      {profile &&
      !profileLoading && (
        <div className="hk-panel-subtle space-y-2">

          <h3 className="text-lg font-semibold text-white">
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
      <div className="hk-warning">
        <h3 className="mb-2 font-semibold text-white">
          Seller Stake Requirement
        </h3>

        <p>
          Required Stake:{" "}
          <b>{requiredStake} USDC</b>
        </p>

        <p className="mt-1 text-sm text-neutral-400">
          20% skin-in-the-game
          requirement
        </p>
      </div>

      {/* HKP Perks */}
      {!hkpLoading && status && (
        <div className="hk-panel-subtle">

          <h3 className="mb-2 font-semibold text-white">
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

          <p className="mt-2 text-sm text-neutral-400">
            HKP perks are
            snapshotted at first
            drawdown
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">

        <button
          onClick={() =>
            approveStake(
              requiredStake.toString()
            )
          }
          disabled={
            loading || !amount
          }
          className="hk-btn-secondary"
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
          className="hk-btn-primary"
        >
          Execute Drawdown
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
