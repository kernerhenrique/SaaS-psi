import { cn } from "cn";

import { getInitials } from "@/lib/text";

import { TONE_CLASSES, type Tone } from "./status-badge";

const AVATAR_TONES: Tone[] = ["sage", "honey", "peach", "sky", "stone"];

/** Mesmo nome → mesma cor sempre, para a psicóloga associar cor e paciente. */
function toneForName(name: string): Tone {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

export function PatientAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        TONE_CLASSES[toneForName(name)],
        SIZES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
