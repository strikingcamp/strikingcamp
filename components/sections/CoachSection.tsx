"use client";

import { motion } from "framer-motion";
import { siteData } from "@/data/content";

const timeline = [
  "COMBATTANT",
  "EXPÉRIENCE",
  "COMPÉTITION",
  "COACH",
  "TRANSMISSION"
];

export default function CoachSection() {
  return (
    <section id="le-coach" className="bg-brand-darkblue py-32 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="w-full lg:w-1/2 relative h-[600px] bg-brand-black border border-brand-white/10 flex items-center justify-center grayscale bg-cover bg-[center_15%]"
            style={{ backgroundImage: "url('/profil.jpeg?v=2')" }}
          >
            {/* Subtle blue accent */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/30 to-brand-black/50 mix-blend-overlay" />
          </motion.div>

          <div className="w-full lg:w-1/2">
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

            <div className="space-y-6 mb-12">
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
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center text-xs font-bold text-brand-white/40 tracking-[0.2em] uppercase"
            >
              {timeline.map((item, index) => (
                <div key={item} className="flex items-center">
                  <span>{item}</span>
                  {index < timeline.length - 1 && (
                    <span className="hidden sm:inline-block mx-4 text-brand-blue">↓</span>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
