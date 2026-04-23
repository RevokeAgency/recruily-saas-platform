"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How does the AI matching technology work?",
    answer: "Our AI analyzes both job descriptions and candidate resumes to identify matching skills, experience, and qualifications. It goes beyond keyword matching by understanding context and semantic meaning to provide more accurate matches.",
  },
  {
    question: "Can I integrate Recruitify with my existing ATS?",
    answer: "Yes, Recruitify offers seamless integration with most popular Applicant Tracking Systems. Our API allows you to connect your existing tools and workflows without disruption.",
  },
  {
    question: "How long does the free trial last?",
    answer: "Our free trial lasts 14 days and gives you full access to all features. No credit card required to start.",
  },
  {
    question: "Is my data secure with Recruitify?",
    answer: "Absolutely. We use enterprise-grade encryption and are fully GDPR compliant. Your candidate data is stored securely in EU-based data centers with strict access controls.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-white relative overflow-hidden">
      {/* Decorative circle on left */}
      <div className="absolute left-0 bottom-1/4 w-48 h-48">
        <div className="w-full h-full rounded-full bg-slate-100" style={{ clipPath: "inset(0 50% 0 0)" }} />
      </div>

      {/* Large decorative circles on right */}
      <div className="absolute right-0 top-1/4 w-[300px] h-[300px]">
        <div className="w-full h-full rounded-full bg-slate-100" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>
      <div className="absolute right-20 top-1/2 w-[200px] h-[200px]">
        <div className="w-full h-full rounded-full bg-[#0D9488]/10" style={{ clipPath: "inset(0 0 0 30%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Find answers to common questions about Recruitify.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-slate-200 rounded-xl px-6 data-[state=open]:border-[#0D9488] data-[state=open]:border-2 bg-white"
            >
              <AccordionTrigger className="text-left font-medium text-slate-900 hover:no-underline py-5 [&[data-state=open]>svg]:text-[#0D9488]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
