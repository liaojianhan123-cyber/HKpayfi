"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";

import EvaluationAgentABI from "@/abis/EvaluationAgent.json";
import { CONTRACTS } from "@/constants/contracts";

interface CreditProfile {
  creditScore: number;
  isBlacklisted: boolean;
  status: string;
}

export default function useCreditScore(account?: string) {
  const [profile, setProfile] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account || !window.ethereum) return;

    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!window.ethereum) return;

        const provider = new BrowserProvider(window.ethereum);

        const contract = new Contract(
          CONTRACTS.EVALUATION_AGENT,
          EvaluationAgentABI,
          provider
        );

        const p = await contract.getProfile(account);

        let status = "Risky";

        if (p.isBlacklisted) {
          status = "Blacklisted";
        } else if (Number(p.creditScore) >= 70) {
          status = "Good";
        }

        setProfile({
          creditScore: Number(p.creditScore),
          isBlacklisted: p.isBlacklisted,
          status,
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