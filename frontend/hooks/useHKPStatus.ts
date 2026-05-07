"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";

import HKPTokenABI from "@/abis/HKPayToken.json";
import CreditFacilityABI from "@/abis/CreditFacility.json";

import { CONTRACTS } from "@/constants/contracts";

interface HKPStatus {
  isHolder: boolean;
  balance: string;
  aprDiscount: number;
  graceBonusDays: number;
}

export default function useHKPStatus(account?: string) {
  const [status, setStatus] = useState<HKPStatus | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account || !window.ethereum) return;

    const loadStatus = async () => {
      try {
        setLoading(true);

        if (!window.ethereum) return;

        const provider = new BrowserProvider(window.ethereum);

        const hkp = new Contract(
          CONTRACTS.HKP_TOKEN,
          HKPTokenABI,
          provider
        );

        const facility = new Contract(
          CONTRACTS.CREDIT_FACILITY,
          CreditFacilityABI,
          provider
        );

        const [
          balanceRaw,
          qualifies,
          discountBps,
          graceBonus,
        ] = await Promise.all([
          hkp.balanceOf(account),
          facility.qualifiesForTokenPerks(account),
          facility.tokenHolderAprDiscountBps(),
          facility.tokenHolderGraceBonus(),
        ]);

        setStatus({
          isHolder: qualifies,
          balance: formatUnits(balanceRaw, 18),
          aprDiscount: Number(discountBps) / 100,
          graceBonusDays:
            Number(graceBonus) / 86400,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [account]);

  return {
    status,
    loading,
  };
}