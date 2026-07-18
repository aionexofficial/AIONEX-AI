import "server-only";

import { AutomationFailure } from "./failures";

export const LEGACY_CREATOMATE_DISABLED_MESSAGE="Legacy Creatomate rendering is disabled. Use the local Ollama, Remotion, FFmpeg, and OpenAI TTS pipeline.";

export async function resetCreatomateCircuitForManualRetry(){throw new AutomationFailure(LEGACY_CREATOMATE_DISABLED_MESSAGE,"creatomate_disabled",false);}

export async function creatomateRequest(_path:string,_init:RequestInit={},_options:{checkCircuit?:boolean}={}):Promise<Response>{
  void _init;void _options;
  throw new AutomationFailure(LEGACY_CREATOMATE_DISABLED_MESSAGE,"creatomate_disabled",false);
}
