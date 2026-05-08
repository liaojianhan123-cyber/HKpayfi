"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BrowserProvider,
  Contract,
} from "ethers";

import ConfigABI
  from "@/abis/ProtocolConfig.json";

import { CONTRACTS }
  from "@/constants/contracts";

type Params = {
  dueDate?: string;
  principal?: string;
  interestRate?: string;
  stakeAmount?: string;
};

export default function usePenaltyStatus({
  dueDate,
  principal,
  interestRate,
  stakeAmount,
}: Params) {
  const [
    gracePeriod,
    setGracePeriod,
  ] = useState(0);

  const [loading, setLoading] =
  useState(true);

  const [currentTime] = useState(
    () => Math.floor(Date.now() / 1000)
  );

    useEffect(() => {
    const load = async () => {
        try {
        if (!window.ethereum) return;

        const provider =
            new BrowserProvider(
            window.ethereum
            );

        const contract = new Contract(
            CONTRACTS.CONFIG,
            ConfigABI,
            provider
        );

        const value =
            await contract.defaultGracePeriod();

        setGracePeriod(
            Number(value)
        );
        } catch (err) {
        console.error(err);
        } finally {
        setLoading(false);
        }
    };

    load();
    }, []);

  const due =
    dueDate
      ? Number(dueDate)
      : 0;

  const principalValue =
    principal
      ? Number(principal) / 1e6
      : 0;

  const baseApr =
    interestRate
      ? Number(interestRate) / 100
      : 0;

  const penaltyApr =
    (baseApr * 1.5).toFixed(2);

  const sellerStake =
    stakeAmount
      ? Number(stakeAmount) / 1e6
      : 0;

  const isOverdue =
    currentTime > due;

  const isDefaulted =
    currentTime >
    due + gracePeriod;

  const graceRemaining =
    isOverdue && !isDefaulted
      ? Math.max(
          due +
            gracePeriod -
            currentTime,
          0
        )
      : 0;

  const lpLossExposure =
    Math.max(
      principalValue -
        sellerStake,
      0
    );

  return {
    loading,
    baseApr,
    penaltyApr,
    isOverdue,
    isDefaulted,
    graceRemaining,
    sellerStake,
    lpLossExposure,
  };
}