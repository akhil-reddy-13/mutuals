"use client";
// The "Ask Muse" row in the Group composer. Opens the Muse chat sheet with this Group as context.
import { useState } from "react";
import { ChevronRight, MuseMark } from "./icons";
import MuseSheet, { type MuseSheetProps } from "./muse/MuseSheet";

export default function MuseLauncher(props: Omit<MuseSheetProps, "onClose">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group mt-2 flex w-full items-center gap-3 rounded-lg border border-transparent bg-gradient-to-r from-[#eef3ff] via-[#f3ecff] to-[#ffeef3] px-3 py-2.5 text-left transition hover:border-[#d9c7ff]"
      >
        <MuseMark size={28} />
        <span className="min-w-0 flex-1 text-[15px] font-semibold">Ask Muse</span>
        <ChevronRight size={20} className="text-fb-muted transition group-hover:translate-x-0.5" />
      </button>
      {open && <MuseSheet {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
