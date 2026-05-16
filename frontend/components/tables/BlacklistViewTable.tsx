"use client";

import useBlacklistView
from "@/hooks/admin/useBlacklistView";

export default function BlacklistViewTable() {

  const {
    blacklistedBorrowers,
    loading,
  } = useBlacklistView();

  if (loading) {
    return (
      <p className="hk-muted">
        Loading blacklist...
      </p>
    );
  }

  if (
    blacklistedBorrowers.length === 0
  ) {
    return (
      <div className="hk-panel-subtle">
        <p className="hk-muted">
          No blacklisted borrowers found.
        </p>
      </div>
    );
  }

  return (
    <div className="hk-table-wrap">

      <table className="
        hk-table
      ">

        <thead>

          <tr>
            <th className="hk-th">
              Borrower
            </th>

            <th className="hk-th">
              Defaults
            </th>

            <th className="hk-th">
              Credit Score
            </th>

            <th className="hk-th">
              Status
            </th>
          </tr>

        </thead>

        <tbody>

          {blacklistedBorrowers.map(
            (borrower) => (

            <tr
              key={borrower.address}
              className="
                transition
                hover:bg-white/[0.03]
              "
            >

              <td className="
                hk-td
                font-mono
                text-sm
              ">
                {borrower.address}
              </td>

              <td className="hk-td">
                {borrower.defaults}
              </td>

              <td className="hk-td">
                {borrower.creditScore}
              </td>

              <td className="hk-td">

                <span className="
                  border
                  border-red-400/25
                  bg-red-500/10
                  text-red-100
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-medium
                ">
                  Blacklisted
                </span>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}
