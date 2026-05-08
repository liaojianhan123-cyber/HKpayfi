"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";

import EvaluationAgentABI from "@/abis/EvaluationAgent.json";
import { CONTRACTS } from "@/constants/contracts";

export interface BorrowerProfile {
  isApproved: boolean;
  maxCreditLimit: string;
  interestRate: string;
  advanceRate: string;
  approvedAt: string;
  totalRepaid: string;
  onTimeRepayments: string;
  lateRepayments: string;
  defaults: string;
  creditScore: string;
}

export default function useBorrowerProfile(
  account?: string
) {
  const [loading, setLoading] =
    useState(false);

  const [profile, setProfile] =
    useState<BorrowerProfile | null>(
      null
    );

  useEffect(() => {
    if (!account) return;

    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!window.ethereum) return;

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const contract = new Contract(
          CONTRACTS.EVALUATION_AGENT,
          EvaluationAgentABI,
          provider
        );

        const p =
          await contract.getProfile(
            account
          );

        setProfile({
          isApproved: p.isApproved,
          maxCreditLimit:
            p.maxCreditLimit.toString(),
          interestRate:
            p.interestRate.toString(),
          advanceRate:
            p.advanceRate.toString(),
          approvedAt:
            p.approvedAt.toString(),
          totalRepaid:
            p.totalRepaid.toString(),
          onTimeRepayments:
            p.onTimeRepayments.toString(),
          lateRepayments:
            p.lateRepayments.toString(),
          defaults:
            p.defaults.toString(),
          creditScore:
            p.creditScore.toString(),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [account]);

  return {
    profile,
    loading,
  };
}