"use client";

import { useState } from "react";
import { BrowserProvider, Contract, parseUnits, type Eip1193Provider } from "ethers";

import EvaluationAgentABI from "@/abis/EvaluationAgent.json";
import ProtocolConfigABI from "@/abis/ProtocolConfig.json";

import { CONTRACTS } from "@/constants/contracts";

export default function useUnderwritingAndApproveBorrower() {
  const [loading, setLoading] = useState(false);

  const approveBorrower = async (
    borrower: string,
    creditLimit: string,
    interestRate: string,
    advanceRate: string
  ) => {
    try {
      setLoading(true);

        const ethereum =
        (
            window as Window &
            typeof globalThis & {
            ethereum?: Eip1193Provider;
            }
        ).ethereum;

        if (!ethereum) {
        alert("MetaMask not detected");
        return;
        }

        const provider = new BrowserProvider(ethereum);

      const signer = await provider.getSigner();

      const config = new Contract(
        CONTRACTS.CONFIG,
        ProtocolConfigABI,
        provider
      );

      const minInterestRate =
        await config.minInterestRate();

      const maxAdvanceRate =
        await config.maxAdvanceRate();

      if (Number(interestRate) < Number(minInterestRate)) {
        alert(
          `APR below minimum protocol APR (${minInterestRate})`
        );
        return;
      }

      if (Number(advanceRate) > Number(maxAdvanceRate)) {
        alert(
          `Advance rate exceeds protocol maximum (${maxAdvanceRate})`
        );
        return;
      }

      const evaluationAgent = new Contract(
        CONTRACTS.EVALUATION_AGENT,
        EvaluationAgentABI,
        signer
      );

      const tx =
        await evaluationAgent.approveBorrower(
          borrower,
          parseUnits(creditLimit, 6),
          interestRate,
          advanceRate
        );

      await tx.wait();

      alert("Borrower approved successfully");
    } catch (error) {
      console.error(error);
      alert("Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const revokeBorrower = async (
    borrower: string
  ) => {
    try {
      setLoading(true);

        const ethereum =
        (
            window as Window &
            typeof globalThis & {
            ethereum?: Eip1193Provider;
            }
        ).ethereum;

        if (!ethereum) {
        alert("MetaMask not detected");
        return;
        }

        const provider = new BrowserProvider(ethereum);

      const signer = await provider.getSigner();

      const evaluationAgent = new Contract(
        CONTRACTS.EVALUATION_AGENT,
        EvaluationAgentABI,
        signer
      );

      const tx =
        await evaluationAgent.revokeBorrower(
          borrower
        );

      await tx.wait();

      alert("Borrower revoked successfully");
    } catch (error) {
      console.error(error);
      alert("Revocation failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    approveBorrower,
    revokeBorrower,
    loading,
  };
}