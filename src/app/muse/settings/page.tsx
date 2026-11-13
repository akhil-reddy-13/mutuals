// Muse settings: whether your Muse may talk to other people's Muses, who it may talk to, and whether it may
// suggest things to do together. One place, set once; every ask uses it.
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import MuseSettings from "@/components/muse/MuseSettings";
import { getGroup, getUser } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MuseSettingsPage() {
  const me = await currentUser();
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-3 pb-24 md:gap-4 md:py-4">
      <section className="fb-card flex items-center gap-3 rounded-none p-4 md:rounded-[8px]">
        <Link href="/digest" className="fb-icon-btn h-9 w-9 bg-transparent" aria-label="Back">
          <BackIcon size={22} />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold leading-tight">Muse settings</h1>
          <div className="text-[13px] text-fb-muted">How your Muse works with other people&apos;s Muses</div>
        </div>
      </section>
      <MuseSettings
        groups={me.groups
          .map((id) => getGroup(id))
          .filter((g): g is NonNullable<typeof g> => !!g)
          .map((g) => ({
            id: g.id,
            name: g.name,
            cover: g.cover,
            on: !me.museGroupsOff?.includes(g.id),
            museMembers: g.memberIds.filter((m) => {
              const u = getUser(m);
              return m !== me.id && !!u && u.museEnabled && u.museGroups.includes(g.id);
            }).length,
          }))}
        initial={{
          museEnabled: me.museEnabled,
          museReach: me.museReach ?? "groups",
          connectionSuggestionsOptIn: me.connectionSuggestionsOptIn,
        }}
      />
    </div>
  );
}
