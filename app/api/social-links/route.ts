import { adminSocialSettings } from "@/lib/rewards/db";
import { OFFICIAL_LINKS } from "@/lib/social/config";
export async function GET(){try{const rows=await adminSocialSettings();const links=Object.fromEntries(rows.filter(r=>r.enabled&&["telegram","youtube"].includes(String(r.provider))).map(r=>[String(r.provider),String(r.url)]));return Response.json({links},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});}catch{return Response.json({links:{telegram:OFFICIAL_LINKS.telegram,youtube:OFFICIAL_LINKS.youtube}});}}
