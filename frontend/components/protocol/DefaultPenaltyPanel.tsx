"use client";

import {
  useCreditFacility,
} from "@/hooks/seller/useCreditFacility";

import usePenaltyStatus
  from "@/hooks/seller/usePenaltyStatus";

export default function DefaultPenaltyPanel() {
  const {
    creditLine,
    loading,
  } = useCreditFacility("0");

  const {
    baseApr,
    penaltyApr,
    isOverdue,
    isDefaulted,
    graceRemaining,
    sellerStake,
    lpLossExposure,
  } = usePenaltyStatus({
    dueDate:
      creditLine?.dueDate,
    principal:
      creditLine?.drawn,
    interestRate:
      creditLine?.interestRate,
    stakeAmount:
      creditLine?.stakeAmount,
  });

  const graceDays =
    (
      graceRemaining /
      86400
    ).toFixed(1);

  return (
    <div className="space-y-6">

      {/* Penalty Status */}
      <div className="hk-panel-subtle">

        <h3 className="mb-4 font-semibold text-white">
          Default & Penalty Status
        </h3>

        <div className="space-y-2">

          <p>
            Standard APR:{" "}
            <b className="text-white">{baseApr}%</b>
          </p>

          <p>
            Penalty APR:{" "}
            <b className="text-white">{penaltyApr}%</b>
          </p>

          <p>
            Status:{" "}
            <b className="text-white">
              {isDefaulted
                ? "Defaulted"
                : isOverdue
                ? "Penalty Period"
                : "Active"}
            </b>
          </p>

          {isOverdue &&
            !isDefaulted && (
              <p>
                Grace Remaining:{" "}
                <b>
                  {graceDays} days
                </b>
              </p>
            )}

          {isDefaulted && (
            <p className="font-medium text-red-200">
              Default Triggered
            </p>
          )}

        </div>
      </div>

      {/* Loss Waterfall */}
      <div className="hk-panel-subtle">

        <h3 className="font-semibold text-white">
          Loss Waterfall
        </h3>

        <div className="mt-4 space-y-3">

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">

            <p className="font-medium text-white">
              1. Seller Stake
            </p>

            <p className="text-neutral-300">
              Slashed First:{" "}
              {sellerStake} USDC
            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">

            <p className="font-medium text-white">
              2. LP Pool Exposure
            </p>

            <p className="text-neutral-300">
              Remaining Loss:{" "}
              {lpLossExposure} USDC
            </p>

          </div>

        </div>
      </div>

      {/* Protocol Explanation */}
      <div className="hk-warning">

        <h3 className="mb-2 font-semibold text-white">
          Protocol Protection
        </h3>

        <p className="text-sm leading-7 text-neutral-300">
          HKPayFi uses a
          seller-first loss
          absorption mechanism.
          Seller collateral is
          slashed before LP
          liquidity absorbs
          remaining losses,
          reducing systemic
          protocol risk.
        </p>

      </div>

      {loading && (
        <p className="hk-muted">
          Loading penalty
          status...
        </p>
      )}

    </div>
  );
}
