import { Sparkles, FileText, BarChart3, Users, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Resume & Job Matching",
    description: "Our advanced algorithms find candidates that perfectly match your requirements, saving you hours of manual screening.",
  },
  {
    icon: FileText,
    title: "Instant Resume Summarization",
    description: "Get concise summaries of candidate qualifications and experience without reading through lengthy resumes.",
  },
  {
    icon: BarChart3,
    title: "Match Score with Explanation",
    description: "Understand exactly why a candidate is a good fit with detailed match explanations and scoring.",
  },
  {
    icon: Users,
    title: "Multi-user Team Access",
    description: "Collaborate with your team members on hiring decisions with role-based permissions and shared candidate pools.",
  },
  {
    icon: Shield,
    title: "GDPR-Compliant & Secure",
    description: "Your data is encrypted and handled according to the strictest privacy standards. We're fully GDPR compliant.",
  },
  {
    icon: Zap,
    title: "Easy Setup - No IT Required",
    description: "Get started in minutes with our intuitive interface. No technical knowledge required.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Decorative dot pattern on left */}
      <div className="absolute bottom-20 left-10 grid grid-cols-4 gap-2 opacity-40">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#0D9488]" />
        ))}
      </div>

      {/* Large decorative circle on right */}
      <div className="absolute right-0 top-1/3 w-[400px] h-[400px]">
        <div className="w-full h-full rounded-full bg-slate-200/60" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to streamline your recruitment process
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="text-center group">
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[#0D9488]/10 flex items-center justify-center group-hover:bg-[#0D9488]/20 transition-colors">
                <feature.icon className="h-6 w-6 text-[#0D9488]" />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.description}
              </p>

              {/* Divider line for visual separation */}
              {i < features.length - 1 && i % 3 !== 2 && (
                <div className="hidden lg:block absolute right-0 top-1/4 h-1/2 w-px bg-slate-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
