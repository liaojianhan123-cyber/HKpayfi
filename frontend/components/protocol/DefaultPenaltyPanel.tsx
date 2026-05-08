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
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl">

        <h3 className="font-semibold text-red-700 mb-4">
          Default & Penalty Status
        </h3>

        <div className="space-y-2">

          <p>
            Standard APR:{" "}
            <b>{baseApr}%</b>
          </p>

          <p>
            Penalty APR:{" "}
            <b>{penaltyApr}%</b>
          </p>

          <p>
            Status:{" "}
            <b>
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
            <p className="text-red-600 font-medium">
              Default Triggered
            </p>
          )}

        </div>
      </div>

      {/* Loss Waterfall */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl">

        <h3 className="font-semibold text-red-700">
          Loss Waterfall
        </h3>

        <div className="mt-4 space-y-3">

          <div className="bg-white p-3 rounded-lg border">

            <p className="font-medium">
              1. Seller Stake
            </p>

            <p className="text-red-600">
              Slashed First:{" "}
              {sellerStake} USDC
            </p>

          </div>

          <div className="bg-white p-3 rounded-lg border">

            <p className="font-medium">
              2. LP Pool Exposure
            </p>

            <p className="text-orange-600">
              Remaining Loss:{" "}
              {lpLossExposure} USDC
            </p>

          </div>

        </div>
      </div>

      {/* Protocol Explanation */}
      <div className="bg-gray-50 border p-4 rounded-xl">

        <h3 className="font-semibold mb-2">
          Protocol Protection
        </h3>

        <p className="text-gray-600 text-sm leading-7">
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
        <p className="text-gray-500">
          Loading penalty
          status...
        </p>
      )}

    </div>
  );
}