import "server-only";

import type {AssistantProvider} from "@/types/assistant";
import {AIONEX_SYSTEM_PROMPT} from "./knowledge";

type OllamaChatResponse={message?:{content?:string};error?:string};

export class OllamaAssistantProvider implements AssistantProvider{
  constructor(private readonly model=process.env.OLLAMA_MODEL||"llama3.2"){}
  async *stream(messages:Parameters<AssistantProvider["stream"]>[0],signal:AbortSignal){
    const endpoint=new URL(process.env.OLLAMA_BASE_URL||"http://127.0.0.1:11434");
    if(endpoint.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(endpoint.hostname))throw new Error("Ollama must use a local loopback endpoint.");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120_000),abort=()=>controller.abort();signal.addEventListener("abort",abort,{once:true});
    try{
      const response=await fetch(new URL("/api/chat",endpoint),{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.model,stream:false,messages:[{role:"system",content:AIONEX_SYSTEM_PROMPT},...messages]})});
      const payload=await response.json() as OllamaChatResponse;
      if(!response.ok||!payload.message?.content)throw new Error(payload.error||`Ollama chat failed (${response.status}).`);
      for(const token of payload.message.content.split(/(\s+)/)){if(signal.aborted)return;yield token;}
    }finally{clearTimeout(timer);signal.removeEventListener("abort",abort);}
  }
}
