"use client";

import React, { useState } from "react";
import { BudgetLine } from "@/lib/schemas/budgetLine";
import { BudgetCategory } from "@/lib/schemas/common";
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

const DEFAULT_CATEGORY_META = { icon: "📋", color: "bg-zinc-500" };

const CATEGORY_META: Record<BudgetCategory, { icon: string; color: string }> = {
  venue: { icon: "🏰", color: "bg-amber-500" },
  catering: { icon: "🍽️", color: "bg-emerald-500" },
  decor: { icon: "🌸", color: "bg-rose-500" },
  photography: { icon: "📸", color: "bg-violet-500" },
  attire: { icon: "👗", color: "bg-fuchsia-500" },
  entertainment: { icon: "🎶", color: "bg-indigo-500" },
  invitations: { icon: "💌", color: "bg-sky-500" },
  transport: { icon: "🚗", color: "bg-teal-500" },
  gifts: { icon: "🎁", color: "bg-pink-500" },
  accommodation: { icon: "🏨", color: "bg-blue-500" },
  contingency: { icon: "🛡️", color: "bg-slate-400" },
  other: { icon: "📋", color: "bg-zinc-500" },
};

function getCategoryMeta(category: BudgetCategory | string): { icon: string; color: string } {
  const found = CATEGORY_META[category as BudgetCategory];
  return found ?? DEFAULT_CATEGORY_META;
}

export function BudgetView({ lines, budgetTotal, onConfirmQuote }: BudgetViewProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  const currentTotal = lines.reduce((acc, l) => acc + l.amount, 0);
  const confirmedTotal = lines
    .filter((l) => l.source === "confirmed_quote")
    .reduce((acc, l) => acc + l.amount, 0);
  const confirmedCount = lines.filter((l) => l.source === "confirmed_quote").length;

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
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Target Budget */}
        <div className="p-5 rounded-3xl border border-white/5 bg-slate-900/70 backdrop-blur-xl shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Target Budget
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatINR(budgetTotal)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Hard cap apportioned to exact rupees
          </span>
        </div>

        {/* Current Plan Sum */}
        <div className="p-5 rounded-3xl border border-white/5 bg-slate-900/70 backdrop-blur-xl shadow-lg flex flex-col gap-1.5 relative overflow-hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current Plan Total
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatINR(currentTotal)}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="text-emerald-400 font-bold">{confirmedCount} locked</span>
            <span>•</span>
            <span>{lines.length - confirmedCount} AI estimates</span>
          </div>
        </div>

        {/* Overrun / Buffer Status */}
        <div
          className={`p-5 rounded-3xl border shadow-lg flex flex-col gap-1.5 relative overflow-hidden ${
            isOverBudget
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            {isOverBudget ? "Budget Overrun" : "Remaining Buffer / Contingency"}
          </span>
          <div className="flex items-center gap-2.5">
            {isOverBudget ? (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            )}
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatINR(Math.abs(overrun))}
            </span>
          </div>
          <span className="text-[11px] opacity-90">
            {isOverBudget
              ? "Rebalancing shifts surplus from lower priority categories"
              : "Plan strictly within allocated limits"}
          </span>
        </div>
      </div>

      {/* Visual Proportional Expenditure Bar */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/5 backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Visual Apportionment Distribution
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Confirmed: {formatINR(confirmedTotal)}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Estimates: {formatINR(currentTotal - confirmedTotal)}</span>
            </span>
          </div>
        </div>

        {/* Multi-segmented distribution bar */}
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner p-0.5 border border-slate-800">
          {lines.map((line) => {
            const pct = (line.amount / (currentTotal || 1)) * 100;
            const meta = getCategoryMeta(line.category);
            return (
              <div
                key={line.id}
                style={{ width: `${pct}%` }}
                className={`h-full ${meta.color} transition-all duration-300 first:rounded-l-full last:rounded-r-full relative group cursor-pointer`}
                title={`${line.label}: ${formatINR(line.amount)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-400">
          {lines.map((line) => {
            const meta = getCategoryMeta(line.category);
            return (
              <span key={line.id} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                <span className="text-slate-300 font-medium capitalize">{line.category}</span>
                <span className="font-mono text-slate-400 font-semibold">
                  {formatINR(line.amount)}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Budget Lines Table */}
      <div className="bg-slate-900/70 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3
              id="budget-heading"
              className="text-lg font-bold text-white flex items-center gap-2"
            >
              <span>💰</span>
              <span>Category Apportionment &amp; Quotes</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Honesty Rule: AI estimates are mathematically separated from legally agreed vendor
              quotes.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold self-start sm:self-auto">
            Largest-Remainder Exact Math
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Category &amp; Deliverables</th>
                <th className="py-3.5 px-5">Confidence &amp; Source</th>
                <th className="py-3.5 px-5">Apportioned Amount</th>
                <th className="py-3.5 px-5">Floor Cap</th>
                <th className="py-3.5 px-5 text-right">Contract Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {lines.map((line) => {
                const meta = getCategoryMeta(line.category);
                const isConfirmed = line.source === "confirmed_quote";

                return (
                  <tr
                    key={line.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isConfirmed ? "bg-emerald-950/10" : ""
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-slate-950/60 border border-slate-800 shrink-0">
                          {meta.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-base">{line.label}</span>
                          <span className="text-xs text-slate-400 capitalize font-medium">
                            {line.category}
                          </span>
                          {line.source === "ai_estimate" && line.rationale && (
                            <span className="text-xs text-slate-400 italic mt-0.5">
                              {line.rationale}
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-1">
                              <span>🔒</span>
                              <span>Vendor Contract: {line.vendorName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <EstimateBadge
                        source={line.source}
                        confidence={line.source === "ai_estimate" ? line.confidence : undefined}
                      />
                    </td>
                    <td className="py-4 px-5 font-bold font-mono text-white text-base">
                      {formatINR(line.amount)}
                    </td>
                    <td className="py-4 px-5 text-slate-400 text-xs font-mono font-medium">
                      {formatINR(line.floor)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleOpenConfirm(line)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                          isConfirmed
                            ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                            : "border border-slate-700 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 text-slate-200"
                        }`}
                      >
                        {isConfirmed ? "Edit Contract Quote" : "Confirm Quote"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Quote Modal */}
      {selectedLineId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 flex flex-col gap-5 text-white my-8">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <h3 id="confirm-modal-title" className="text-xl font-bold text-white">
                  Lock Confirmed Quote
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Replacing this estimate with an agreed vendor contract freezes this line. The pure
                math engine rebalances overruns across remaining estimates by priority.
              </p>
            </div>

            <form onSubmit={handleSaveQuote} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="vendor-name-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Vendor / Contractor Name
                </label>
                <input
                  id="vendor-name-input"
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Taj Palace Banquets, Royal Decors"
                  className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950 text-sm text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="quote-amount-input"
                  className="text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Agreed Total Amount (₹ INR)
                </label>
                <input
                  id="quote-amount-input"
                  type="number"
                  min={1}
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950 font-mono font-bold text-sm text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLineId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
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
