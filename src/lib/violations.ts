import type { ViolationCategory } from "./types";

/**
 * Client-safe fallback list mirroring supabase/seed.sql, used only if
 * the categories table hasn't loaded yet (e.g. first paint). The
 * source of truth is always the `violation_categories` table.
 */
export const FALLBACK_CATEGORIES: Pick<
  ViolationCategory,
  "slug" | "name_en" | "name_bn" | "icon" | "severity" | "is_special"
>[] = [
  { slug: "illegal-parking", name_en: "Illegal Parking", name_bn: "অবৈধ পার্কিং", icon: "parking-circle-off", severity: 1, is_special: false },
  { slug: "wrong-side-driving", name_en: "Wrong-Side Driving", name_bn: "ভুল পাশে গাড়ি চালানো", icon: "move-left", severity: 3, is_special: false },
  { slug: "signal-violation", name_en: "Traffic Signal Violation", name_bn: "সিগন্যাল অমান্য", icon: "traffic-cone", severity: 2, is_special: false },
  { slug: "reckless-driving", name_en: "Reckless / Dangerous Driving", name_bn: "বেপরোয়া গাড়ি চালানো", icon: "zap", severity: 3, is_special: false },
  { slug: "no-helmet", name_en: "No Helmet", name_bn: "হেলমেট ছাড়া", icon: "shield-alert", severity: 2, is_special: false },
  { slug: "overloading", name_en: "Vehicle Overloading", name_bn: "ওভারলোডিং", icon: "package-plus", severity: 2, is_special: false },
  { slug: "illegal-bus-stoppage", name_en: "Illegal Bus/Passenger Pickup-Drop", name_bn: "অবৈধ স্থানে বাস থামানো", icon: "bus", severity: 2, is_special: true },
  { slug: "fake-fitness-registration", name_en: "Fake/Expired Fitness or Registration", name_bn: "ভুয়া/মেয়াদোত্তীর্ণ ফিটনেস বা নিবন্ধন", icon: "file-x", severity: 2, is_special: false },
  { slug: "unauthorized-modification", name_en: "Unauthorized Vehicle Modification", name_bn: "অননুমোদিত পরিবর্তন", icon: "wrench", severity: 1, is_special: false },
  { slug: "other", name_en: "Other Violation", name_bn: "অন্যান্য লঙ্ঘন", icon: "more-horizontal", severity: 1, is_special: false },
];

export const SEVERITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Minor",
  2: "Moderate",
  3: "Severe",
};
