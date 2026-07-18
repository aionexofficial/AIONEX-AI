const disabled={ok:false,disabled:true,published:false,error:"Legacy Creatomate story previews are disabled."};

export function GET(){return Response.json(disabled,{status:410,headers:{"Cache-Control":"no-store"}});}
export function POST(){return Response.json(disabled,{status:410,headers:{"Cache-Control":"no-store"}});}
