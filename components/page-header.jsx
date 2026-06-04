import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";

export function PageHeader({
  icon,
  title,
  backLink = "/",
  backLabel = "Back to Home",
}) {
  return (
    <div className="flex flex-col justify-between gap-4 mb-8">
      {/* Back Button */}

      {/* Title and Icon */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {icon && (
          <div className="text-emerald-400 shrink-0">
            {React.cloneElement(icon, {
              className: "h-8 w-8 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0",
            })}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold gradient-title break-words">
          {title}
        </h1>
      </div>
    </div>
  );
}
