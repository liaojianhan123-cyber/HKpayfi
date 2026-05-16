"use client";

import useProtocolConfig
from "@/hooks/protocol/useProtocolConfig";

export default function ProtocolControlPanel() {

  const {
    config,
    loading,
  } = useProtocolConfig();

  if (loading) {
    return (
      <p className="hk-muted">
        Loading protocol config...
      </p>
    );
  }

  if (!config) {
    return (
      <p className="hk-error">
        Failed to load protocol config.
      </p>
    );
  }

  return (

    <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      gap-4
    ">

      {/* Pause Status */}
      <div className="
        hk-stat-card
      ">

        <p className="
          hk-stat-label
        ">
          Pause Status
        </p>

        <p className="
          text-xl
          font-semibold
          text-white
          mt-2
        ">
          {
            config.paused
              ? "Paused"
              : "Active"
          }
        </p>

      </div>

      {/* Max Advance Rate */}
      <div className="
        hk-stat-card
      ">

        <p className="
          hk-stat-label
        ">
          Max Advance Rate
        </p>

        <p className="
          text-xl
          font-semibold
          text-white
          mt-2
        ">
          {config.maxAdvanceRate / 100}%
        </p>

      </div>

      {/* Min APR */}
      <div className="
        hk-stat-card
      ">

        <p className="
          hk-stat-label
        ">
          Minimum APR
        </p>

        <p className="
          text-xl
          font-semibold
          text-white
          mt-2
        ">
          {config.minInterestRate / 100}%
        </p>

      </div>

      {/* Grace Period */}
      <div className="
        hk-stat-card
      ">

        <p className="
          hk-stat-label
        ">
          Grace Period
        </p>

        <p className="
          text-xl
          font-semibold
          text-white
          mt-2
        ">
          {config.gracePeriod} seconds
        </p>

      </div>

    </div>
  );
}
