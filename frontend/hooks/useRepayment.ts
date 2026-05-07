"use client";

import { useState } from "react";
import {
  BrowserProvider,
  Contract,
  parseUnits,
} from "ethers";

import CreditFacilityABI from "@/abis/CreditFacility.json";
import MockUSDCABI from "@/abis/MockUSDC.json";

import { CONTRACTS } from "@/constants/contracts";

export default function useRepayment() {
  const [loading, setLoading] =
    useState(false);

  const [txHash, setTxHash] =
    useState("");

  const [error, setError] =
    useState("");

  const approveRepayment = async (
    amount: string
  ) => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        throw new Error(
          "Wallet not found"
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

      const tx =
        await usdc.approve(
          CONTRACTS.CREDIT_FACILITY,
          parseUnits(amount, 6)
        );

      await tx.wait();

      setTxHash(tx.hash);

      return tx;
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const repay = async (
    creditLineId: number,
    amount: string
  ) => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        throw new Error(
          "Wallet not found"
        );
      }

      const provider =
        new BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const contract = new Contract(
        CONTRACTS.CREDIT_FACILITY,
        CreditFacilityABI,
        signer
      );

      const tx =
        await contract.repay(
          creditLineId,
          parseUnits(amount, 6)
        );

      await tx.wait();

      setTxHash(tx.hash);

      return tx;
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    approveRepayment,
    repay,
    loading,
    txHash,
    error,
  };
}