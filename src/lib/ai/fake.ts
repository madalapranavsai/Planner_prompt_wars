import { AiClient, AiGenerateRequest } from "./client";

/**
 * Deterministic FakeAiClient for testing, CI runs, and offline demo mode.
 * Returns valid structured JSON responses matching requested prompts.
 */
export class FakeAiClient implements AiClient {
  public callCount = 0;
  private customHandler?: ((req: AiGenerateRequest) => string) | undefined;

  constructor(customHandler?: (req: AiGenerateRequest) => string) {
    this.customHandler = customHandler;
  }

  async generate(req: AiGenerateRequest): Promise<string> {
    this.callCount++;

    if (this.customHandler) {
      return this.customHandler(req);
    }

    const { prompt } = req;

    // Detect prompt type and respond with corresponding schema-compliant JSON
    if (prompt.includes("category weights") || prompt.includes("plan-estimate")) {
      return JSON.stringify({
        categories: [
          {
            category: "venue",
            weight: 40,
            pricing: "fixed",
            confidence: "high",
            rationale: "Banquet hall & lawn booking",
          },
          {
            category: "catering",
            weight: 30,
            pricing: "per_guest",
            confidence: "high",
            rationale: "Multi-cuisine buffet",
          },
          {
            category: "decor",
            weight: 15,
            pricing: "fixed",
            confidence: "medium",
            rationale: "Mandap and floral staging",
          },
          {
            category: "photography",
            weight: 10,
            pricing: "fixed",
            confidence: "high",
            rationale: "Photo & video crew",
          },
          {
            category: "contingency",
            weight: 5,
            pricing: "fixed",
            confidence: "high",
            rationale: "Buffer reserve",
          },
        ],
        assumptions: ["Peak wedding season rates", "Standard city venue"],
      });
    }

    if (prompt.includes("revision-parse") || prompt.includes("curveball")) {
      return JSON.stringify({
        changes: [
          {
            kind: "guests_delta",
            deltaNumber: 50,
            exactNumber: null,
            dateString: null,
            category: null,
            priorities: null,
            unsupportedReason: null,
          },
          {
            kind: "budget_delta",
            deltaNumber: -100000,
            exactNumber: null,
            dateString: null,
            category: null,
            priorities: null,
            unsupportedReason: null,
          },
        ],
        interpretation: "Adding 50 guests and reducing total budget by ₹1 Lakh",
      });
    }

    if (prompt.includes("quote-extract") || prompt.includes("vendor quote")) {
      return JSON.stringify({
        quotes: [
          {
            vendorName: "Grand Palace Hotel",
            baseCost: 350000,
            perGuestCost: null,
            charges: [{ label: "18% GST", amount: null, percent: 18, kind: "tax" }],
            includedItems: ["AC Hall", "Stage", "Round Tables"],
            missingItems: ["Generator Backup"],
            ambiguities: ["Overtime charges past 11 PM not stated"],
            suspiciousInstructionsDetected: false,
          },
          {
            vendorName: "Regal Banquet",
            baseCost: 300000,
            perGuestCost: null,
            charges: [
              { label: "Service Tax", amount: 15000, percent: null, kind: "service_charge" },
            ],
            includedItems: ["Banquet Hall", "Lighting"],
            missingItems: ["Bridal Room"],
            ambiguities: [],
            suspiciousInstructionsDetected: false,
          },
        ],
        questionsToAsk: [
          "Is power backup included during peak load?",
          "What is the exact timing curfew for sound/music?",
          "Are outside decorators permitted without penalty?",
        ],
        summary:
          "Grand Palace is more complete but subject to 18% GST; Regal Banquet offers lower base pricing.",
      });
    }

    if (prompt.includes("vendor-questions")) {
      return JSON.stringify({
        questions: [
          "Do you provide a tasting session prior to final menu signoff?",
          "Are cleanup and waste management included in the fee?",
          "What is the refund policy if the date shifts by 14 days?",
        ],
      });
    }

    // Default fallback structured object
    return JSON.stringify({
      narrative: "Standard AI output generated.",
      rankedOptionIds: ["opt-1"],
    });
  }
}
