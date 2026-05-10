"use client";

import {
  useState,
} from "react";

import useLPWithdraw
  from "@/hooks/lp/useLPWithdraw";

export default function WithdrawLiquidityPanel() {

  const [amount, setAmount] =
    useState("");

  const {
    loading,
    success,
    error,
    withdrawLiquidity,
  } = useLPWithdraw();

  const handleWithdraw = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!amount) return;

    await withdrawLiquidity(amount);
  };

  return (
    <div className="space-y-4">

      <form
        onSubmit={handleWithdraw}
        className="space-y-4"
      >

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Withdraw Amount (USDC)
          </label>

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="1000"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="
              w-full
              border
              rounded-xl
              p-4
              text-lg
            "
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="
            bg-red-600
            hover:bg-red-700
            text-white
            px-6
            py-3
            rounded-xl
            disabled:opacity-50
          "
        >
          {loading
            ? "Processing..."
            : "Withdraw Liquidity"}
        </button>

      </form>

      {/* Success */}
      {success && (
        <div
          className="
            p-4
            rounded-xl
            bg-green-100
            text-green-700
            border
            border-green-300
          "
        >
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="
            p-4
            rounded-xl
            bg-red-100
            text-red-700
            border
            border-red-300
          "
        >
          {error}
        </div>
      )}

      {/* UX Note */}
      <div
        className="
          bg-gray-50
          border
          rounded-xl
          p-4
          text-gray-600
        "
      >
        Some liquidity may be locked in
        active loans. Only available pool
        cash can be withdrawn.
      </div>

    </div>
  );
}