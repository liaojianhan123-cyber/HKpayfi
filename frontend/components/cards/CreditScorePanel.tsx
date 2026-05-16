"use client";

import useCreditScore from "@/hooks/seller/useCreditScore";

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
      <p className="hk-muted">
        Connect wallet to view credit score.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="hk-muted">
        Loading credit profile...
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="hk-muted">
        No credit profile found.
      </p>
    );
  }

  return (
    <div className="space-y-4">

      <div>
        <p className="hk-stat-label">
          Credit Score
        </p>

        <h3 className="text-5xl font-semibold text-white">
          {profile.creditScore}
        </h3>
      </div>

      <div>
        <p className="mb-2 text-sm text-neutral-400">
          Status
        </p>

        <div className="hk-pill">
          <span className="font-medium">
            {profile.status}
          </span>
        </div>
      </div>

      <div className="hk-warning">
        Rules:
        <br />
        Start at 50
        <br />
        +10 on-time repayment
        <br />
        -20 late repayment
        <br />
        Default resets score to 0 + blacklist
      </div>

    </div>
  );
}
