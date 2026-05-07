"use client";

import { BrowserProvider, Contract } from "ethers";

import CreditFacilityABI from "@/abis/CreditFacility.json";
import { CONTRACTS } from "@/constants/contracts";

export function useCreditFacility() {

  const applyForCredit = async (tokenId: number) => {
    if (!window.ethereum) {
      throw new Error("Wallet not found");
    }

    const provider = new BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();

    const contract = new Contract(
      CONTRACTS.CREDIT_FACILITY,
      CreditFacilityABI,
      signer
    );

    const tx = await contract.applyForCredit(tokenId);

    await tx.wait();

    return tx.hash;
  };

  return {
    applyForCredit,
  };
}