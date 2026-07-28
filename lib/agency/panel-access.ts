import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";
import { getDashboardPath } from "@/types/auth";

const PANEL_USER_TYPES = {
  design: ["DESIGNER"],
  video: ["VIDEOMAKER", "VIDEO_EDITOR"],
  trafego: ["OTHER"],
  social: ["SOCIAL_MEDIA"],
} as const satisfies Record<string, UserType[]>;

export type PanelSlug = keyof typeof PANEL_USER_TYPES;

export function requirePanelUserType(slug: PanelSlug, userType: UserType) {
  if (!(PANEL_USER_TYPES[slug] as UserType[]).includes(userType)) {
    redirect(getDashboardPath(userType));
  }
}
