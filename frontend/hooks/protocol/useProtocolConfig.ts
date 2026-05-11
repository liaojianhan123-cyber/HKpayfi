"use client";

import { useEffect, useState } from "react";

import {
  BrowserProvider,
  Contract,
} from "ethers";

import ProtocolConfigABI
from "@/abis/ProtocolConfig.json";

import { CONTRACTS }
from "@/constants/contracts";

type ProtocolConfigData = {
  paused: boolean;
  maxAdvanceRate: number;
  minInterestRate: number;
  gracePeriod: number;
};

export default function useProtocolConfig() {

  const [config,
    setConfig] =
      useState<ProtocolConfigData | null>(
        null
      );

  const [loading, setLoading] =
    useState(false);

  const fetchProtocolConfig =
    async () => {

      try {

        setLoading(true);

        if (
          typeof window === "undefined" ||
          !window.ethereum
        ) {
          return;
        }

        const provider =
          new BrowserProvider(
            window.ethereum
          );

        const protocolConfig =
          new Contract(
            CONTRACTS.CONFIG,
            ProtocolConfigABI,
            provider
          );

        const paused =
          await protocolConfig.paused();

        const maxAdvanceRate =
          await protocolConfig
            .maxAdvanceRate();

        const minInterestRate =
          await protocolConfig
            .minInterestRate();

        const gracePeriod =
          await protocolConfig.defaultGracePeriod();

        setConfig({
          paused,
          maxAdvanceRate:
            Number(maxAdvanceRate),
          minInterestRate:
            Number(minInterestRate),
          gracePeriod:
            Number(gracePeriod),
        });

      } catch (error) {

        console.error(
          "Failed to fetch protocol config:",
          error
        );

      } finally {

        setLoading(false);

      }
    };

    useEffect(() => {
        const loadProtocolConfig =
            async () => {
                await fetchProtocolConfig();
            };
        void loadProtocolConfig();
    }, []);

  return {
    config,
    loading,
    refreshProtocolConfig:
      fetchProtocolConfig,
  };
}