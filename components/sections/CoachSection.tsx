"use client";

import { motion } from "framer-motion";
import { siteData } from "@/data/content";

export default function CoachSection() {
  return (
    <section id="le-coach" className="bg-[#0a1120] pt-8 pb-24 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="w-full lg:w-1/2 relative h-[500px] lg:h-[600px] bg-brand-black border border-brand-white/10 flex items-center justify-center grayscale bg-cover bg-[center_15%] rounded-lg overflow-hidden"
            style={{ backgroundImage: "url('/profil.jpeg?v=2')" }}
          >
            {/* Subtle blue accent */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/30 to-brand-black/50 mix-blend-overlay" />
          </motion.div>

          <div className="w-full lg:w-1/2 pt-4 lg:pt-12">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="font-heading text-5xl md:text-6xl font-bold text-brand-white uppercase tracking-tighter mb-4"
            >
              {siteData.coach.name}
            </motion.h2>
            
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-brand-blue font-bold tracking-widest uppercase text-sm mb-10"
            >
              {siteData.coach.title}
            </motion.h3>

            <div className="space-y-6 mb-10">
              {siteData.coach.bio.map((paragraph, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.3 + (index * 0.1) }}
                  className="text-brand-white/80 font-light text-lg leading-relaxed"
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <a 
                href="/planning"
                className="inline-block px-8 py-4 bg-[#00d8ff] text-[#0a1120] font-bold text-sm uppercase tracking-wider hover:bg-white transition-colors rounded-sm shadow-lg hover:shadow-[#00d8ff]/20"
              >
                Planning des cours
              </a>
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
