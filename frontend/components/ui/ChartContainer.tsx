"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: string | number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  height = 300,
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && (
            <p className="mt-1 text-xs text-[#9BA4B5]">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="pt-2">
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
};
