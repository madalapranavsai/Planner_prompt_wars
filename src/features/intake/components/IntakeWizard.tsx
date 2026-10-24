"use client";

import React, { useState } from "react";
import { Occasion, AgeGroup, AccessibilityNeed, BudgetCategory, EventProfile } from "@/lib/schemas";
import { parseINR } from "@/lib/money";

interface IntakeWizardProps {
  onPlanGenerated: (profile: EventProfile) => Promise<void>;
  isLoading: boolean;
}

const OCCASIONS: { id: Occasion; label: string; icon: string; desc: string }[] = [
  {
    id: "wedding",
    label: "Royal Wedding & Sangeet",
    icon: "💍",
    desc: "Mandap, Sangeet & Reception",
  },
  { id: "birthday", label: "Milestone Birthday", icon: "🎂", desc: "DJ, Themed Decor & Buffet" },
  {
    id: "anniversary",
    label: "Golden Anniversary",
    icon: "🥂",
    desc: "Banquet, Memory Wall & Dinner",
  },
  { id: "engagement", label: "Engagement / Roka", icon: "🌟", desc: "Intimate Ring Ceremony" },
  { id: "community", label: "Community Festival", icon: "🪔", desc: "Diwali, Navratri & Utsav" },
  { id: "corporate", label: "Corporate Celebration", icon: "🏢", desc: "Annual Gala & Awards" },
];

const BUDGET_PRESETS = [
  { label: "₹5 Lakh", value: "₹5 Lakh" },
  { label: "₹8 Lakh", value: "₹8 Lakh" },
  { label: "₹15 Lakh", value: "₹15 Lakh" },
  { label: "₹25 Lakh", value: "₹25 Lakh" },
  { label: "₹50 Lakh", value: "₹50 Lakh" },
  { label: "₹1 Crore", value: "₹1 Crore" },
];

const GUEST_PRESETS = [
  { label: "50 Intimate", value: 50 },
  { label: "150 Moderate", value: 150 },
  { label: "200 Grand", value: 200 },
  { label: "350 Royal", value: 350 },
  { label: "500+ Mega", value: 500 },
];

const CITY_PRESETS = ["Hyderabad", "Jaipur", "Delhi NCR", "Bengaluru", "Mumbai", "Udaipur", "Goa"];

const INSPIRATION_PRESETS = [
  {
    title: "👑 Royal Jaipur Palace Wedding",
    occasion: "wedding" as Occasion,
    label: "Sangeet, Varmala & Royal Feast",
    budget: "₹25 Lakh",
    guests: 300,
    city: "Jaipur",
    vibe: "Heritage Palace with Grand Floral Mandap & Rajasthani Buffet",
  },
  {
    title: "🎂 50th Jubilee Golden Birthday",
    occasion: "birthday" as Occasion,
    label: "Golden Milestone Birthday Bash",
    budget: "₹6 Lakh",
    guests: 120,
    city: "Hyderabad",
    vibe: "Retro Bollywood Glamour with Live Band & Cocktail Dinner",
  },
  {
    title: "🥂 Silver Anniversary Gala",
    occasion: "anniversary" as Occasion,
    label: "25th Silver Wedding Anniversary",
    budget: "₹10 Lakh",
    guests: 180,
    city: "Bengaluru",
    vibe: "Warm Candlelit Garden Evening with Contemporary Acoustic Music",
  },
];

export function IntakeWizard({ onPlanGenerated, isLoading }: IntakeWizardProps) {
  const [occasion, setOccasion] = useState<Occasion>("wedding");
  const [occasionLabel, setOccasionLabel] = useState("");
  const [budgetText, setBudgetText] = useState("₹8 Lakh");
  const [guestCount, setGuestCount] = useState(200);
  const [eventDate, setEventDate] = useState("2027-11-20");
  const [city, setCity] = useState("Hyderabad");
  const [vibe, setVibe] = useState("Royal Traditional with Grand Stage");
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(["adults", "seniors", "kids"]);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<AccessibilityNeed[]>([
    "elderly_seating",
    "wheelchair_access",
  ]);
  const [priorities] = useState<BudgetCategory[]>(["venue", "catering", "photography", "decor"]);
  const [error, setError] = useState<string | null>(null);

  const applyInspiration = (preset: (typeof INSPIRATION_PRESETS)[number]) => {
    setOccasion(preset.occasion);
    setOccasionLabel(preset.label);
    setBudgetText(preset.budget);
    setGuestCount(preset.guests);
    setCity(preset.city);
    setVibe(preset.vibe);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const budget = parseINR(budgetText);
    if (!budget || budget <= 0) {
      setError("Please specify a valid budget amount (e.g. ₹8 Lakh or 800000)");
      return;
    }

    if (guestCount < 1) {
      setError("Guest count must be at least 1");
      return;
    }

    if (!city.trim()) {
      setError("City name is required");
      return;
    }

    const profile: EventProfile = {
      occasion,
      occasionLabel: occasionLabel.trim() || undefined,
      budgetTotal: budget,
      guestCount,
      eventDate,
      city: city.trim(),
      vibe: vibe.trim(),
      ageGroups,
      accessibilityNeeds,
      priorities,
    };

    try {
      await onPlanGenerated(profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    }
  };

  const toggleAgeGroup = (group: AgeGroup) => {
    setAgeGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const toggleAccessNeed = (need: AccessibilityNeed) => {
    setAccessibilityNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-10 glass-panel rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-8 text-white relative overflow-hidden"
      aria-labelledby="intake-title"
    >
      {/* Decorative top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 opacity-80" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪔</span>
            <h2
              id="intake-title"
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
            >
              Celebration Intake
            </h2>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Specify your celebration parameters and priorities. Gemini synthesizes market
            allocations, while our exact math engine guarantees zero-float rupee accuracy.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <span>✨</span>
          <span>GenAI Synthesis</span>
        </div>
      </div>

      {/* 1-Click Inspiration Bar */}
      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <span>💡</span>
          <span>Quick Inspiration Presets (1-Click Fill)</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INSPIRATION_PRESETS.map((insp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyInspiration(insp)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-amber-500/40 text-left transition-all active:scale-[0.98] group cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                {insp.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {insp.budget} • {insp.guests} guests • {insp.city}
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-sm font-medium flex items-center gap-3 shadow-lg shadow-rose-950/50"
        >
          <span className="text-xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Visual Occasion Cards */}
      <div className="space-y-3">
        <label
          htmlFor="occasion-select"
          className="text-xs font-bold uppercase tracking-wider text-slate-300 block"
        >
          Select Occasion Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {OCCASIONS.map((occ) => {
            const isSelected = occasion === occ.id;
            return (
              <button
                key={occ.id}
                type="button"
                onClick={() => setOccasion(occ.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                  isSelected
                    ? "bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{occ.icon}</span>
                  <span
                    className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-slate-200"}`}
                  >
                    {occ.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{occ.desc}</div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hidden accessible select for semantic form binding & tests */}
        <select
          id="occasion-select"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value as Occasion)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          <option value="wedding">Wedding / Sangeet</option>
          <option value="birthday">Birthday Party</option>
          <option value="anniversary">Anniversary</option>
          <option value="engagement">Engagement Ceremony</option>
          <option value="community">Community Festival</option>
          <option value="corporate">Corporate Event</option>
          <option value="other">Other Celebration</option>
        </select>
      </div>

      {/* Main Grid: Name, Budget, Guests, Date, City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Occasion Custom Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="occasion-label"
            className="text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Celebration Name / Sub-events
          </label>
          <input
            id="occasion-label"
            type="text"
            value={occasionLabel}
            onChange={(e) => setOccasionLabel(e.target.value)}
            placeholder="e.g. Sangeet + Royal Reception"
            className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder-slate-500"
          />
        </div>

        {/* Total Budget with quick pills */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="budget-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Total Budget (₹ INR)
            </label>
            <span className="text-[11px] font-mono text-amber-400">Lakh / Crore notation</span>
          </div>
          <input
            id="budget-input"
            type="text"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            placeholder="e.g. ₹8 Lakh or 800000"
            className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white font-mono font-bold text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder-slate-500"
            required
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {BUDGET_PRESETS.map((bp) => (
              <button
                key={bp.label}
                type="button"
                onClick={() => setBudgetText(bp.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  budgetText === bp.value
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {bp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guest Count with quick pills */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="guests-input"
            className="text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Guest Count
          </label>
          <input
            id="guests-input"
            type="number"
            min={1}
            max={10000}
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 0)}
            className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white font-mono font-bold text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
            required
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {GUEST_PRESETS.map((gp) => (
              <button
                key={gp.label}
                type="button"
                onClick={() => setGuestCount(gp.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  guestCount === gp.value
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {gp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Date */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="date-input"
            className="text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Celebration Date
          </label>
          <input
            id="date-input"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all cursor-pointer"
            required
          />
        </div>

        {/* City / Location with quick chips */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label
            htmlFor="city-input"
            className="text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            City / Location
          </label>
          <input
            id="city-input"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Hyderabad, Jaipur, Bengaluru, Mumbai"
            className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder-slate-500"
            required
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {CITY_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  city === c
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                📍 {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vibe / Theme */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="vibe-input"
          className="text-xs font-bold uppercase tracking-wider text-slate-300"
        >
          Celebration Theme &amp; Atmosphere
        </label>
        <input
          id="vibe-input"
          type="text"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="e.g. Royal Rajasthani Palace, Contemporary Boho Chic, Traditional Telugu Vaibhavam"
          className="px-4 py-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 text-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder-slate-500"
        />
      </div>

      {/* Age Groups & Accessibility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
        {/* Age Groups */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Attending Age Groups
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["kids", "teens", "adults", "seniors"] as AgeGroup[]).map((group) => {
              const isSelected = ageGroups.includes(group);
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleAgeGroup(group)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? "✓ " : "+ "}
                  {group.toUpperCase()}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Accessibility Needs */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Accessibility &amp; Dietary Requirements
          </legend>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "wheelchair_access", label: "Wheelchair Access" },
              { id: "elderly_seating", label: "Elderly Seating" },
              { id: "dietary_restrictions", label: "Dietary Restrictions" },
              { id: "hearing_support", label: "Hearing Support" },
            ].map((item) => {
              const isSelected = accessibilityNeeds.includes(item.id as AccessibilityNeed);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAccessNeed(item.id as AccessibilityNeed)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? "✓ " : "+ "}
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Ranked Priorities */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Ranked Budget Protection Priorities
        </span>
        <p className="text-xs text-slate-400">
          Ranked order used by the deterministic rebalancing engine to protect top priorities when
          cost overruns occur.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {priorities.map((cat, idx) => (
            <span
              key={cat}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold shadow-sm"
            >
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-[11px] font-black">
                {idx + 1}
              </span>
              <span className="capitalize">{cat}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
      >
        {isLoading ? (
          <>
            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Synthesizing Plan with Gemini...</span>
          </>
        ) : (
          <>
            <span>Generate Celebration Plan</span>
            <span className="text-lg">✨</span>
          </>
        )}
      </button>
    </form>
  );
}
