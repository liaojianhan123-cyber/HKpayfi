"use client";

import {
  useState,
} from "react";

import {
  BrowserProvider,
  Contract,
  parseUnits,
} from "ethers";

import LiquidityPoolABI
  from "@/abis/LiquidityPool.json";

import MockUSDCABI
  from "@/abis/MockUSDC.json";

import { CONTRACTS }
  from "@/constants/contracts";

export default function useLPDeposit() {
  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const depositLiquidity = async (
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

      const usdc = new Contract(
        CONTRACTS.USDC,
        MockUSDCABI,
        signer
      );

      const vault = new Contract(
        CONTRACTS.LIQUIDITY_POOL,
        LiquidityPoolABI,
        signer
      );

      const parsedAmount =
        parseUnits(amount, 6);

      /*
       * Step 1:
       * Approve USDC
       */
      const approveTx =
        await usdc.approve(
          CONTRACTS.LIQUIDITY_POOL,
          parsedAmount
        );

      await approveTx.wait();

      /*
       * Step 2:
       * Deposit into vault
       */
      const depositTx =
        await vault.deposit(
          parsedAmount,
          await signer.getAddress()
        );

      await depositTx.wait();

      setSuccess(
        `Deposited ${amount} USDC successfully`
      );
    } catch (err: unknown) {
      console.error(err);

        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("Deposit failed");
        }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    success,
    error,
    depositLiquidity,
  };
}