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
  /** Real on-chain accrued interest (already includes penalty if overdue). USDC 6dp raw. */
  accruedInterest?: string;
  /** Total amount owed right now = drawn + accruedInterest. USDC 6dp raw. */
  totalOwed?: string;
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
    // Guard against negative or non-numeric IDs — ethers fails to encode
    // negative values into uint256, throwing "value out-of-bounds".
    if (!creditLineId) return;
    const idNum = Number(creditLineId);
    if (!Number.isFinite(idNum) || idNum < 0) return;

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

        // Fetch real-time accrued interest + total owed from chain.
        // These reflect the actual amount the borrower must repay NOW
        // (not the maximum lifetime interest).
        let accruedInterest = "0";
        let totalOwed = "0";
        try {
          const [acc, owed] = await Promise.all([
            contract.calculateInterest(creditLineId),
            contract.totalOwed(creditLineId),
          ]);
          accruedInterest = acc.toString();
          totalOwed = owed.toString();
        } catch {
          // calculateInterest / totalOwed may revert for non-active lines — leave 0
        }

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
          accruedInterest,
          totalOwed,
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