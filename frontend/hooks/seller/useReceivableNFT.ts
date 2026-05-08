"use client";

import { ethers } from "ethers";
import abi from "@/abis/ReceivableNFT.json";
import { CONTRACTS } from "@/constants/contracts";

export function useReceivableNFT() {
  async function mintReceivable({
    payer,
    amount,
    dueDate,
    invoiceId,
  }: {
    payer: string;
    amount: string;
    dueDate: number;
    invoiceId: string;
  }) {
    if (!window.ethereum) throw new Error("MetaMask not found");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      CONTRACTS.RECEIVABLE_NFT,
      abi,
      signer
    );

    const tx = await contract.mint(
      payer,
      ethers.parseUnits(amount, 6), // USDC = 6 decimals
      dueDate,
      invoiceId
    );

    await tx.wait();
    return tx.hash;
  }

  return { mintReceivable };
}