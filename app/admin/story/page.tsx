import { redirect } from "next/navigation";
import { StoryManager } from "@/components/admin/story-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { storyAdminOverview } from "@/lib/story/service";

export const dynamic="force-dynamic";
export default async function StoryAdminPage(){if(!await getAdminSession())redirect("/admin/login");return <StoryManager initial={await storyAdminOverview()}/>;}

