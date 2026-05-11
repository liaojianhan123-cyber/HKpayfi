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
      <p className="text-gray-500">
        Loading protocol config...
      </p>
    );
  }

  if (!config) {
    return (
      <p className="text-red-500">
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
        border
        rounded-xl
        p-4
        bg-gray-50
      ">

        <p className="
          text-sm
          text-gray-500
        ">
          Pause Status
        </p>

        <p className="
          text-xl
          font-bold
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
        border
        rounded-xl
        p-4
        bg-gray-50
      ">

        <p className="
          text-sm
          text-gray-500
        ">
          Max Advance Rate
        </p>

        <p className="
          text-xl
          font-bold
          mt-2
        ">
          {config.maxAdvanceRate / 100}%
        </p>

      </div>

      {/* Min APR */}
      <div className="
        border
        rounded-xl
        p-4
        bg-gray-50
      ">

        <p className="
          text-sm
          text-gray-500
        ">
          Minimum APR
        </p>

        <p className="
          text-xl
          font-bold
          mt-2
        ">
          {config.minInterestRate / 100}%
        </p>

      </div>

      {/* Grace Period */}
      <div className="
        border
        rounded-xl
        p-4
        bg-gray-50
      ">

        <p className="
          text-sm
          text-gray-500
        ">
          Grace Period
        </p>

        <p className="
          text-xl
          font-bold
          mt-2
        ">
          {config.gracePeriod} seconds
        </p>

      </div>

    </div>
  );
}