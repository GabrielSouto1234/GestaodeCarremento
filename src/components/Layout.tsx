import React from 'react';
import { Truck } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  protocol?: string;
  hideHeader?: boolean;
}

export const Layout = ({ children, protocol, hideHeader }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!hideHeader && (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">CheckTruck</h1>
            </div>
            {protocol && (
              <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {protocol}
              </div>
            )}
          </div>
        </header>
      )}
      <main className={cn("mx-auto max-w-lg p-4 pb-24", hideHeader && "flex min-h-screen items-center justify-center")}>
        {children}
      </main>
    </div>
  );
};
