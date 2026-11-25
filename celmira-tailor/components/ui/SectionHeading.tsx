import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  className?: string;
  as?: "h2" | "h3";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  className = "",
  as: Heading = "h2",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";
  const descriptionAlignment = align === "center" ? "mx-auto" : "";

  return (
    <div className={`flex flex-col gap-5 ${alignment} ${className}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <Heading className="max-w-2xl text-balance text-[2rem] leading-[1.15] text-espresso sm:text-[2.6rem] lg:text-[3rem]">
        {title}
      </Heading>
      {description ? (
        <p
          className={`max-w-xl text-pretty text-[0.975rem] leading-[1.85] text-muted ${descriptionAlignment}`.trim()}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
