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
      <p className="text-gray-500">
        Loading blacklist...
      </p>
    );
  }

  if (
    blacklistedBorrowers.length === 0
  ) {
    return (
      <div className="
        bg-gray-50
        border
        rounded-xl
        p-6
      ">
        <p className="text-gray-500">
          No blacklisted borrowers found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">

      <table className="
        w-full
        border-collapse
      ">

        <thead>

          <tr className="
            border-b
            text-left
          ">
            <th className="p-4">
              Borrower
            </th>

            <th className="p-4">
              Defaults
            </th>

            <th className="p-4">
              Credit Score
            </th>

            <th className="p-4">
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
                border-b
                hover:bg-gray-50
              "
            >

              <td className="
                p-4
                font-mono
                text-sm
              ">
                {borrower.address}
              </td>

              <td className="p-4">
                {borrower.defaults}
              </td>

              <td className="p-4">
                {borrower.creditScore}
              </td>

              <td className="p-4">

                <span className="
                  bg-red-100
                  text-red-700
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