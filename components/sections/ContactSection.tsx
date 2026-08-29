"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
    <section className="pt-8 pb-24 bg-[#0a1120] min-h-[calc(100vh-80px)] font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase tracking-wide">
            CONTACTEZ-NOUS
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#2a3441] rounded-xl p-8 shadow-2xl border border-gray-700/50"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Envoyez-nous un message</h3>

            {/* Feedback succès */}
            {status === "success" && (
              <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <CheckCircle2 className="text-green-400 mt-0.5 shrink-0" size={20} />
                <div>
                  <p className="text-green-400 font-bold">Message envoyé !</p>
                  <p className="text-green-300/80 text-sm mt-1">
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                </div>
              </div>
            )}

            {/* Feedback erreur */}
            {status === "error" && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={20} />
                <div>
                  <p className="text-red-400 font-bold">Erreur d&apos;envoi</p>
                  <p className="text-red-300/80 text-sm mt-1">{errorMsg}</p>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-[#1e2530] border border-gray-600 rounded-md px-4 py-3 text-white focus:outline-none focus:border-[#00d8ff] transition-colors"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#1e2530] border border-gray-600 rounded-md px-4 py-3 text-white focus:outline-none focus:border-[#00d8ff] transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-[#1e2530] border border-gray-600 rounded-md px-4 py-3 text-white focus:outline-none focus:border-[#00d8ff] transition-colors resize-none"
                  placeholder="Comment pouvons-nous vous aider ?"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-[#00d8ff] text-white font-bold py-3 rounded-md hover:bg-cyan-400 transition-colors uppercase tracking-wider shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  "Envoyer"
                )}
              </button>
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col justify-center space-y-10"
          >
            <div>
              <h3 className="text-2xl font-bold text-[#00d8ff] mb-6 uppercase tracking-wide">
                Nos Coordonnées
              </h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-[#1e2530] p-3 rounded-full mr-4 border border-gray-600">
                    <MapPin className="text-[#00d8ff] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Adresse</h4>
                    <p className="text-gray-300 mt-1">268 avenue de la capelette,<br />13010 Marseille</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#1e2530] p-3 rounded-full mr-4 border border-gray-600">
                    <Phone className="text-[#00d8ff] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Téléphone</h4>
                    <p className="text-gray-300 mt-1">06.14.95.88.49</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-[#1e2530] p-3 rounded-full mr-4 border border-gray-600">
                    <Mail className="text-[#00d8ff] w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Email</h4>
                    <a href="mailto:strikingcamp13@gmail.com" className="text-gray-300 mt-1 hover:text-[#00d8ff] transition-colors">
                      strikingcamp13@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-[#00d8ff] mb-6 uppercase tracking-wide">
                Suivez-nous
              </h3>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/boxing_camp13/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1e2530] p-4 rounded-full border border-gray-600 hover:border-[#00d8ff] hover:bg-[#00d8ff]/10 group transition-all"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6 text-gray-300 group-hover:text-[#00d8ff] transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.46 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="bg-[#1e2530] p-4 rounded-full border border-gray-600 hover:border-[#00d8ff] hover:bg-[#00d8ff]/10 group transition-all"
                  aria-label="YouTube"
                >
                  <svg className="w-6 h-6 text-gray-300 group-hover:text-[#00d8ff] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                  </svg>
                </a>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
