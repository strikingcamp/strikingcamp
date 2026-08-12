"use client";

import { motion } from "framer-motion";

export default function GallerySection() {
  return (
    <section className="bg-brand-black py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="font-heading text-3xl font-bold text-brand-white uppercase tracking-widest"
        >
          L'ATMOSPHÈRE
        </motion.h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-2 md:px-4">
        {/* Gallery Grid Placeholders */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="col-span-2 row-span-2 relative group overflow-hidden bg-brand-white/5 aspect-square md:aspect-auto md:h-[600px] border border-brand-white/10"
        >
          <div 
            className="absolute inset-0 grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 bg-cover bg-center"
            style={{ backgroundImage: "url('/voile.jpg')" }}
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative group overflow-hidden bg-brand-white/5 aspect-square md:h-[292px] border border-brand-white/10"
        >
          <div 
            className="absolute inset-0 grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 bg-cover bg-center"
            style={{ backgroundImage: "url('/fille.jpg')" }}
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative group overflow-hidden bg-brand-white/5 aspect-square md:h-[292px] border border-brand-white/10"
        >
          <div 
            className="absolute inset-0 grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 bg-cover bg-center"
            style={{ backgroundImage: "url('/boxe.webp')" }}
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="col-span-2 relative group overflow-hidden bg-brand-white/5 aspect-[2/1] md:h-[292px] border border-brand-white/10"
        >
          <div 
            className="absolute inset-0 grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 bg-cover bg-center"
            style={{ backgroundImage: "url('/sacSalle.jpg')" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
