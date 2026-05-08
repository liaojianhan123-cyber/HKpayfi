"use client";

import { useEffect, useState } from "react";
import {BrowserProvider, Contract} from "ethers";

import CreditFacilityABI from "@/abis/CreditFacility.json";
import { CONTRACTS } from "@/constants/contracts";

export interface CreditLine {
  borrower: string;
  receivableTokenId: string;
  creditLimit: string;
  drawn: string;
  interestRate: string;
  drawdownTime: string;
  dueDate: string;
  totalRepaid: string;
  stakeAmount: string;
  hasTokenDiscount: boolean;
  state: number;
}

export function useCreditFacility(
  creditLineId?: string
) {
  const [loading, setLoading] =
    useState(false);

  const [creditLine, setCreditLine] =
    useState<CreditLine | null>(null);

  const applyForCredit = async (
    tokenId: number
  ) => {
    if (!window.ethereum) return;

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
      await contract.apply(tokenId);

    await tx.wait();

    return tx;
  };

  useEffect(() => {
    if (!creditLineId) return;

    const loadCreditLine = async () => {
      try {
        setLoading(true);

        if (!window.ethereum) return;

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const contract = new Contract(
          CONTRACTS.CREDIT_FACILITY,
          CreditFacilityABI,
          provider
        );

        const line =
          await contract.creditLines(
            creditLineId
          );

        setCreditLine({
          borrower: line.borrower,
          receivableTokenId:
            line.receivableTokenId.toString(),
          creditLimit:
            line.creditLimit.toString(),
          drawn:
            line.drawn.toString(),
          interestRate:
            line.interestRate.toString(),
          drawdownTime:
            line.drawdownTime.toString(),
          dueDate:
            line.dueDate.toString(),
          totalRepaid:
            line.totalRepaid.toString(),
          stakeAmount:
            line.stakeAmount.toString(),
          hasTokenDiscount:
            line.hasTokenDiscount,
          state:
            Number(line.state),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCreditLine();
  }, [creditLineId]);

  return {
    applyForCredit,
    creditLine,
    loading,
  };
}