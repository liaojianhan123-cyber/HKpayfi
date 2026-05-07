"use client";

import useCreditScore from "@/hooks/useCreditScore";

type WalletProps = {
  account: string | null;
  connectWallet: () => Promise<void>;
};

export default function CreditScorePanel({
  wallet,
}: {
  wallet: WalletProps;
}) {
  const { account } = wallet;

  const {
    profile,
    loading,
  } = useCreditScore(account || undefined);

  if (!account) {
    return (
      <p className="text-gray-500">
        Connect wallet to view credit score.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading credit profile...
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="text-gray-500">
        No credit profile found.
      </p>
    );
  }

  return (
    <div className="space-y-4">

      <div>
        <p className="text-sm text-gray-500">
          Credit Score
        </p>

        <h3 className="text-4xl font-bold">
          {profile.creditScore}
        </h3>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">
          Status
        </p>

        <div className="inline-flex px-4 py-2 rounded-full bg-gray-100">
          <span className="font-medium">
            {profile.status}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Rules:
        <br />
        Start at 50
        <br />
        +10 on-time repayment
        <br />
        -20 late repayment
        <br />
        Default → score reset to 0 + blacklist
      </div>

    </div>
  );
}