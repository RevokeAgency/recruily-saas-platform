import Link from "next/link"

export function Footer() {
  return (
    <footer className="text-white py-16" style={{ background: "linear-gradient(180deg, #0D9488 0%, #0B7C72 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-white" />
              <span className="text-xl font-bold">Recruitify</span>
            </Link>
            <p className="text-white/70 text-sm max-w-sm">
              AI-powered recruitment platform that helps you find the perfect candidates faster than ever.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="#use-cases" className="hover:text-white transition-colors">Use Cases</Link></li>
              <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="#contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/imprint" className="hover:text-white transition-colors">Imprint</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 text-center text-sm text-white/60">
          <p>&copy; {new Date().getFullYear()} Recruitify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
