import Link from "next/link";
import { Logo } from "@/components/Logo";
import { IconArrow } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <Logo href="/" className="justify-center" />
        <p className="mt-8 text-7xl font-extrabold tracking-tight">
          4<span className="gradient-text">0</span>4
        </p>
        <p className="mt-3 text-lg font-semibold">This clip got left on the cutting room floor.</p>
        <p className="mt-1 text-sm text-fog">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
        <Link href="/" className="btn-primary mt-8">
          Back home <IconArrow className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
