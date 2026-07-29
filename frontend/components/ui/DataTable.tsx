"use client";

import { type TableHTMLAttributes, type HTMLAttributes, forwardRef } from "react";

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-surface-900/60">
      <table ref={ref} className={`w-full text-left text-sm text-slate-300 ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <thead
    ref={ref}
    className={`border-b border-slate-800 bg-surface-850/80 text-xs font-semibold uppercase tracking-wider text-slate-400 ${className}`}
    {...props}
  >
    {children}
  </thead>
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <tbody ref={ref} className={`divide-y divide-slate-800/80 ${className}`} {...props}>
    {children}
  </tbody>
));
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className = "", children, ...props }, ref) => (
  <tr
    ref={ref}
    className={`transition-colors hover:bg-surface-800/60 ${className}`}
    {...props}
  >
    {children}
  </tr>
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className = "", children, ...props }, ref) => (
  <th ref={ref} className={`py-3 px-4 text-left font-semibold ${className}`} {...props}>
    {children}
  </th>
));
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className = "", children, ...props }, ref) => (
  <td ref={ref} className={`py-3.5 px-4 text-sm align-middle ${className}`} {...props}>
    {children}
  </td>
));
TableCell.displayName = "TableCell";
