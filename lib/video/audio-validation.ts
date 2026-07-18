export type AudioAnalysis={duration:number;meanVolumeDb:number;maxVolumeDb:number;silenceDuration:number;audibleDuration:number};
export type AudioValidation={passed:boolean;errors:string[];analysis:AudioAnalysis};

export function validateAudibleAudio(analysis:AudioAnalysis):AudioValidation{
  const errors:string[]=[];
  if(!Number.isFinite(analysis.duration)||analysis.duration<29||analysis.duration>31)errors.push(`Audio duration must cover the 30-second timeline, received ${analysis.duration||0}.`);
  if(!Number.isFinite(analysis.meanVolumeDb)||analysis.meanVolumeDb<=-35)errors.push(`Audio mean volume is silent or too quiet (${analysis.meanVolumeDb} dB).`);
  if(!Number.isFinite(analysis.maxVolumeDb)||analysis.maxVolumeDb<=-10)errors.push(`Audio peak is silent or too quiet (${analysis.maxVolumeDb} dB).`);
  if(analysis.maxVolumeDb>0)errors.push(`Audio peak clips above 0 dB (${analysis.maxVolumeDb} dB).`);
  if(!Number.isFinite(analysis.audibleDuration)||analysis.audibleDuration<3)errors.push(`Audible speech must last at least 3 seconds, received ${analysis.audibleDuration||0}.`);
  return{passed:errors.length===0,errors,analysis};
}
