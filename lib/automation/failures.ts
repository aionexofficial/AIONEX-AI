export class AutomationFailure extends Error{
  readonly code:string;
  readonly retryable:boolean;
  readonly manualRetry:boolean;
  constructor(message:string,code:string,retryable:boolean,manualRetry=false){super(message);this.name="AutomationFailure";this.code=code;this.retryable=retryable;this.manualRetry=manualRetry;}
}
export function isAutomationFailure(error:unknown):error is AutomationFailure{return error instanceof AutomationFailure;}
export function exponentialBackoffMs(attempt:number,baseMs=1_000,maximumMs=30_000){return Math.min(maximumMs,baseMs*2**Math.max(0,attempt));}
export function providerHttpFailure(provider:string,status:number,detail=""){const suffix=detail.trim()?`: ${detail.trim().slice(0,300)}`:"";return new AutomationFailure(`${provider} request failed (HTTP ${status})${suffix}`,`${provider.toLowerCase()}_http_${status}`,status===429||status>=500);}
export function providerNetworkFailure(provider:string,error:unknown){const detail=error instanceof Error?error.message:"network request failed";return new AutomationFailure(`${provider} network error: ${detail}`,`${provider.toLowerCase()}_network`,true);}
