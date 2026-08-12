"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const cards = [
  {
    title: "KICKBOXING",
    description: "La discipline absolue. Précision, vitesse et puissance.",
    bg: "bg-brand-darkblue/40",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "MUAY THAI",
    description: "L'art des 8 membres. Clinch, coudes et genoux.",
    bg: "bg-brand-black",
    image: "https://images.unsplash.com/photo-1522898467493-49726bf28798?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "STRIKING",
    description: "Travail technique, déplacements, sparring spécifique.",
    bg: "bg-brand-blue/10",
    image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=1000&auto=format&fit=crop"
  }
];

export default function CardsSection() {
  return (
    <section className="bg-brand-black py-24 relative z-10 border-t border-brand-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover="hover"
              className={`group relative overflow-hidden h-[400px] sm:h-[500px] rounded-sm flex flex-col justify-end p-8 border border-brand-white/5 ${card.bg}`}
            >
              {/* Image */}
              <div 
                className="absolute inset-0 opacity-60 group-hover:opacity-90 transition-all duration-700 bg-cover bg-center"
                style={{ backgroundImage: `url(${card.image})` }}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/50 to-transparent opacity-80" />
              
              <div className="relative z-10 transform transition-transform duration-500 group-hover:-translate-y-4">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="font-heading text-3xl font-bold text-brand-white tracking-widest uppercase">
                    {card.title}
                  </h3>
                  <motion.div 
                    variants={{ hover: { rotate: 45, color: "#2FAEE0" } }}
                    className="text-brand-white/50"
                  >
                    <ArrowUpRight size={28} strokeWidth={1.5} />
                  </motion.div>
                </div>
                <p className="text-brand-white/60 font-light max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
