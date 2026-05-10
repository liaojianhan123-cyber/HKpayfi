"use client";

import {
  useState,
} from "react";

import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
} from "ethers";

import LiquidityPoolABI
  from "@/abis/LiquidityPool.json";

import { CONTRACTS }
  from "@/constants/contracts";

export default function useLPWithdraw() {

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const withdrawLiquidity = async (
    amount: string
  ) => {
    try {
      setLoading(true);
      setSuccess("");
      setError("");

      if (!window.ethereum) {
        throw new Error(
          "Wallet not connected"
        );
      }

      const provider =
        new BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const vault = new Contract(
        CONTRACTS.LIQUIDITY_POOL,
        LiquidityPoolABI,
        signer
      );

      const parsedAmount =
        parseUnits(amount, 6);

const shareBalance =
  await vault.balanceOf(
    await signer.getAddress()
  );

console.log(
  "hkLP balance:",
  formatUnits(shareBalance, 18)
);

      /*
       * Preview shares to burn
       * before withdrawal
       */
      const shares =
        await vault.previewWithdraw(
          parsedAmount
        );

      /*
       * Withdraw USDC
       */
      const tx =
        await vault.withdraw(
          parsedAmount,
          await signer.getAddress(),
          await signer.getAddress()
        );

      await tx.wait();

      setSuccess(
        `Withdrawn ${amount} USDC successfully (${formatUnits(
          shares,
          18
        )} hkLP burned)`
      );

    } catch (err: unknown) {

      console.error(err);

      if (
        err &&
        typeof err === "object" &&
        "reason" in err
      ) {
        setError(String(err.reason));

      } else if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        setError(String(err.message));

      } else {
        setError(
          "Withdrawal failed"
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    success,
    error,
    withdrawLiquidity,
  };
}