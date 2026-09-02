"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, CheckCircle2, AlertCircle, Loader2, Sparkles, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FormStatus = "idle" | "loading" | "success" | "error";

export default function ContactSection() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Une erreur est survenue.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Impossible de contacter le serveur. Veuillez réessayer.");
    }
  };

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans min-h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          Informations & Échanges
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          CONTACTEZ <span className="text-brand-blue">LE CLUB</span>
        </h1>
        <p className="mt-4 text-brand-white/70 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Une question sur les cours, les créneaux ou les formules d&apos;entraînement ? Écrivez-nous ou venez directement nous rencontrer à la salle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        
        {/* Contact Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0c1322] rounded-2xl p-6 sm:p-10 shadow-2xl border border-brand-white/10"
        >
          <div className="mb-6 pb-4 border-b border-brand-white/5">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
              Envoyez-nous un message
            </h2>
            <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
              Réponse rapide garantie par le coach Mahfoud.
            </p>
          </div>

          {/* Feedback Succès */}
          {status === "success" && (
            <div className="flex items-start gap-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl p-4 mb-6">
              <CheckCircle2 className="text-[#22c55e] mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-[#22c55e] font-bold text-sm">Message envoyé avec succès !</p>
                <p className="text-brand-white/80 text-xs mt-1">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
              </div>
            </div>
          )}

          {/* Feedback Erreur */}
          {status === "error" && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-red-400 font-bold text-sm">Erreur d&apos;envoi</p>
                <p className="text-brand-white/80 text-xs mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-2">
                Votre Nom & Prénom
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                disabled={status === "loading"}
                className="w-full bg-brand-white/5 border border-brand-white/10 rounded-lg px-4 py-3 text-brand-white placeholder-brand-white/30 focus:outline-none focus:border-brand-blue focus:bg-brand-white/10 transition-all text-sm"
                placeholder="Ex. Thomas Dubois"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-2">
                Adresse Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={status === "loading"}
                className="w-full bg-brand-white/5 border border-brand-white/10 rounded-lg px-4 py-3 text-brand-white placeholder-brand-white/30 focus:outline-none focus:border-brand-blue focus:bg-brand-white/10 transition-all text-sm"
                placeholder="Ex. thomas@example.com"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-2">
                Votre Message
              </label>
              <textarea
                id="message"
                required
                rows={4}
                value={formData.message}
                onChange={handleChange}
                disabled={status === "loading"}
                className="w-full bg-brand-white/5 border border-brand-white/10 rounded-lg px-4 py-3 text-brand-white placeholder-brand-white/30 focus:outline-none focus:border-brand-blue focus:bg-brand-white/10 transition-all text-sm resize-none"
                placeholder="Bonjour, je souhaite des renseignements sur les cours et les tarifs..."
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-4 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-brand-blue/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  ENVOYER LE MESSAGE
                  <Send size={15} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Contact Info & Coordinates */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-[#0c1322] rounded-2xl p-6 sm:p-8 border border-brand-white/10 shadow-xl space-y-6">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white pb-3 border-b border-brand-white/5">
              Coordonnées du Club
            </h2>

            <div className="space-y-5">
              {/* Adresse */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white">
                    Adresse de la salle
                  </h3>
                  <p className="text-xs sm:text-sm text-brand-white/70 mt-0.5 leading-relaxed">
                    268 avenue de la Capelette,<br />
                    13010 Marseille — France
                  </p>
                  <a
                    href="https://maps.google.com/?q=268+Avenue+de+la+Capelette+13010+Marseille"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-white uppercase tracking-wider mt-1.5 transition-colors"
                  >
                    Ouvrir dans Google Maps
                    <ArrowRight size={12} />
                  </a>
                </div>
              </div>

              {/* Téléphone */}
              <div className="flex items-start gap-4 pt-4 border-t border-brand-white/5">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white">
                    Téléphone direct
                  </h3>
                  <a
                    href="tel:0614958849"
                    className="text-sm font-semibold text-brand-white/90 hover:text-brand-blue transition-colors mt-0.5 block"
                  >
                    06.14.95.88.49
                  </a>
                  <span className="text-[11px] text-brand-white/50 block mt-0.5">
                    Du lundi au samedi aux heures d&apos;ouverture
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 pt-4 border-t border-brand-white/5">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                  <Mail size={22} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white">
                    Email officiel
                  </h3>
                  <a
                    href="mailto:strikingcamp13@gmail.com"
                    className="text-sm font-semibold text-brand-white/90 hover:text-brand-blue transition-colors mt-0.5 block"
                  >
                    strikingcamp13@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Google Maps Container */}
          <div className="rounded-2xl overflow-hidden border border-brand-white/10 h-64 w-full shadow-2xl relative bg-[#0c1322]">
            <iframe
              title="Localisation Striking Camp Marseille"
              src="https://www.google.com/maps?q=268+Avenue+de+la+Capelette+13010+Marseille&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="filter grayscale contrast-125 opacity-85 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Social Network Box */}
          <div className="p-5 bg-[#0c1322] border border-brand-white/10 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80">
              Rejoignez la communauté
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/boxing_camp13/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Striking Camp"
                className="w-9 h-9 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-blue hover:border-brand-blue/40 hover:bg-brand-blue/10 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.46 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@strikingcamp13"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube Striking Camp"
                className="w-9 h-9 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-blue hover:border-brand-blue/40 hover:bg-brand-blue/10 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#020817" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
