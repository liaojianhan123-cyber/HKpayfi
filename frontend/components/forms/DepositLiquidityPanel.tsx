"use client";

import {
  useState,
} from "react";

import useLPDeposit
  from "@/hooks/lp/useLPDeposit";

export default function DepositLiquidityPanel() {
  const [amount, setAmount] =
    useState("");

  const {
    loading,
    success,
    error,
    depositLiquidity,
  } = useLPDeposit();

  return (
    <div className="space-y-4">

      {/* Input */}
      <div>
        <label className="hk-label">
          Deposit Amount (USDC)
        </label>

        <input
          type="number"
          placeholder="1000"
          value={amount}
          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }
          className="hk-input"
        />
      </div>

      {/* Deposit Button */}
      <button
        onClick={() =>
          depositLiquidity(amount)
        }
        disabled={
          loading || !amount
        }
        className="hk-btn-primary w-full sm:w-auto"
      >
        {loading
          ? "Depositing..."
          : "Deposit Liquidity"}
      </button>

      {/* Success */}
      {success && (
        <div
          className="hk-success"
        >
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="hk-error"
        >
          {error}
        </div>
      )}

      {/* Explanation */}
      <div
        className="hk-warning"
      >
        Depositing USDC into the
        ERC-4626 liquidity pool
        mints hkLP vault shares,
        representing your ownership
        of the lending pool.
      </div>

    </div>
  );
}
