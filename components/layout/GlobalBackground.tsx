"use client";

import React from "react";

/**
 * Arrière-plan global haute performance STRIKING CAMP
 * 
 * Composé de 4 couches visuelles pures en CSS / SVG :
 * 1. Base : Noir très profond avec nuances bleu nuit (#020817, #030712, #06101F)
 * 2. Halos lumineux : Dégradés radiaux diffus bleu/cyan (#00D8FF, #00BFFF)
 * 3. Lignes diagonales lumineuses : Traits d'énergie profilés inspirés du striking et de la vitesse
 * 4. Micro-texture : Grille de particules subtiles avec masque radial
 */
export default function GlobalBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#020817]"
    >
      {/* 1. COUCHE BASE : Profondeur sombre dégradée */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#06101F_0%,_#030712_50%,_#020817_100%)] opacity-95" />

      {/* 2. COUCHE HALOS LUMINEUX DIFFUS */}
      {/* Halo Haut-Droit (Cyan) */}
      <div className="absolute -top-32 -right-32 w-[550px] sm:w-[750px] h-[550px] sm:h-[750px] rounded-full bg-[radial-gradient(circle,_rgba(0,216,255,0.12)_0%,_rgba(3,34,76,0.06)_45%,_transparent_70%)] blur-3xl transform-gpu" />

      {/* Halo Centre-Gauche (Bleu profond) */}
      <div className="absolute top-[35%] -left-48 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-[radial-gradient(circle,_rgba(0,191,255,0.09)_0%,_rgba(6,16,31,0.05)_50%,_transparent_75%)] blur-3xl transform-gpu" />

      {/* Halo Bas-Droit (Cyan discret) */}
      <div className="absolute -bottom-40 right-[10%] w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full bg-[radial-gradient(circle,_rgba(0,216,255,0.08)_0%,_transparent_65%)] blur-3xl transform-gpu" />

      {/* 3. COUCHE LIGNES DIAGONALES LUMINEUSES (Énergie Striking) */}
      <div className="absolute inset-0 opacity-40 sm:opacity-75">
        {/* Ligne diagonale Haute-Gauche */}
        <div
          className="absolute -top-24 -left-12 w-[350px] sm:w-[550px] h-[2px] bg-gradient-to-r from-transparent via-[#00D8FF]/60 to-transparent transform -rotate-[35deg] blur-[1px] transform-gpu"
        />
        <div
          className="absolute -top-20 -left-8 w-[350px] sm:w-[550px] h-[12px] bg-gradient-to-r from-transparent via-[#00BFFF]/20 to-transparent transform -rotate-[35deg] blur-md transform-gpu"
        />

        {/* Ligne diagonale Droite / Médiane */}
        <div
          className="absolute top-[30%] -right-20 w-[400px] sm:w-[650px] h-[2px] bg-gradient-to-r from-transparent via-[#00D8FF]/50 to-transparent transform -rotate-[40deg] blur-[1px] transform-gpu"
        />
        <div
          className="absolute top-[30%] -right-16 w-[400px] sm:w-[650px] h-[16px] bg-gradient-to-r from-transparent via-[#00BFFF]/15 to-transparent transform -rotate-[40deg] blur-lg transform-gpu"
        />

        {/* Ligne d'accentuation Basse-Gauche */}
        <div
          className="hidden sm:block absolute bottom-[15%] -left-28 w-[450px] h-[2px] bg-gradient-to-r from-transparent via-[#00D8FF]/40 to-transparent transform -rotate-[25deg] blur-[1px] transform-gpu"
        />
      </div>

      {/* 4. COUCHE MICRO-TEXTURE / PARTICULES SUBTILES */}
      <div
        className="absolute inset-0 opacity-[0.035] sm:opacity-[0.05] bg-[radial-gradient(#00D8FF_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]"
      />

      {/* 5. VIGNETTE SUBTILE POUR FINITION CINÉMATIQUE */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,8,23,0.35)_100%)]" />
    </div>
  );
}
