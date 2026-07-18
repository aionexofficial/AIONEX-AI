export type VideoProbe={format?:{duration?:string;size?:string};streams?:Array<{codec_type?:string;codec_name?:string;width?:number;height?:number}>};
import type {AudioValidation} from "./audio-validation.ts";

export type VideoValidation={passed:boolean;productionReady:boolean;errors:string[];width:number;height:number;duration:number;videoCodec:string;audioCodec:string;fileSize:number;audio:AudioValidation|null};

export function validateVideoProbe(probe:VideoProbe,fileExists:boolean,audio:AudioValidation|null=null):VideoValidation{
  const video=probe.streams?.find(stream=>stream.codec_type==="video"),audioStream=probe.streams?.find(stream=>stream.codec_type==="audio"),width=Number(video?.width||0),height=Number(video?.height||0),duration=Number(probe.format?.duration||0),fileSize=Number(probe.format?.size||0),videoCodec=String(video?.codec_name||""),audioCodec=String(audioStream?.codec_name||""),errors:string[]=[];
  if(!fileExists)errors.push("Video file does not exist.");
  if(width!==1080||height!==1920)errors.push(`Production video must be 1080x1920, received ${width}x${height}.`);
  if(width===270&&height===480)errors.push("Draft-scale 270x480 previews are never production output.");
  if(videoCodec!=="h264")errors.push(`Video codec must be H.264, received ${videoCodec||"none"}.`);
  if(audioCodec!=="aac")errors.push(`Audio codec must be AAC, received ${audioCodec||"none"}.`);
  if(duration<29||duration>31)errors.push(`Video duration must be approximately 30 seconds, received ${duration||0}.`);
  if(fileSize<250_000)errors.push("Video file is unexpectedly small.");
  if(!audio)errors.push("Audible narration validation is required.");else errors.push(...audio.errors);
  return{passed:errors.length===0,productionReady:errors.length===0,errors,width,height,duration,videoCodec,audioCodec,fileSize,audio};
}
