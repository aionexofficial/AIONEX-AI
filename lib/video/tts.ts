import "server-only";

export type TtsResult={audio:Buffer;provider:"elevenlabs"|"openai";model:string;voice:string;warnings:string[]};

async function responseError(response:Response){return(await response.text().catch(()=>"")).slice(0,300)||response.statusText;}

async function elevenLabs(text:string):Promise<TtsResult>{
  const apiKey=process.env.ELEVENLABS_API_KEY;
  if(!apiKey)throw new Error("ELEVENLABS_API_KEY is not configured.");
  const voice=process.env.ELEVENLABS_VOICE_ID||"21m00Tcm4TlvDq8ikWAM";
  const model=process.env.ELEVENLABS_TTS_MODEL||"eleven_multilingual_v2";
  const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,{method:"POST",signal:AbortSignal.timeout(120_000),headers:{"xi-api-key":apiKey,"Content-Type":"application/json"},body:JSON.stringify({text,model_id:model,voice_settings:{stability:.48,similarity_boost:.76,style:.18,use_speaker_boost:true}})});
  if(!response.ok)throw new Error(`ElevenLabs narration failed (${response.status}): ${await responseError(response)}`);
  const audio=Buffer.from(await response.arrayBuffer());
  if(audio.length<2_000)throw new Error("ElevenLabs returned an unexpectedly small narration file.");
  return{audio,provider:"elevenlabs",model,voice,warnings:[]};
}

async function openAI(text:string):Promise<TtsResult>{
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)throw new Error("OPENAI_API_KEY is not configured for TTS.");
  const model=process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice=process.env.OPENAI_TTS_VOICE||"alloy";
  const response=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",signal:AbortSignal.timeout(120_000),headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,voice,input:text,response_format:"mp3"})});
  if(!response.ok)throw new Error(`OpenAI narration failed (${response.status}): ${await responseError(response)}`);
  const audio=Buffer.from(await response.arrayBuffer());
  if(audio.length<2_000)throw new Error("OpenAI returned an unexpectedly small narration file.");
  return{audio,provider:"openai",model,voice,warnings:[]};
}

export async function generateNarration(text:string):Promise<TtsResult>{
  const normalized=text.replace(/\s+/g," ").trim();
  if(normalized.length<20)throw new Error("Narration text is too short for speech generation.");
  const configured=process.env.AIONEX_TTS_PROVIDER?.toLowerCase();
  const provider=configured||(process.env.ELEVENLABS_API_KEY?"elevenlabs":"openai");
  if(provider==="elevenlabs"){
    try{return await elevenLabs(normalized);}catch(error){
      if(configured||!process.env.OPENAI_API_KEY)throw error;
      const fallback=await openAI(normalized),warning=error instanceof Error?error.message:"ElevenLabs narration failed.";
      return{...fallback,warnings:[`ElevenLabs unavailable; OpenAI TTS used: ${warning}`]};
    }
  }
  if(provider==="openai")return openAI(normalized);
  throw new Error(`Unsupported AIONEX_TTS_PROVIDER: ${provider}`);
}
