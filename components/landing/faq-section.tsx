"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { WaveDivider } from "./wave-divider"

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
}

const faqs = [
  {
    question: "How does the AI matching technology work?",
    answer: "Our AI analyzes both job descriptions and candidate resumes to identify matching skills, experience, and qualifications. It goes beyond keyword matching by understanding context and semantic meaning to provide more accurate matches.",
  },
  {
    question: "Can I integrate Recruily with my existing ATS?",
    answer: "Yes, Recruily offers API integration with most popular Applicant Tracking Systems. Our team can help you set up a seamless connection to ensure data flows smoothly between systems.",
  },
  {
    question: "How long does the free trial last?",
    answer: "Our free trial lasts for 14 days with full access to all features. No credit card is required to start, and you can cancel anytime.",
  },
  {
    question: "Is my data secure with Recruily?",
    answer: "Absolutely. We use enterprise-grade encryption and comply with GDPR, CCPA, and other data protection regulations. Your data is stored securely and never shared with third parties without your explicit consent.",
  },
  {
    question: "Can I upgrade or downgrade my plan later?",
    answer: "Yes, you can change your subscription plan at any time. Changes take effect at the start of your next billing cycle, and we'll prorate any difference in cost.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="pt-0 pb-0 relative overflow-hidden bg-[#0D9488]">
      {/* Minimal arc - left */}
      <svg className="absolute left-0 bottom-1/4 w-24 h-24 pointer-events-none opacity-20" viewBox="0 0 100 100">
        <path d="M0 100 Q 0 0, 100 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
      </svg>

      {/* Subtle gradient shapes - right */}
      <div className="absolute right-0 top-1/4 w-[250px] h-[250px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-l from-slate-100 to-transparent" style={{ clipPath: "inset(0 0 0 50%)" }} />
      </div>
      <div className="absolute right-16 top-1/2 w-[150px] h-[150px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-l from-teal-50 to-transparent" style={{ clipPath: "inset(0 0 0 30%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          {...fadeInUp}
        >
          <p className="text-sm font-medium text-white/80 mb-2">Common Questions</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-white/80">
            Find answers to common questions about Recruily.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <AccordionItem
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
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
      
      {/* Wave divider into white (Contact) */}
      <div className="mt-20">
        <WaveDivider fillColor="#ffffff" direction="down" />
      </div>
    </section>
  )
}
