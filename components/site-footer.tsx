import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.svg";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand brand-light">
          <Image src={logo} alt="" width={38} height={38} />
          <span>WattBund</span>
        </Link>
        <p>Lokal erzeugt. Lokal genutzt.</p>
      </div>
      <div className="footer-links">
        <Link href="/#personas">Für wen</Link>
        <Link href="/solar-map">Solar Map</Link>
        <Link href="/konto">Mitmachen</Link>
        <Link href="/legal">Impressum & Datenschutz</Link>
      </div>
      <small>© 2026 WattBund. Orientierungswerte, keine Anlagenplanung.</small>
    </footer>
  );
}
