import Image from "next/image";
import Link from "next/link";
import { List, MapTrifold, UserCircle } from "@phosphor-icons/react/dist/ssr";
import logo from "@/assets/logo.svg";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header ${compact ? "site-header-compact" : ""}`}>
      <Link href="/" className="brand" aria-label="WattBund Startseite">
        <Image src={logo} alt="" width={38} height={38} priority />
        <span>WattBund</span>
      </Link>
      <nav className="desktop-nav" aria-label="Hauptnavigation">
        <Link href="/#personas">Für wen</Link>
        <Link href="/solar-map"><MapTrifold size={18} weight="bold" />Solar Map</Link>
        <Link href="/region-wuenschen">Region wünschen</Link>
        <Link href="/konto" className="nav-account"><UserCircle size={19} />Mitmachen</Link>
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Navigation öffnen"><List size={25} /></summary>
        <nav aria-label="Mobile Navigation">
          <Link href="/#personas">Für wen</Link>
          <Link href="/solar-map">Solar Map</Link>
          <Link href="/region-wuenschen">Region wünschen</Link>
          <Link href="/konto">Mitmachen</Link>
          <Link href="/legal">Rechtliches</Link>
        </nav>
      </details>
    </header>
  );
}
