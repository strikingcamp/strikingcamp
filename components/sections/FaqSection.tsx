"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { defaultFaqItems } from "@/components/seo/JsonLd";
import { cn } from "@/lib/utils";

interface FaqSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function FaqSection({
  title = "QUESTIONS FRÉQUENTES (FAQ)",
  subtitle = "Tout ce que vous devez savoir pour débuter ou progresser au Striking Camp.",
  className,
}: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className={cn("py-24 bg-transparent font-sans relative z-10", className)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header de section */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-wider mb-4"
          >
            {title}
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-20 h-1 bg-brand-blue mx-auto mb-4"
          />
          <p className="text-brand-white/70 text-base sm:text-lg font-light max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Liste accordéon FAQ */}
        <div className="space-y-4">
          {defaultFaqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className={cn(
                  "border rounded-xl transition-all duration-300 overflow-hidden",
                  isOpen
                    ? "border-brand-blue/50 bg-[#070e20]"
                    : "border-brand-white/10 bg-brand-white/5 hover:border-brand-white/20"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-brand-white">
                    {item.question}
                  </span>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                      isOpen
                        ? "bg-brand-blue text-brand-black border-brand-blue rotate-180"
                        : "bg-transparent text-brand-white/60 border-brand-white/20"
                    )}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-6 pt-2 text-brand-white/80 font-light text-base sm:text-lg leading-relaxed border-t border-brand-white/5">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Call to action bas de FAQ */}
        <div className="mt-12 text-center p-6 rounded-xl border border-brand-white/10 bg-brand-white/5">
          <p className="text-brand-white text-base font-medium mb-3">
            Vous avez une question spécifique sur nos cours ou nos formules ?
          </p>
          <a
            href="/contact"
            className="inline-block text-sm font-bold text-brand-blue hover:text-brand-white uppercase tracking-wider underline underline-offset-4 transition-colors"
          >
            Contactez notre équipe directement →
          </a>
        </div>

      </div>
    </section>
  );
}
