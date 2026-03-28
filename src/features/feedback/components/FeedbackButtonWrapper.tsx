"use client";

import { usePathname } from "next/navigation";
import { FeedbackButton } from "./FeedbackButton";

export function FeedbackButtonWrapper() {
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname.startsWith("/admin")) return null;

  return <FeedbackButton />;
}
