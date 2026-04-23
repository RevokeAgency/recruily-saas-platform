import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function DashboardPreviewSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Your Dashboard at a Glance
          </h2>
          <p className="text-lg text-slate-600">
            See all jobs, candidates, and matching scores in one clean view.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="relative">
          {/* Browser frame */}
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Browser header */}
            <div className="bg-slate-100 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-slate-500 border border-slate-200">
                  app.recruitify.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard content placeholder */}
            <div className="aspect-[16/9] bg-slate-200 relative">
              <Image
                src="/images/dashboard-preview.png"
                alt="Recruitify Dashboard"
                fill
                className="object-cover object-top"
              />
              {/* Fallback gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <p className="text-slate-600 mb-6">
            Our intuitive dashboard gives your HR team a complete overview of all job postings, candidates, and matches in one place. Track progress, collaborate with team members, and make data-driven hiring decisions.
          </p>
          <Button asChild className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6">
            <Link href="/auth/register">
              See the full dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
