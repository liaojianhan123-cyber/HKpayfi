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
          <label className="hk-label">
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
            className="hk-input"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="hk-btn-secondary w-full sm:w-auto"
        >
          {loading
            ? "Processing..."
            : "Withdraw Liquidity"}
        </button>

      </form>

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

      {/* UX Note */}
      <div
        className="hk-warning"
      >
        Some liquidity may be locked in
        active loans. Only available pool
        cash can be withdrawn.
      </div>

    </div>
  );
}
