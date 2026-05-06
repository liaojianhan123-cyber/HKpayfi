"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";

import ReceivableNFTABI from "@/abis/ReceivableNFT.json";
import { CONTRACTS } from "@/constants/contracts";

export interface Receivable {
  tokenId: number;
  borrower: string;
  payer: string;
  faceAmount: string;
  dueDate: number;
  createdAt: number;
  state: number;
  invoiceId: string;
}

const STATE_LABELS = [
  "Created",
  "Approved",
  "Financed",
  "Paid",
  "Defaulted",
];

export function useReceivables(account?: string) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;

    const loadReceivables = async () => {
      try {
        setLoading(true);

        if (!window.ethereum) return;

        const provider = new BrowserProvider(window.ethereum);

        const contract = new Contract(
          CONTRACTS.RECEIVABLE_NFT,
          ReceivableNFTABI,
          provider
        );

        const items: Receivable[] = [];

        // Simple scan for demo project
        for (let tokenId = 0; tokenId < 50; tokenId++) {
          try {
            const r = await contract.getReceivable(tokenId);

            if (r.borrower.toLowerCase() !== account.toLowerCase()) {
              continue;
            }

            items.push({
              tokenId,
              borrower: r.borrower,
              payer: r.payer,
              faceAmount: r.faceAmount.toString(),
              dueDate: Number(r.dueDate),
              createdAt: Number(r.createdAt),
              state: Number(r.state),
              invoiceId: r.invoiceId,
            });
          } catch {
            continue;
          }
        }

        setReceivables(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReceivables();
  }, [account]);

  return {
    receivables,
    loading,
    STATE_LABELS,
  };
}
