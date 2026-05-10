"use client";

import { useEffect, useState } from "react";

import {
  BrowserProvider,
  Contract,
  formatUnits,
} from "ethers";

import LiquidityPoolABI
  from "@/abis/LiquidityPool.json";

import { CONTRACTS }
  from "@/constants/contracts";

export default function useRiskMetrics() {

  const [loading, setLoading] =
    useState(true);

  const [totalLosses, setTotalLosses] =
    useState("0");

  const [totalBorrowed, setTotalBorrowed] =
    useState("0");

  /*
   * Mocked for now until
   * default tracking is added
   * in CreditFacility.
   */
  const [defaultedLoans] =
    useState(0);

  useEffect(() => {

    const fetchMetrics = async () => {

      try {

        if (!window.ethereum) {
          return;
        }

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const liquidityPool =
          new Contract(
            CONTRACTS.LIQUIDITY_POOL,
            LiquidityPoolABI,
            provider
          );

        /*
         * LiquidityPool.sol
         *
         * uint256 public totalLosses;
         * uint256 public totalBorrowed;
         */

        const losses =
          await liquidityPool.totalLosses();

        const borrowed =
          await liquidityPool.totalBorrowed();

        setTotalLosses(
          Number(
            formatUnits(losses, 6)
          ).toFixed(2)
        );

        setTotalBorrowed(
          Number(
            formatUnits(borrowed, 6)
          ).toFixed(2)
        );

      } catch (error) {

        console.error(
          "Failed to fetch risk metrics",
          error
        );

      } finally {

        setLoading(false);

      }
    };

    fetchMetrics();

  }, []);

  return {
    loading,
    totalLosses,
    totalBorrowed,
    defaultedLoans,
  };
}