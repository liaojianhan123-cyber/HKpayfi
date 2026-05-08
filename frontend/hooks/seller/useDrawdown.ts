"use client";

import { useState } from "react";

import {BrowserProvider,Contract,parseUnits,} from "ethers";

import CreditFacilityABI from "@/abis/CreditFacility.json";
import MockUSDCABI from "@/abis/MockUSDC.json";

import { CONTRACTS } from "@/constants/contracts";

export default function useDrawdown() {
  const [loading, setLoading] = useState(false);

  const [txHash, setTxHash] = useState("");

  const [error, setError] = useState("");

  const approveStake = async (
    amount: string
  ) => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        throw new Error("Wallet not found");
      }

      const provider = new BrowserProvider(
        window.ethereum
      );

      const signer = await provider.getSigner();

      const usdc = new Contract(
        CONTRACTS.USDC,
        MockUSDCABI,
        signer
      );

      const tx = await usdc.approve(
        CONTRACTS.CREDIT_FACILITY,
        parseUnits(amount, 6)
      );

      await tx.wait();

      setTxHash(tx.hash);
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const executeDrawdown = async (
    creditLineId: number,
    amount: string
  ) => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        throw new Error("Wallet not found");
      }

      const provider = new BrowserProvider(
        window.ethereum
      );

      const signer = await provider.getSigner();

      const facility = new Contract(
        CONTRACTS.CREDIT_FACILITY,
        CreditFacilityABI,
        signer
      );

      const tx = await facility.drawdown(
        creditLineId,
        parseUnits(amount, 6)
      );

      await tx.wait();

      setTxHash(tx.hash);
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    approveStake,
    executeDrawdown,
    loading,
    txHash,
    error,
  };
}