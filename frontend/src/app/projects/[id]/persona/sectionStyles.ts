import type { PathySection } from "@smartpathy/shared";
import {
  BriefcaseIcon,
  ComputerIcon,
  LightBulbIcon,
  UserIcon,
  WarningIcon,
} from "@/app/_layout/icons";

const PURPLE_EDIT =
  "border-violet-300 text-brand hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40";

/** The icon and color of each PATHY section, as in Figure 29 of the thesis. */
export const SECTION_STYLES: Record<
  PathySection,
  { icon: typeof UserIcon; tile: string; title: string; edit: string }
> = {
  who: {
    icon: UserIcon,
    tile: "border-violet-200 bg-violet-50 text-brand dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    title: "text-brand dark:text-violet-300",
    edit: PURPLE_EDIT,
  },
  context: {
    icon: BriefcaseIcon,
    tile: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    title: "text-blue-700 dark:text-blue-300",
    edit: PURPLE_EDIT,
  },
  experienceWithTechnology: {
    icon: ComputerIcon,
    tile: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    title: "text-emerald-700 dark:text-emerald-300",
    edit: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950",
  },
  problems: {
    icon: WarningIcon,
    tile: "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    title: "text-red-600 dark:text-red-300",
    edit: "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950",
  },
  existingSolutions: {
    icon: LightBulbIcon,
    tile: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    title: "text-amber-700 dark:text-amber-300",
    edit: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950",
  },
};
