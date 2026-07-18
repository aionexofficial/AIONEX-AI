export class AutomationFailure extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly manualRetry: boolean;

  constructor(
    message: string,
    code: string,
    retryable: boolean,
    manualRetry: boolean = false,
  ) {
    super(message);
    this.name = "AutomationFailure";
    this.code = code;
    this.retryable = retryable;
    this.manualRetry = manualRetry;
  }
}

export function isAutomationFailure(error: unknown): error is AutomationFailure {
  return error instanceof AutomationFailure;
}

export function isCreatomateBillingFailure(error: unknown) {
  return isAutomationFailure(error) && error.code === "creatomate_billing";
}

export function isCreatomateManualFailure(error: unknown) {
  return isAutomationFailure(error) && error.manualRetry;
}

export function exponentialBackoffMs(attempt: number, baseMs = 1_000, maximumMs = 30_000) {
  return Math.min(maximumMs, baseMs * 2 ** Math.max(0, attempt));
}

export function creatomateHttpFailure(status: number, detail = "") {
  const suffix = detail.trim() ? `: ${detail.trim().slice(0, 300)}` : "";
  if (status === 402) return new AutomationFailure(`Creatomate billing or account action is required (HTTP 402)${suffix}`, "creatomate_billing", false, true);
  return new AutomationFailure(`Creatomate request failed (HTTP ${status})${suffix}`, `creatomate_http_${status}`, status >= 500 && status <= 599);
}

export function creatomateNetworkFailure(error: unknown) {
  const detail = error instanceof Error ? error.message : "network request failed";
  return new AutomationFailure(`Creatomate network error: ${detail}`, "creatomate_network", true);
}
