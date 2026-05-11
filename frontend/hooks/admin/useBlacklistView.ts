"use client";

import { useEffect, useState } from "react";

import {
  BrowserProvider,
  Contract,
} from "ethers";

import EvaluationAgentABI
from "@/abis/EvaluationAgent.json";

import { CONTRACTS }
from "@/constants/contracts";

type BlacklistedBorrower = {
  address: string;
  defaults: number;
  creditScore: number;
  isApproved: boolean;
};

export default function useBlacklistView() {
  const [blacklistedBorrowers,
    setBlacklistedBorrowers] = useState<
      BlacklistedBorrower[]
    >([]);

  const [loading, setLoading] =
    useState(false);

  const fetchBlacklistedBorrowers =
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

        const evaluationAgent =
          new Contract(
            CONTRACTS.EVALUATION_AGENT,
            EvaluationAgentABI,
            provider
          );

        /*
          Temporary borrower registry
          for MVP/demo purposes
        */

        const borrowerAddresses = [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
          "0x3333333333333333333333333333333333333333",
        ];

        const blacklistResults:
          BlacklistedBorrower[] = [];

        for (const borrower
          of borrowerAddresses) {

          try {
            const profile =
              await evaluationAgent
                .getProfile(borrower);

            const defaults =
              Number(profile.defaults);

            if (defaults > 0) {

              blacklistResults.push({
                address: borrower,
                defaults,
                creditScore:
                  Number(
                    profile.creditScore
                  ),
                isApproved:
                  profile.isApproved,
              });

            }

          } catch (error) {
            console.error(
              "Failed to fetch profile:",
              borrower,
              error
            );
          }
        }

        setBlacklistedBorrowers(
          blacklistResults
        );

      } catch (error) {

        console.error(
          "Failed to fetch blacklist:",
          error
        );

      } finally {

        setLoading(false);

      }
    };

    useEffect(() => {
    const loadBlacklist = async () => {
        await fetchBlacklistedBorrowers();
    };
    loadBlacklist();
    }, []);

  return {
    blacklistedBorrowers,
    loading,
    refreshBlacklist:
      fetchBlacklistedBorrowers,
  };
}