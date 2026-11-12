// No home feed (handoff decision 4). The demo lives in the Group.
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/groups/g_housing27");
}
