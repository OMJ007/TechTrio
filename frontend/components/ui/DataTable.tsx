"use client";

import React from "react";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-[16px] border border-[#2A3140] bg-[#141824] ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead className="sticky top-0 bg-[#141824] border-b border-[#2A3140] z-10">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                } ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A3140]/60">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm font-mono text-[#9BA4B5]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`transition-colors hover:bg-[#1B2130] ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col, cIdx) => {
                  const content =
                    typeof col.accessor === "function"
                      ? col.accessor(item)
                      : (item[col.accessor] as React.ReactNode);

                  return (
                    <td
                      key={cIdx}
                      className={`px-4 py-3 text-sm text-white ${
                        col.isNumeric ? "font-mono tabular-nums" : ""
                      } ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
