import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export default function LibraryToggleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-green-500", props.className)}
      {...props}
    >
      {/* Green Circle */}
      <circle cx="12" cy="12" r="11" fill="currentColor" stroke="none" />
      
      {/* Folder Icon (white) */}
      <path 
        d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
        stroke="#FFFFFF"
        fill="#FFFFFF"
        fillOpacity="0.3"
      ></path>
      
      {/* Play Symbol in the middle of the folder (white) */}
      <polygon 
        points="10,11 15,14 10,17" 
        fill="#FFFFFF" 
        stroke="#FFFFFF"
      />
    </svg>
  );
}
