import type { SVGProps } from "react";

/**
 * Khodroyab canonical minimal chevron icon.
 * Reuse this exact component anywhere the compact navigation chevron is needed.
 */
export default function KhodroyabChevronIcon({
  className = "h-4 w-4",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
