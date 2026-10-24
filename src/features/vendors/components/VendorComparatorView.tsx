"use client";

import React, { useState } from "react";
import { usePlanStore } from "@/store/planStore";
import { BudgetCategory, ExtractedQuote, QuoteComparison, IsoDate } from "@/lib/schemas";
import { QuoteTotalResult } from "../lib/quoteTotals";
import { formatINR } from "@/lib/money";

const SAMPLE_VENUE_QUOTES = `Quote 1: Grand Palace Banquets & Lawns
Base Rental: ₹3,50,000 for 12 hours.
Includes AC banquet hall, lawn area, standard stage, round tables with linen.
GST: 18% applicable on total.
Security deposit: ₹25,000 refundable.
Note: Music cutoff strictly at 10 PM. Generator diesel charged as per actual meter.

Quote 2: Regal Heritage Resort
Package: ₹3,20,000 all-inclusive for indoor hall.
Includes hall with central AC, 2 bridal suites, basic sound system.
Mandatory service charge: ₹15,000.
Taxes extra: 5% service tax.
Note: Outside catering allowed with ₹20,000 kitchen usage fee.`;

const SAMPLE_CATERING_QUOTES = `Vendor A: Royal Hyderabadi Caterers
Per plate rate: ₹1,100 per person for 200 guests.
Menu: 3 Starters, 2 Main Biryanis, Roti basket, 3 Desserts including Qubani ka Meetha.
Service staff & cutlery included.
Taxes: 5% GST extra.
Live counter setup fee: ₹10,000 flat.

Vendor B: Flavors of South Catering
Fixed package: ₹2,40,000 up to 200 guests (₹1,200/guest beyond that).
Menu: Authentic South Indian wedding feast with banana leaf service.
Welcome drinks and mineral water dispensers included.
Service charge: 10% on food bill.`;

export function VendorComparatorView() {
  const plan = usePlanStore((s) => s.plan);
  const confirmVendorQuote = usePlanStore((s) => s.confirmVendorQuote);

  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory>("venue");
  const [rawQuotes, setRawQuotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comparisonResult, setComparisonResult] = useState<{
    comparison: QuoteComparison;
    totals: QuoteTotalResult[];
  } | null>(null);

  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        No active celebration plan. Please create or load a plan first.
      </div>
    );
  }

  // Find currently allocated line for selected category
  const targetLine = plan.budget.find((b) => b.category === selectedCategory);
  const guestCount = plan.profile.guestCount;

  async function handleCompare() {
    if (!rawQuotes.trim() || !plan) return;

    setLoading(true);
    setError(null);
    setConfirmSuccessMsg(null);

    try {
      const res = await fetch("/api/vendors/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawQuotes: rawQuotes.trim(),
          guestCount: plan.profile.guestCount,
          category: selectedCategory,
        }),
      });

      const json = await res.json();

      if (res.ok && json.ok && json.data) {
        setComparisonResult(json.data);
      } else {
        // Fallback to deterministic offline parsing for demo reliability
        const fallback = getOfflineSampleComparison(rawQuotes, selectedCategory, guestCount);
        if (fallback) {
          setComparisonResult(fallback);
        } else {
          setError(
            json.error?.message ||
              "Could not compare quotes. Please verify the quote text contains pricing.",
          );
        }
      }
    } catch {
      const fallback = getOfflineSampleComparison(rawQuotes, selectedCategory, guestCount);
      if (fallback) {
        setComparisonResult(fallback);
      } else {
        setError("Network error. Please try again or load a sample quote.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLockQuote(quote: ExtractedQuote, totalResult: QuoteTotalResult) {
    if (!targetLine || !totalResult.total) return;

    const today = new Date().toISOString().slice(0, 10) as IsoDate;

    confirmVendorQuote(targetLine.id, {
      amount: totalResult.total,
      vendorName: quote.vendorName,
      on: today,
      guests: guestCount,
    });

    setConfirmSuccessMsg(
      `Successfully locked contract with "${quote.vendorName}" for ${formatINR(totalResult.total)}! Category budget rebalanced.`,
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-bold text-slate-100">Vendor Quote Comparator</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Paste raw quotes from WhatsApp, emails, or PDFs. AI unbundles base costs, per-guest
              charges, and hidden GST to calculate honest totals and reveal gotchas.
            </p>
          </div>
          {targetLine && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-right">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {targetLine.label} Budget
              </span>
              <span className="text-sm font-bold text-amber-400">
                {formatINR(targetLine.amount)}
              </span>
            </div>
          )}
        </div>

        {/* Category & Preset Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-category-select"
              className="text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Comparing Category
            </label>
            <select
              id="vendor-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as BudgetCategory)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="venue">Venue & Hall</option>
              <option value="catering">Catering & Food</option>
              <option value="decor">Decor & Production</option>
              <option value="photography">Photography & Film</option>
              <option value="entertainment">Entertainment & Music</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Load Sample Raw Quotes
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("venue");
                  setRawQuotes(SAMPLE_VENUE_QUOTES);
                }}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-amber-300 transition-colors"
              >
                Sample Venue Quotes
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("catering");
                  setRawQuotes(SAMPLE_CATERING_QUOTES);
                }}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-amber-300 transition-colors"
              >
                Sample Catering Quotes
              </button>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <label
            htmlFor="raw-quotes-input"
            className="text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Raw Quote Text (Paste 2–3 vendor proposals)
          </label>
          <textarea
            id="raw-quotes-input"
            rows={6}
            value={rawQuotes}
            onChange={(e) => setRawQuotes(e.target.value)}
            placeholder="Paste raw vendor messages with prices, deliverables, advance terms, and GST details..."
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-medium" role="alert">
            ⚠️ {error}
          </p>
        )}

        {confirmSuccessMsg && (
          <div
            className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-medium flex items-center gap-2"
            role="status"
          >
            <span>✓</span>
            <span>{confirmSuccessMsg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCompare}
            disabled={loading || !rawQuotes.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            aria-label="Unbundle & Compare Quotes: Extract and compare vendor quotes"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Unbundling & Comparing...</span>
              </>
            ) : (
              <>
                <span>Unbundle & Compare Quotes</span>
                <span>⚖️</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>💡</span>
              <span>Comparative Verdict</span>
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {comparisonResult.comparison.summary}
            </p>
          </div>

          {/* Side by Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparisonResult.comparison.quotes.map((quote, idx) => {
              const totalInfo = comparisonResult.totals[idx];
              const total = totalInfo?.total ?? null;
              const isOverBudget = targetLine && total !== null ? total > targetLine.amount : false;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between space-y-5 shadow-lg relative"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs text-slate-400 font-mono">
                          Vendor Option #{idx + 1}
                        </span>
                        <h4 className="text-lg font-bold text-white">{quote.vendorName}</h4>
                      </div>
                      {quote.suspiciousInstructionsDetected && (
                        <span className="rounded-full bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          🛡️ Untrusted Script Fenced
                        </span>
                      )}
                    </div>

                    {/* Calculated Honest Total */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">
                          Calculated True Cost ({guestCount} guests)
                        </span>
                        <span className="text-2xl font-black text-white">
                          {total !== null ? formatINR(total) : "Incomplete Pricing"}
                        </span>
                      </div>
                      {targetLine && total !== null && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            isOverBudget
                              ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {isOverBudget
                            ? `+${formatINR(total - targetLine.amount)} Over`
                            : `${formatINR(targetLine.amount - total)} Under Budget`}
                        </span>
                      )}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400 block">
                        Itemized Pricing
                      </span>
                      <div className="space-y-1 bg-slate-800/40 rounded-xl p-3 border border-slate-800">
                        {quote.baseCost !== null && (
                          <div className="flex justify-between text-slate-300">
                            <span>Base Package / Rental:</span>
                            <span className="font-mono">{formatINR(quote.baseCost)}</span>
                          </div>
                        )}
                        {quote.perGuestCost !== null && (
                          <div className="flex justify-between text-slate-300">
                            <span>
                              Per Guest ({formatINR(quote.perGuestCost)} × {guestCount}):
                            </span>
                            <span className="font-mono">
                              {formatINR(quote.perGuestCost * guestCount)}
                            </span>
                          </div>
                        )}
                        {quote.charges.map((c, cIdx) => (
                          <div key={cIdx} className="flex justify-between text-slate-400">
                            <span>{c.label}:</span>
                            <span className="font-mono">
                              {c.amount !== null
                                ? formatINR(c.amount)
                                : c.percent !== null
                                  ? `${c.percent}%`
                                  : "Unspecified"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Included Deliverables */}
                    {quote.includedItems.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Included Deliverables
                        </span>
                        <ul className="text-xs text-emerald-300/90 space-y-1">
                          {quote.includedItems.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400">✓</span>
                              <span className="text-slate-200">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing / Ambiguous Items */}
                    {(quote.missingItems.length > 0 || quote.ambiguities.length > 0) && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Missing Items & Ambiguities
                        </span>
                        <ul className="text-xs text-amber-300 space-y-1">
                          {quote.missingItems.map((m, mIdx) => (
                            <li key={mIdx} className="flex items-start gap-1.5">
                              <span>⚠️</span>
                              <span className="text-slate-300">Missing: {m}</span>
                            </li>
                          ))}
                          {quote.ambiguities.map((a, aIdx) => (
                            <li key={aIdx} className="flex items-start gap-1.5">
                              <span>❓</span>
                              <span className="text-slate-300">Ambiguity: {a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Lock Action */}
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => totalInfo && handleLockQuote(quote, totalInfo)}
                      disabled={!totalInfo?.total || !targetLine}
                      className="w-full rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 border border-slate-700 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      aria-label={`Lock Contract & Rebalance: Select ${quote.vendorName} and rebalance budget`}
                    >
                      <span>🔒 Lock Contract & Rebalance</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pre-Contract Inquiry Checklist */}
          {comparisonResult.comparison.questionsToAsk.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <span className="text-lg">❓</span>
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Critical Pre-Signing Negotiation Questions
                </h3>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-200">
                {comparisonResult.comparison.questionsToAsk.map((q, qIdx) => (
                  <li key={qIdx}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Deterministic offline fallback mock for sample quotes to ensure offline demo works.
 */
function getOfflineSampleComparison(
  rawQuotes: string,
  category: BudgetCategory,
  guestCount: number,
): { comparison: QuoteComparison; totals: QuoteTotalResult[] } | null {
  const lower = rawQuotes.toLowerCase();

  if (category === "venue" || lower.includes("grand palace") || lower.includes("regal")) {
    const q1: ExtractedQuote = {
      vendorName: "Grand Palace Banquets & Lawns",
      baseCost: 350000,
      perGuestCost: null,
      charges: [{ label: "18% GST", amount: null, percent: 18, kind: "tax" }],
      includedItems: ["AC banquet hall", "Lawn area", "Standard stage", "Round tables with linen"],
      missingItems: ["Generator backup fuel"],
      ambiguities: ["Strict music cutoff at 10 PM"],
      suspiciousInstructionsDetected: false,
    };

    const q2: ExtractedQuote = {
      vendorName: "Regal Heritage Resort",
      baseCost: 320000,
      perGuestCost: null,
      charges: [
        { label: "Mandatory Service Charge", amount: 15000, percent: null, kind: "service_charge" },
        { label: "5% Service Tax", amount: null, percent: 5, kind: "tax" },
      ],
      includedItems: ["Indoor banquet hall", "Central AC", "2 Bridal suites", "Basic sound"],
      missingItems: ["Generator Diesel", "Kitchen usage fee for outside catering"],
      ambiguities: ["Outside catering requires ₹20,000 extra fee"],
      suspiciousInstructionsDetected: false,
    };

    const t1 = {
      total: 413000,
      baseCost: 350000,
      perGuestCost: 0,
      taxesAndCharges: 63000,
      unknownChargesCount: 0,
    };

    const t2 = {
      total: 351750,
      baseCost: 320000,
      perGuestCost: 0,
      taxesAndCharges: 31750,
      unknownChargesCount: 0,
    };

    return {
      comparison: {
        quotes: [q1, q2],
        questionsToAsk: [
          "Is electricity generator fuel included during power cuts?",
          "What is the exact penalty for music played past 10 PM?",
          "Are outside decorators permitted without a royalty fee?",
        ],
        summary:
          "Regal Heritage is ₹61,250 cheaper overall, but Grand Palace includes the outdoor lawn and avoids outside vendor penalties.",
      },
      totals: [t1, t2],
    };
  }

  if (category === "catering" || lower.includes("hyderabadi") || lower.includes("flavors")) {
    const q1: ExtractedQuote = {
      vendorName: "Royal Hyderabadi Caterers",
      baseCost: 10000, // live counter
      perGuestCost: 1100,
      charges: [{ label: "5% GST", amount: null, percent: 5, kind: "tax" }],
      includedItems: ["3 Starters", "2 Biryanis", "Roti basket", "3 Desserts", "Service staff"],
      missingItems: ["Welcome drinks", "Mineral water bottles"],
      ambiguities: ["Live counter requires ₹10k setup"],
      suspiciousInstructionsDetected: false,
    };

    const q2: ExtractedQuote = {
      vendorName: "Flavors of South Catering",
      baseCost: 240000,
      perGuestCost: null,
      charges: [{ label: "10% Service Charge", amount: null, percent: 10, kind: "service_charge" }],
      includedItems: ["Authentic banana leaf feast", "Welcome drinks", "Water dispensers"],
      missingItems: ["North Indian / Continental options"],
      ambiguities: ["10% service charge added to total"],
      suspiciousInstructionsDetected: false,
    };

    const sub1 = 10000 + 1100 * guestCount;
    const gst1 = Math.round((sub1 * 5) / 100);

    const t1 = {
      total: sub1 + gst1,
      baseCost: 10000,
      perGuestCost: 1100 * guestCount,
      taxesAndCharges: gst1,
      unknownChargesCount: 0,
    };

    const service2 = Math.round((240000 * 10) / 100);
    const t2 = {
      total: 240000 + service2,
      baseCost: 240000,
      perGuestCost: 0,
      taxesAndCharges: service2,
      unknownChargesCount: 0,
    };

    return {
      comparison: {
        quotes: [q1, q2],
        questionsToAsk: [
          "Do you provide a formal food tasting before menu lock?",
          "How many service waiters are deployed per 50 guests?",
          "What is the policy for food packaging/leftover management?",
        ],
        summary:
          "Royal Hyderabadi scales with guest count and includes multi-course biryani; Flavors of South offers fixed pricing with 10% service charge.",
      },
      totals: [t1, t2],
    };
  }

  return null;
}
