"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BrowserProvider,
  Contract,
  formatUnits,
} from "ethers";

import HKPTokenABI
  from "@/abis/HKPayToken.json";

import { CONTRACTS }
  from "@/constants/contracts";

type HKPPerks = {
  balance: string;
  isHolder: boolean;
  aprDiscount: number;
  graceBonusDays: number;
};

const HOLDER_THRESHOLD = 1000;

export default function useHKPPerks(
  account?: string
) {
  const [loading, setLoading] =
    useState(true);

  const [perks, setPerks] =
    useState<HKPPerks | null>(
      null
    );

  useEffect(() => {
    if (!account) return;

    const load = async () => {
      try {
        if (!window.ethereum)
          return;

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const contract =
          new Contract(
            CONTRACTS.HKP_TOKEN,
            HKPTokenABI,
            provider
          );

        const rawBalance =
          await contract.balanceOf(
            account
          );

        const balance =
          Number(
            formatUnits(
              rawBalance,
              18
            )
          );

        const isHolder =
          balance >=
          HOLDER_THRESHOLD;

        setPerks({
          balance:
            balance.toFixed(2),
          isHolder,
          aprDiscount:
            isHolder ? 2 : 0,
          graceBonusDays:
            isHolder ? 3 : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [account]);

  return {
    loading,
    perks,
  };
}