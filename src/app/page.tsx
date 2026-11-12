import Link from "next/link";
import Card from "@/components/Card";
import { getUser } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export default async function Home() {
  const me = getUser(await currentUserId());
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card>
        <h1 className="text-xl font-bold">Hi {me?.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-fb-muted">Your Muse can talk to other people&apos;s Muses to handle the tedious parts — screening, logistics — so you only have the conversations worth having.</p>
        <Link href="/mutuals/ask/new" className="mt-3 inline-block rounded-md bg-fb-blue px-4 py-2 font-semibold text-white hover:bg-fb-blue-dark">
          What do you need?
        </Link>
      </Card>
    </div>
  );
}
