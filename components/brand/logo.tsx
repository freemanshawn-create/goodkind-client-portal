import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface LogoProps {
  variant?: "dark" | "light";
  width?: number;
  height?: number;
  linked?: boolean;
}

export function Logo({
  variant = "dark",
  width = 160,
  height = 26,
  linked = true,
}: LogoProps) {
  const img = (
    <Image
      src={variant === "dark" ? "/logo-dark.svg" : "/logo-light.svg"}
      alt="Goodkind Co"
      width={width}
      height={height}
      priority
    />
  );

  if (!linked) return img;

  return (
    <Link href={ROUTES.DASHBOARD} className="inline-flex items-center">
      {img}
    </Link>
  );
}
