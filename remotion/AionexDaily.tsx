import type {VideoContentPackage} from '../lib/content/schema';
import {AbsoluteFill,interpolate,Sequence,spring,useCurrentFrame,useVideoConfig} from 'remotion';

export const DEFAULT_AIONEX_VIDEO_PROPS:VideoContentPackage={
  concept:'AION evolves through verified activity across the AIONEX network.',
  script:'AIONEX connects verified activity, intelligence, progression, and community.',
  title:'AIONEX Daily Signal',
  description:'A five-scene AIONEX vertical story.',
  telegramCaption:'Join the official AIONEX community at @aionexweb3.',
  youtubeDescription:'Explore AIONEX AI, Web3 intelligence, and verified progression.',
  hashtags:['#AIONEX','#AION','#AIWeb3'],
  durationSeconds:30,
  scenes:[
    {headline:'AION AWAKENS',body:'The intelligence core comes online.',subtitle:'Meet the intelligence at the center of AIONEX.',visual:'Luminous intelligence core and orbital rings.'},
    {headline:'VERIFIED ENERGY',body:'Activity is validated before rewards move.',subtitle:'Server-authoritative energy keeps progression honest.',visual:'Secure energy rails and authenticated data.'},
    {headline:'XP BECOMES EVOLUTION',body:'Levels unlock visible AION stages.',subtitle:'Build XP and evolve through seven stages.',visual:'Evolution tunnel and level arcs.'},
    {headline:'COMMUNITY SIGNAL',body:'Tasks and referrals connect the network.',subtitle:'Verified missions strengthen the community.',visual:'Mission cards and referral nodes.'},
    {headline:'ENTER AIONEX',body:'Continue in the official community.',subtitle:'Join @aionexweb3 and evolve your AION.',visual:'AIONEX portal and Telegram signal.'},
  ],
};

const palettes=[['#22d3ee','#0e7490'],['#fbbf24','#b45309'],['#a78bfa','#6d28d9'],['#34d399','#047857'],['#60a5fa','#4338ca']] as const;

function Scene({scene,index}:{scene:VideoContentPackage['scenes'][number];index:number}){
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),enter=spring({frame,fps,config:{damping:16,stiffness:95}}),exit=interpolate(frame,[150,180],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),[accent,deep]=palettes[index],progress=interpolate(frame,[0,180],[0,1],{extrapolateRight:'clamp'});
  return <AbsoluteFill style={{background:`radial-gradient(circle at ${20+index*15}% ${25+index*10}%, ${accent}35, transparent 38%), linear-gradient(155deg,#020617 0%,${deep}30 55%,#020617 100%)`,color:'#f8fafc',fontFamily:'Arial, Helvetica, sans-serif',opacity:exit,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)',backgroundSize:`${80+index*16}px ${80+index*16}px`,transform:`perspective(900px) rotateX(${index%2?8:-6}deg) scale(1.15) translateY(${progress*-45}px)`}}/>
    {Array.from({length:14},(_,particle)=><div key={particle} style={{position:'absolute',left:`${(particle*23+index*11)%100}%`,top:`${(particle*37+index*7)%92}%`,width:particle%3===0?18:8,height:particle%3===0?18:8,borderRadius:'50%',background:accent,boxShadow:`0 0 ${18+particle}px ${accent}`,opacity:.2+(particle%4)*.12,transform:`translateY(${Math.sin((frame+particle*15)/25)*30}px) scale(${.7+enter*.3})`}}/>)}
    <div style={{position:'absolute',left:64,right:64,top:70,display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:25,letterSpacing:8,color:'#bae6fd'}}><span>AIONEX</span><span>0{index+1} / 05</span></div>
    <div style={{position:'absolute',left:70,right:70,top:190,transform:`translateY(${(1-enter)*80}px)`,opacity:enter}}>
      <div style={{fontSize:28,letterSpacing:7,color:accent,textTransform:'uppercase'}}>AI × WEB3 INTELLIGENCE</div>
      <h1 style={{fontSize:index===2?88:104,lineHeight:.94,letterSpacing:-4,margin:'34px 0 28px',maxWidth:900,textShadow:`0 0 45px ${accent}75`}}>{scene.headline}</h1>
      <p style={{fontSize:43,lineHeight:1.25,maxWidth:850,color:'#dbeafe'}}>{scene.body}</p>
    </div>
    <div style={{position:'absolute',left:90,right:90,top:760,height:470,display:'grid',placeItems:'center',transform:`scale(${.78+enter*.22}) rotate(${index%2?progress*8:-progress*8}deg)`}}>
      {index===0&&<><div style={{width:370,height:370,borderRadius:'50%',border:`8px solid ${accent}`,boxShadow:`0 0 90px ${accent}`,background:`radial-gradient(circle,#e0f2fe 0 4%,${accent} 8%,#07182a 35%,transparent 66%)`}}/><div style={{position:'absolute',width:520,height:220,borderRadius:'50%',border:`3px solid ${accent}99`,transform:`rotate(${frame*.4}deg)`}}/></>}
      {index===1&&<div style={{width:720,display:'grid',gap:34}}>{['IDENTITY','ENERGY','REWARD'].map((label,row)=><div key={label} style={{border:`2px solid ${accent}88`,background:'#020617cc',borderRadius:24,padding:28}}><div style={{display:'flex',justifyContent:'space-between',fontSize:24,letterSpacing:5}}><span>{label}</span><span>VERIFIED</span></div><div style={{height:14,background:'#172554',borderRadius:99,marginTop:20,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,progress*125-row*8)}%`,background:accent,boxShadow:`0 0 22px ${accent}`}}/></div></div>)}</div>}
      {index===2&&<div style={{display:'flex',alignItems:'center',gap:32}}>{['CORE','SPARK','NOVA'].map((stage,stageIndex)=><div key={stage} style={{width:210,height:210,borderRadius:'50%',display:'grid',placeItems:'center',border:`${4+stageIndex*2}px solid ${accent}`,background:'#0f172acc',boxShadow:`0 0 ${25+stageIndex*20}px ${accent}88`,fontSize:22,letterSpacing:3,transform:`scale(${.75+enter*(.2+stageIndex*.05)})`}}>{stage}</div>)}</div>}
      {index===3&&<div style={{position:'relative',width:700,height:410}}>{Array.from({length:9},(_,node)=>{const x=(node*31)%100,y=(node*47)%100;return <div key={node} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:node===0?88:42,height:node===0?88:42,borderRadius:'50%',background:node===0?'#f8fafc':accent,boxShadow:`0 0 35px ${accent}`,transform:`scale(${enter})`}}/>})}<div style={{position:'absolute',inset:70,border:`3px dashed ${accent}88`,borderRadius:80,transform:`rotate(${frame*.25}deg)`}}/></div>}
      {index===4&&<div style={{width:760,border:`3px solid ${accent}`,borderRadius:48,background:'#020617dd',padding:'64px 52px',textAlign:'center',boxShadow:`0 0 80px ${accent}66`}}><div style={{fontSize:72,fontWeight:900,letterSpacing:12}}>AIONEX</div><div style={{marginTop:38,borderRadius:999,background:accent,color:'#020617',padding:'25px 34px',fontSize:34,fontWeight:800}}>JOIN @AIONEXWEB3</div></div>}
    </div>
    <div style={{position:'absolute',left:64,right:64,bottom:90,border:'1px solid rgba(255,255,255,.16)',borderRadius:28,background:'rgba(2,6,23,.82)',padding:'27px 32px',fontSize:32,lineHeight:1.3,textAlign:'center',boxShadow:'0 16px 55px rgba(0,0,0,.35)'}}>{scene.subtitle}</div>
    <div style={{position:'absolute',left:0,bottom:0,height:8,width:`${progress*100}%`,background:accent,boxShadow:`0 0 22px ${accent}`}}/>
  </AbsoluteFill>;
}

export function AionexDaily(props:VideoContentPackage){return <AbsoluteFill style={{background:'#020617'}}>{props.scenes.map((scene,index)=><Sequence key={`${index}-${scene.headline}`} from={index*180} durationInFrames={180}><Scene scene={scene} index={index}/></Sequence>)}</AbsoluteFill>}
