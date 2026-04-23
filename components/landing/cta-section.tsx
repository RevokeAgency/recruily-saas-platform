import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 w-[400px] h-[400px]">
        <div className="w-full h-full rounded-full bg-slate-200/50" style={{ clipPath: "inset(0 0 50% 50%)" }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          Ready to Match Smarter?
        </h2>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Join thousands of companies that have streamlined their recruitment process with Recruitify.
        </p>
        <Button asChild size="lg" className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-8 py-6 text-lg">
          <Link href="/auth/register">
            Start for Free – No Credit Card Required
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
