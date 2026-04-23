import { Rocket, Users, FileStack } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const useCases = [
  {
    icon: Rocket,
    title: "Startups hiring fast with few resources",
    description: "Find the right talent quickly to build your dream team without spending hours on resumes.",
  },
  {
    icon: Users,
    title: "Recruiting agencies handling many clients",
    description: "Scale your operations and serve more clients with AI-powered candidate matching.",
  },
  {
    icon: FileStack,
    title: "In-house HR teams overwhelmed with CVs",
    description: "Focus on strategic HR initiatives while AI handles the initial screening process.",
  },
]

export function UseCasesCardsSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Large decorative blob on left */}
      <div className="absolute left-0 bottom-0 w-[300px] h-[400px]">
        <div className="w-full h-full bg-slate-600/80 rounded-tr-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Use Cases
          </h2>
          <p className="text-lg text-slate-600">
            See how different organizations benefit from Recruitify
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border border-slate-200 rounded-2xl hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-6">
                  <useCase.icon className="h-7 w-7 text-[#0D9488]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {useCase.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
