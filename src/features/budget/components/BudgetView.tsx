"use client";

import React, { useState } from "react";
import { BudgetLine } from "@/lib/schemas/budgetLine";
import { formatINR } from "@/lib/money";
import { EstimateBadge } from "@/components/EstimateBadge";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface BudgetViewProps {
  lines: BudgetLine[];
  budgetTotal: number;
  onConfirmQuote: (
    lineId: string,
    quote: { amount: number; vendorName: string; on: string; guests?: number },
  ) => void;
}

export function BudgetView({ lines, budgetTotal, onConfirmQuote }: BudgetViewProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  const currentTotal = lines.reduce((acc, l) => acc + l.amount, 0);
  const overrun = currentTotal - budgetTotal;
  const isOverBudget = overrun > 0;

  const handleOpenConfirm = (line: BudgetLine) => {
    setSelectedLineId(line.id);
    setVendorName(line.source === "confirmed_quote" ? line.vendorName : "");
    setQuoteAmount(line.amount.toString());
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineId || !vendorName.trim() || !quoteAmount) return;

    const amount = parseInt(quoteAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    onConfirmQuote(selectedLineId, {
      amount,
      vendorName: vendorName.trim(),
      on: new Date().toISOString().slice(0, 10),
    });

    setSelectedLineId(null);
  };

  return (
    <div className="flex flex-col gap-6" aria-labelledby="budget-heading">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-lg flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Target Budget
          </span>
          <span className="text-2xl font-black text-white">{formatINR(budgetTotal)}</span>
        </div>

        <div className="p-5 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-lg flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Current Plan Total
          </span>
          <span className="text-2xl font-black text-white">{formatINR(currentTotal)}</span>
        </div>

        <div
          className={`p-5 rounded-3xl border shadow-lg flex flex-col gap-1 ${
            isOverBudget
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            {isOverBudget ? "Budget Overrun" : "Remaining Buffer"}
          </span>
          <div className="flex items-center gap-2">
            {isOverBudget ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-2xl font-black text-white">{formatINR(Math.abs(overrun))}</span>
          </div>
        </div>
      </div>

      {/* Budget Lines Table */}
      <div className="bg-slate-900/70 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 id="budget-heading" className="text-lg font-bold text-white">
            Category Apportionment &amp; Quotes
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Protected by largest-remainder exact math
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase">
                <th className="py-3.5 px-5">Category &amp; Label</th>
                <th className="py-3.5 px-5">Type / Source</th>
                <th className="py-3.5 px-5">Allocated Amount</th>
                <th className="py-3.5 px-5">Floor Cap</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{line.label}</span>
                      <span className="text-xs text-slate-400 capitalize">{line.category}</span>
                      {line.source === "ai_estimate" && (
                        <span className="text-xs text-slate-400 italic mt-0.5">
                          {line.rationale}
                        </span>
                      )}
                      {line.source === "confirmed_quote" && (
                        <span className="text-xs text-emerald-400 font-medium mt-0.5">
                          Vendor: {line.vendorName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <EstimateBadge
                      source={line.source}
                      confidence={line.source === "ai_estimate" ? line.confidence : undefined}
                    />
                  </td>
                  <td className="py-4 px-5 font-bold text-white">{formatINR(line.amount)}</td>
                  <td className="py-4 px-5 text-slate-400 text-xs font-mono">
                    {formatINR(line.floor)}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleOpenConfirm(line)}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {line.source === "confirmed_quote" ? "Edit Quote" : "Confirm Quote"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Quote Modal / Sheet */}
      {selectedLineId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 flex flex-col gap-5 text-white">
            <div>
              <h3 id="confirm-modal-title" className="text-xl font-bold text-white">
                Lock Confirmed Quote
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Replacing this estimate with an agreed quote will freeze this line and rebalance
                overruns across remaining estimates by priority.
              </p>
            </div>

            <form onSubmit={handleSaveQuote} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="vendor-name-input" className="text-sm font-semibold text-slate-200">
                  Vendor / Provider Name
                </label>
                <input
                  id="vendor-name-input"
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Taj Deccan Banquet, Royal Decors"
                  className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="quote-amount-input"
                  className="text-sm font-semibold text-slate-200"
                >
                  Confirmed Amount (₹ INR)
                </label>
                <input
                  id="quote-amount-input"
                  type="number"
                  min={1}
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedLineId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <span>Lock Quote &amp; Rebalance</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
