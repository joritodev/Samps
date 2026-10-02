"use client";

import { useEffect } from "react";
import { installMorphOriginTracker } from "@/lib/motion/morph-origin";

/** Liga uma vez o rastreador de cliques dos cards que viram janela. */
export function MorphOriginTracker() {
  useEffect(() => installMorphOriginTracker(), []);
  return null;
}
