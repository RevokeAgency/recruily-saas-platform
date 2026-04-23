"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, TrendingUp, CheckCircle, Users } from "lucide-react"

const useCases = {
  time: {
    title: "Reduce Time-to-Hire by up to 60%",
    description: "Our platform automates the most time-consuming parts of the recruitment process. No more manual resume screening or endless email exchanges.",
    features: [
      { icon: Clock, title: "Automated Screening", description: "Screen hundreds of applications in minutes, not days" },
      { icon: TrendingUp, title: "Streamlined Workflow", description: "Integrated scheduling, feedback, and communication tools" },
      { icon: CheckCircle, title: "Quick Decision Making", description: "Clear candidate insights help you make faster hiring decisions" },
    ],
    button: "Learn More",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Feature1.PNG-PK9YksVbRoP6NKhKqwIQKwqSWqVhfR.png",
    metric: { label: "Average Time-to-Hire", unit: "Days", recruitify: "14 days", industry: "36 days", recruitifyWidth: "38%", industryWidth: "100%" },
  },
  quality: {
    title: "Improve Candidate Quality by 45%",
    description: "Our intelligent matching algorithms ensure you only interview candidates who truly fit your requirements, leading to better hires and lower turnover.",
    features: [
      { icon: Users, title: "Better Candidate Fit", description: "Match candidates based on skills, experience, and cultural alignment" },
      { icon: TrendingUp, title: "Reduced Turnover", description: "Employees who are a good fit stay longer and perform better" },
      { icon: CheckCircle, title: "Objective Evaluation", description: "Reduce bias and make data-driven hiring decisions" },
    ],
    button: "See How It Works",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/feature2.PNG-gU7g1CcHI5X6ULt1u28XZ5gL2me9fD.png",
    metric: { label: "First-Year Retention Rate", unit: "Percentage", recruitify: "85%", industry: "60%", recruitifyWidth: "85%", industryWidth: "60%" },
  },
  cost: {
    title: "Reduce Recruitment Costs by 35%",
    description: "Streamline your recruitment process and reduce the costs associated with hiring, from job advertising to recruiter time and onboarding expenses.",
    features: [
      { icon: Clock, title: "Reduced Time Investment", description: "Your HR team spends less time on administrative tasks" },
      { icon: TrendingUp, title: "Lower Advertising Spend", description: "More efficient job postings and targeted candidate sourcing" },
      { icon: CheckCircle, title: "Decreased Turnover Costs", description: "Better hires mean less money spent on replacing employees" },
    ],
    button: "Calculate Your Savings",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/feature3.PNG-XQMiRmn6MfDHsGhS8XFTaZu66eRGQB.png",
    metric: { label: "Average Cost Per Hire", unit: "Euros", recruitify: "€2,500", industry: "€4,000", recruitifyWidth: "62%", industryWidth: "100%" },
  },
}

export function UseCasesSection() {
  const [activeTab, setActiveTab] = useState<"time" | "quality" | "cost">("time")
  const activeCase = useCases[activeTab]

  return (
    <section id="use-cases" className="py-20 bg-white relative overflow-hidden">
      {/* Decorative wave */}
      <div className="absolute top-0 left-0 w-48 opacity-30">
        <svg viewBox="0 0 200 50" className="w-full text-[#0D9488]">
          <path d="M0,25 Q25,0 50,25 T100,25 T150,25 T200,25" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M0,35 Q25,10 50,35 T100,35 T150,35 T200,35" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      
      {/* Large decorative circle on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px]">
        <div className="w-full h-full rounded-full bg-slate-100/80" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Streamline Your Recruitment Process
          </h2>
          <p className="text-lg text-slate-600">
            Reduce time-to-hire and improve candidate quality with our intelligent platform
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-12">
          <TabsList className="w-full max-w-2xl mx-auto h-14 bg-slate-100 rounded-xl p-1.5 grid grid-cols-3">
            <TabsTrigger value="time" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Time Savings
            </TabsTrigger>
            <TabsTrigger value="quality" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Quality Improvement
            </TabsTrigger>
            <TabsTrigger value="cost" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Cost Reduction
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Content */}
          <div className="space-y-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {activeCase.title}
            </h3>
            <p className="text-slate-600">
              {activeCase.description}
            </p>

            <div className="space-y-6">
              {activeCase.features.map((feature, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#0D9488]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{feature.title}</h4>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg px-6">
              {activeCase.button}
            </Button>
          </div>

          {/* Right Content - Image & Metric */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-200 aspect-[4/3] relative">
              <Image
                src={activeCase.image}
                alt={activeCase.title}
                fill
                className="object-cover object-center"
              />
            </div>

            {/* Metric Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-900">{activeCase.metric.label}</span>
                <span className="text-sm text-slate-500">{activeCase.metric.unit}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">With Recruitify: {activeCase.metric.recruitify}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
                      style={{ width: activeCase.metric.recruitifyWidth }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Industry Average: {activeCase.metric.industry}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-400 rounded-full transition-all duration-500"
                      style={{ width: activeCase.metric.industryWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
