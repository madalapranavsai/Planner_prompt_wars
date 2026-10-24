"use client";

import React, { useState } from "react";
import { Occasion, AgeGroup, AccessibilityNeed, BudgetCategory, EventProfile } from "@/lib/schemas";
import { parseINR } from "@/lib/money";

interface IntakeWizardProps {
  onPlanGenerated: (profile: EventProfile) => Promise<void>;
  isLoading: boolean;
}

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
      className="p-6 md:p-8 bg-slate-900/70 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col gap-6 text-white"
      aria-labelledby="intake-title"
    >
      <div>
        <h2 id="intake-title" className="text-2xl font-bold tracking-tight text-white">
          Celebration Intake
        </h2>
        <p className="text-sm text-slate-300 mt-1">
          Specify your celebration requirements and priorities before generating your plan.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-sm font-medium"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Occasion */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="occasion-select" className="text-sm font-semibold text-slate-200">
            Occasion Type
          </label>
          <select
            id="occasion-select"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as Occasion)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

        {/* Occasion Label */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="occasion-label" className="text-sm font-semibold text-slate-200">
            Event Name / Sub-events
          </label>
          <input
            id="occasion-label"
            type="text"
            value={occasionLabel}
            onChange={(e) => setOccasionLabel(e.target.value)}
            placeholder="e.g. Sangeet + Reception"
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget-input" className="text-sm font-semibold text-slate-200">
            Total Budget (₹ INR)
          </label>
          <input
            id="budget-input"
            type="text"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            placeholder="e.g. ₹8 Lakh or 800000"
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>

        {/* Guest Count */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="guests-input" className="text-sm font-semibold text-slate-200">
            Guest Count
          </label>
          <input
            id="guests-input"
            type="number"
            min={1}
            max={10000}
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 0)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>

        {/* Event Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date-input" className="text-sm font-semibold text-slate-200">
            Celebration Date
          </label>
          <input
            id="date-input"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>

        {/* City */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city-input" className="text-sm font-semibold text-slate-200">
            City / Location
          </label>
          <input
            id="city-input"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Hyderabad, Jaipur, Bengaluru"
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>
      </div>

      {/* Vibe */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vibe-input" className="text-sm font-semibold text-slate-200">
          Theme &amp; Vibe
        </label>
        <input
          id="vibe-input"
          type="text"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="e.g. Traditional Royal, Minimalist, Bollywood Disco"
          className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Age Groups */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-slate-200">Guest Age Groups</legend>
        <div className="flex flex-wrap gap-2.5">
          {(["kids", "teens", "adults", "seniors"] as AgeGroup[]).map((group) => {
            const isSelected = ageGroups.includes(group);
            return (
              <button
                key={group}
                type="button"
                onClick={() => toggleAgeGroup(group)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {group.toUpperCase()}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Accessibility Needs */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-slate-200">
          Accessibility &amp; Special Needs
        </legend>
        <div className="flex flex-wrap gap-2.5">
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Ranked Priorities */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-200">
          Priority Categories (Highest to Lowest)
        </span>
        <p className="text-xs text-slate-400">
          Ranked order used by the budget engine to protect top priorities when rebalancing.
        </p>
        <div className="flex flex-wrap gap-2">
          {priorities.map((cat, idx) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              <span className="text-amber-400 font-bold">#{idx + 1}</span>
              <span className="capitalize">{cat}</span>
            </span>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Crafting Plan with Gemini...</span>
          </>
        ) : (
          <span>Generate Celebration Plan</span>
        )}
      </button>
    </form>
  );
}
