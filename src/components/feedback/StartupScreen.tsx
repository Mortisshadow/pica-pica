import { motion } from "motion/react";
import { PicaMark } from "@/components/brand/PicaMark";

export function StartupScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#08090b]">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
        <PicaMark className="size-14 rounded-2xl" />
        <div className="text-sm font-bold tracking-[.24em] text-white/80">PICA PICA</div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[.07]">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ x: ["-100%", "240%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "45%" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
