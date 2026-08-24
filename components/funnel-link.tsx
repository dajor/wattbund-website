"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackFunnelEvent } from "@/lib/funnel-client";

type Props = ComponentProps<typeof Link> & { persona?: string; sourceRoute?: string };

export function FunnelLink({ persona, sourceRoute, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackFunnelEvent("persona_cta", { persona, sourceRoute });
        onClick?.(event);
      }}
    />
  );
}
