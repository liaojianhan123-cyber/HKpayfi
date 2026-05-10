"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BrowserProvider,
  Contract,
} from "ethers";

import LiquidityPoolABI
  from "@/abis/LiquidityPool.json";

import { CONTRACTS }
  from "@/constants/contracts";

export default function useLiquidityPool() {
  const [
    totalAssets,
    setTotalAssets,
  ] = useState("0");

  const [
    availableLiquidity,
    setAvailableLiquidity,
  ] = useState("0");

  const [
    totalBorrowed,
    setTotalBorrowed,
  ] = useState("0");

  const [
    totalInterestEarned,
    setTotalInterestEarned,
  ] = useState("0");

  const [
    totalLosses,
    setTotalLosses,
  ] = useState("0");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!window.ethereum) return;

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const contract = new Contract(
          CONTRACTS.LIQUIDITY_POOL,
          LiquidityPoolABI,
          provider
        );

        const [
          assets,
          liquidity,
          borrowed,
          interest,
          losses,
        ] = await Promise.all([
          contract.totalAssets(),
          contract.availableLiquidity(),
          contract.totalBorrowed(),
          contract.totalInterestEarned(),
          contract.totalLosses(),
        ]);

        setTotalAssets(
          (Number(assets) / 1e6).toFixed(2)
        );

        setAvailableLiquidity(
          (
            Number(liquidity) / 1e6
          ).toFixed(2)
        );

        setTotalBorrowed(
          (
            Number(borrowed) / 1e6
          ).toFixed(2)
        );

        setTotalInterestEarned(
          (
            Number(interest) / 1e6
          ).toFixed(2)
        );

        setTotalLosses(
          (
            Number(losses) / 1e6
          ).toFixed(2)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return {
    loading,
    totalAssets,
    availableLiquidity,
    totalBorrowed,
    totalInterestEarned,
    totalLosses,
  };
}