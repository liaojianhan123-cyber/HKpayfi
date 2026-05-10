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
        <label className="block text-sm font-medium mb-2">
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
          className="w-full border rounded-xl p-3"
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
        className="
          bg-blue-600
          hover:bg-blue-700
          text-white
          px-4
          py-3
          rounded-xl
          disabled:opacity-50
        "
      >
        {loading
          ? "Depositing..."
          : "Deposit Liquidity"}
      </button>

      {/* Success */}
      {success && (
        <div
          className="
            bg-green-50
            border
            border-green-200
            text-green-700
            p-3
            rounded-xl
          "
        >
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="
            bg-red-50
            border
            border-red-200
            text-red-700
            p-3
            rounded-xl
          "
        >
          {error}
        </div>
      )}

      {/* Explanation */}
      <div
        className="
          bg-gray-50
          border
          p-4
          rounded-xl
          text-sm
          text-gray-600
        "
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