import { Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteRegionInterest } from "@/components/delete-region-interest";
import { SiteHeader } from "@/components/site-header";

export default async function DeleteRegionInterestPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><SiteHeader /><main className="message-page"><Trash size={44} /><DeleteRegionInterest token={token} /></main></>;
}
