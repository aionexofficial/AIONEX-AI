const disabled={ok:false,disabled:true,error:"Legacy cloud automation is disabled. The narrated local pipeline is the only video automation."};

export function GET(){return Response.json(disabled,{status:410,headers:{"Cache-Control":"no-store"}});}
export function POST(){return Response.json(disabled,{status:410,headers:{"Cache-Control":"no-store"}});}
