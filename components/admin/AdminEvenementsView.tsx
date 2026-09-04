"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Flame,
  Search,
  Check,
  User,
} from "lucide-react";
import type { ClubEvent, EventCategory, EventStatus } from "@/data/events";
import {
  createEventServerAction,
  updateEventServerAction,
  deleteEventServerAction,
  togglePublishEventServerAction,
  toggleFeaturedEventServerAction,
  type EventMutationPayload,
} from "@/app/(admin)/admin/evenements/actions";

interface AdminEvenementsViewProps {
  initialEvents: ClubEvent[];
}

export default function AdminEvenementsView({ initialEvents }: AdminEvenementsViewProps) {
  const [events, setEvents] = useState<ClubEvent[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | EventCategory>("all");

  // État de transition pour les Server Actions
  const [isPending, startTransition] = useTransition();

  // États des modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [deleteModalEvent, setDeleteModalEvent] = useState<ClubEvent | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtrage des événements
  const filteredEvents = events.filter((evt) => {
    if (statusFilter !== "all" && evt.status !== statusFilter) return false;
    if (categoryFilter !== "all" && evt.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchCoach = evt.coach.toLowerCase().includes(q);
      const matchLoc = evt.location.toLowerCase().includes(q);
      const matchCat = evt.categoryLabel.toLowerCase().includes(q);
      if (!matchTitle && !matchCoach && !matchLoc && !matchCat) return false;
    }
    return true;
  });

  // Métriques
  const totalCount = events.length;
  const publishedCount = events.filter((e) => e.status === "published").length;
  const draftCount = events.filter((e) => e.status === "draft").length;
  const featuredCount = events.filter((e) => e.isFeatured).length;

  // Ouvrir modal création
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Ouvrir modal modification
  const handleOpenEdit = (evt: ClubEvent) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  // Bascule de publication rapide
  const handleTogglePublish = (evt: ClubEvent) => {
    const nextStatus: "published" | "draft" = evt.status === "published" ? "draft" : "published";
    startTransition(async () => {
      const res = await togglePublishEventServerAction(evt.id, nextStatus);
      if (res.success) {
        const realId = res.data?.id || evt.id;
        setEvents((prev) =>
          prev.map((e) => (e.id === evt.id ? { ...e, id: realId, status: nextStatus } : e))
        );
        showToast(res.message || "Statut mis à jour !");
      } else {
        showToast(res.error || "Erreur lors de la modification du statut.", "error");
      }
    });
  };

  // Bascule "Mis en avant"
  const handleToggleFeatured = (evt: ClubEvent) => {
    const nextFeatured = !evt.isFeatured;
    startTransition(async () => {
      const res = await toggleFeaturedEventServerAction(evt.id, nextFeatured);
      if (res.success) {
        const realId = res.data?.id || evt.id;
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === evt.id) return { ...e, id: realId, isFeatured: nextFeatured };
            if (nextFeatured) return { ...e, isFeatured: false }; // 1 seul featured à la fois
            return e;
          })
        );
        showToast(res.message || "Mise en avant mise à jour !");
      } else {
        showToast(res.error || "Erreur lors de la mise en avant.", "error");
      }
    });
  };

  // Confirmer suppression
  const handleConfirmDelete = () => {
    if (!deleteModalEvent) return;
    startTransition(async () => {
      const res = await deleteEventServerAction(deleteModalEvent.id);
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== deleteModalEvent.id));
        showToast("Événement supprimé avec succès.");
        setDeleteModalEvent(null);
      } else {
        showToast(res.error || "Erreur lors de la suppression.", "error");
      }
    });
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Toast de confirmation */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-[#062419] border-[#22c55e]/40 text-[#4ade80]"
              : "bg-[#290d12] border-red-500/40 text-red-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* En-tête principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <Sparkles size={20} />
            </span>
            <h1 className="text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Gestion des <span className="text-brand-blue">Événements</span>
            </h1>
          </div>
          <p className="text-xs text-brand-white/60 mt-1.5 ml-11">
            Gérez les stages techniques, masterclasses et camps d'entraînement affichés en temps réel sur le site.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/evenements"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-semibold rounded-lg uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            <Eye size={14} /> Voir le site public
            <ExternalLink size={12} className="text-brand-white/40" />
          </Link>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-bold rounded-lg uppercase tracking-wider transition-colors shadow-lg shadow-brand-blue/20"
          >
            <Plus size={16} /> Nouvel Événement
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-4">
          <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/50">
            Total Événements
          </p>
          <p className="text-2xl font-heading font-black text-brand-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-[#0f172a]/60 border border-[#22c55e]/20 rounded-xl p-4">
          <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#22c55e]/70">
            Publiés en Ligne
          </p>
          <p className="text-2xl font-heading font-black text-[#4ade80] mt-1">{publishedCount}</p>
        </div>

        <div className="bg-[#0f172a]/60 border border-amber-500/20 rounded-xl p-4">
          <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-amber-400/70">
            Brouillons
          </p>
          <p className="text-2xl font-heading font-black text-amber-300 mt-1">{draftCount}</p>
        </div>

        <div className="bg-[#0f172a]/60 border border-brand-blue/20 rounded-xl p-4">
          <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue/70">
            Vedette / En Avant
          </p>
          <p className="text-2xl font-heading font-black text-brand-blue mt-1">{featuredCount}</p>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-[#0b1220] border border-brand-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Recherche */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
          <input
            type="text"
            placeholder="Rechercher par titre, coach..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-white placeholder:text-brand-white/40 focus:outline-none focus:border-brand-blue/50"
          />
        </div>

        {/* Filtres statuts et catégories */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#070c16] border border-brand-white/10 text-xs text-brand-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue/50"
          >
            <option value="all">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés / Passés</option>
          </select>

          {/* Catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-[#070c16] border border-brand-white/10 text-xs text-brand-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue/50"
          >
            <option value="all">Toutes les catégories</option>
            <option value="stage">Stages</option>
            <option value="camp">Camps</option>
            <option value="special">Événements spéciaux</option>
            <option value="passe">Passés</option>
          </select>
        </div>
      </div>

      {/* Grille des événements */}
      {filteredEvents.length === 0 ? (
        <div className="bg-[#0f172a]/40 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-3">
          <Calendar size={32} className="mx-auto text-brand-white/30" />
          <h3 className="text-sm font-heading font-bold uppercase text-brand-white">
            Aucun événement correspondant
          </h3>
          <p className="text-xs text-brand-white/50 max-w-sm mx-auto">
            Modifiez vos filtres ou créez votre premier événement en cliquant sur le bouton ci-dessus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredEvents.map((evt) => {
            const isPublished = evt.status === "published";
            const isDraft = evt.status === "draft";
            const isArchived = evt.status === "archived";

            return (
              <div
                key={evt.id}
                className={`bg-[#0c1322] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-brand-blue/30 ${
                  evt.isFeatured
                    ? "border-brand-blue/50 shadow-[0_0_30px_rgba(47,174,224,0.1)]"
                    : "border-brand-white/10"
                }`}
              >
                <div className="space-y-3.5">
                  {/* Badges d'en-tête */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                        {evt.categoryLabel}
                      </span>

                      {evt.isFeatured && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Flame size={12} />
                          En vedette
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPublished && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#4ade80] px-2 py-0.5 rounded bg-[#22c55e]/15 border border-[#22c55e]/30">
                          <Check size={12} />
                          En ligne
                        </span>
                      )}
                      {isDraft && (
                        <span className="text-[11px] font-bold uppercase text-amber-300 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                          Brouillon
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-[11px] font-bold uppercase text-brand-white/50 px-2 py-0.5 rounded bg-brand-white/10 border border-brand-white/15">
                          Archivé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Titre */}
                  <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white leading-snug">
                    {evt.title}
                  </h3>

                  {/* Description courte */}
                  <p className="text-xs text-brand-white/60 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Métadonnées essentielles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-white/5 text-xs text-brand-white/70">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-brand-blue shrink-0" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-brand-blue shrink-0" />
                      <span>{evt.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-brand-blue shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-brand-blue shrink-0" />
                      <span className="truncate">{evt.coach}</span>
                    </div>
                  </div>

                  {/* Tarif et places */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="font-heading font-bold uppercase text-brand-blue">
                      {evt.price}
                    </span>
                    {evt.spots && (
                      <span className="text-[#22c55e] font-semibold text-[11px]">
                        {evt.spots}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions en pied de carte */}
                <div className="pt-4 mt-4 border-t border-brand-white/10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Bascule Publication */}
                    <button
                      onClick={() => handleTogglePublish(evt)}
                      disabled={isPending}
                      className={`text-xs px-2.5 py-1.5 rounded font-heading font-bold uppercase tracking-wider transition-colors ${
                        isPublished
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30"
                      }`}
                      title={isPublished ? "Dépublier cet événement" : "Publier cet événement"}
                    >
                      {isPublished ? "Dépublier" : "Publier"}
                    </button>

                    {/* Bascule Vedette */}
                    <button
                      onClick={() => handleToggleFeatured(evt)}
                      disabled={isPending}
                      className={`text-xs px-2.5 py-1.5 rounded font-heading font-bold uppercase tracking-wider transition-colors ${
                        evt.isFeatured
                          ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                          : "bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 border border-brand-white/10"
                      }`}
                      title={evt.isFeatured ? "Retirer de la vedette" : "Mettre en vedette"}
                    >
                      {evt.isFeatured ? "En vedette ★" : "Mettre en vedette"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Modifier */}
                    <button
                      onClick={() => handleOpenEdit(evt)}
                      className="p-1.5 rounded bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 transition-colors"
                      title="Modifier cet événement"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Supprimer */}
                    <button
                      onClick={() => setDeleteModalEvent(evt)}
                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                      title="Supprimer cet événement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE DE CRÉATION / MODIFICATION */}
      {isModalOpen && (
        <EventEditorModal
          event={editingEvent}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(savedEvent, isNew) => {
            if (isNew) {
              setEvents((prev) => [savedEvent, ...prev]);
            } else {
              setEvents((prev) =>
                prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
              );
            }
            setIsModalOpen(false);
            showToast(
              isNew ? "Événement créé avec succès !" : "Événement mis à jour !",
              "success"
            );
          }}
        />
      )}

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {deleteModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm">
          <div className="bg-[#0c1322] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle size={22} />
              </span>
              <div>
                <h3 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white">
                  Confirmer la suppression
                </h3>
                <p className="text-xs text-brand-white/60 mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-brand-white/80 leading-relaxed bg-[#070c16] p-3 rounded-lg border border-brand-white/5">
              Êtes-vous sûr de vouloir supprimer l'événement{" "}
              <strong className="text-brand-white uppercase">« {deleteModalEvent.title} »</strong> ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalEvent(null)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-white/70 hover:text-brand-white bg-brand-white/5 rounded-lg border border-brand-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-600/30 transition-colors"
              >
                {isPending ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT MODALE D'ÉDITION / CRÉATION
// ─────────────────────────────────────────────────────────────────────────────
interface EventEditorModalProps {
  event: ClubEvent | null;
  onClose: () => void;
  onSuccess: (savedEvent: ClubEvent, isNew: boolean) => void;
}

function EventEditorModal({ event, onClose, onSuccess }: EventEditorModalProps) {
  const isEditing = Boolean(event);

  const [title, setTitle] = useState(event?.title || "");
  const [slug, setSlug] = useState(event?.slug || "");
  const [category, setCategory] = useState<EventCategory>(event?.category || "stage");
  const [categoryLabel, setCategoryLabel] = useState(
    event?.categoryLabel || "Stage Technique"
  );
  const [status, setStatus] = useState<EventStatus>(event?.status || "published");
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(event?.isFeatured));
  const [dateDisplay, setDateDisplay] = useState(event?.date || "");
  const [timeDisplay, setTimeDisplay] = useState(event?.time || "");
  const [location, setLocation] = useState(
    event?.location || "Striking Camp Marseille (268 avenue de la Capelette, 13010)"
  );
  const [coach, setCoach] = useState(event?.coach || "Mahfoud Mohamed");
  const [price, setPrice] = useState(event?.price || "45€ (Membres) / 60€ (Externes)");
  const [spots, setSpots] = useState(event?.spots || "20 places max");
  const [description, setDescription] = useState(event?.description || "");
  const [registrationUrl, setRegistrationUrl] = useState(
    event?.registrationUrl || "/connexion"
  );
  const [highlights, setHighlights] = useState<string[]>(
    event?.highlights && event.highlights.length > 0
      ? event.highlights
      : [
          "Perfectionnement technique et stratégique",
          "Mises en situation pratiques et dirigées",
        ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Synchronisation du label selon la catégorie sélectionnée
  const handleCategoryChange = (cat: EventCategory) => {
    setCategory(cat);
    if (cat === "stage") setCategoryLabel("Stage Technique");
    else if (cat === "camp") setCategoryLabel("Camp Intensif");
    else if (cat === "special") setCategoryLabel("Événement Spécial");
    else if (cat === "passe") setCategoryLabel("Événement Passé");
  };

  const handleHighlightChange = (index: number, val: string) => {
    const next = [...highlights];
    next[index] = val;
    setHighlights(next);
  };

  const handleAddHighlight = () => {
    setHighlights([...highlights, ""]);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Le titre de l'événement est obligatoire.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: EventMutationPayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      category,
      categoryLabel: categoryLabel.trim() || "Stage Technique",
      status,
      isFeatured,
      dateDisplay: dateDisplay.trim() || "Date à venir",
      timeDisplay: timeDisplay.trim() || "Horaires à venir",
      startsAt: event?.startsAt || null,
      endsAt: event?.endsAt || null,
      location: location.trim() || "Striking Camp Marseille",
      coach: coach.trim() || "Mahfoud Mohamed",
      price: price.trim() || "Sur réservation",
      spots: spots.trim() || null,
      description: description.trim() || "",
      highlights: highlights.filter((h) => h.trim()),
      registrationUrl: registrationUrl.trim() || "/connexion",
    };

    try {
      if (isEditing && event) {
        const res = await updateEventServerAction(event.id, payload);
        if (!res.success) {
          setFormError(res.error || "Erreur lors de la mise à jour.");
          setIsSaving(false);
          return;
        }

        const realId = res.data?.id || event.id;

        const updated: ClubEvent = {
          ...event,
          id: realId,
          title: payload.title,
          slug: payload.slug || event.slug,
          category: payload.category,
          categoryLabel: payload.categoryLabel || "Stage",
          status: payload.status,
          isFeatured: payload.isFeatured,
          date: payload.dateDisplay,
          time: payload.timeDisplay,
          location: payload.location,
          coach: payload.coach,
          price: payload.price,
          spots: payload.spots || undefined,
          description: payload.description,
          highlights: payload.highlights,
          registrationUrl: payload.registrationUrl || undefined,
        };

        onSuccess(updated, false);
      } else {
        const res = await createEventServerAction(payload);
        if (!res.success || !res.data) {
          setFormError(res.error || "Erreur lors de la création.");
          setIsSaving(false);
          return;
        }

        const created: ClubEvent = {
          id: res.data.id,
          title: payload.title,
          slug: payload.slug || `evt-${Date.now()}`,
          category: payload.category,
          categoryLabel: payload.categoryLabel || "Stage",
          status: payload.status,
          isFeatured: payload.isFeatured,
          date: payload.dateDisplay,
          time: payload.timeDisplay,
          location: payload.location,
          coach: payload.coach,
          price: payload.price,
          spots: payload.spots || undefined,
          description: payload.description,
          highlights: payload.highlights,
          registrationUrl: payload.registrationUrl || undefined,
        };

        onSuccess(created, true);
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Erreur inattendue.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c1322] border border-brand-white/15 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* En-tête modale */}
        <div className="flex items-center justify-between p-5 border-b border-brand-white/10 bg-[#070c16]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <Calendar size={18} />
            </span>
            <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
              {isEditing ? "Modifier l'événement" : "Créer un nouvel événement"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1 : Titre et catégorie */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Titre de l'événement <span className="text-brand-blue">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Stage Technique Muay Thaï & Corps-à-Corps"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as EventCategory)}
                  className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white focus:outline-none focus:border-brand-blue"
                >
                  <option value="stage">Stage</option>
                  <option value="camp">Camp Intensif</option>
                  <option value="special">Événement Spécial</option>
                  <option value="passe">Événement Passé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                  Libellé du badge affiché
                </label>
                <input
                  type="text"
                  value={categoryLabel}
                  onChange={(e) => setCategoryLabel(e.target.value)}
                  placeholder="Ex: Stage Technique, 100% Féminin..."
                  className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Date, Heure, Lieu, Coach */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-brand-white/5">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Date affichée
              </label>
              <input
                type="text"
                value={dateDisplay}
                onChange={(e) => setDateDisplay(e.target.value)}
                placeholder="Ex: Samedi 18 Avril 2026"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Horaires affichés
              </label>
              <input
                type="text"
                value={timeDisplay}
                onChange={(e) => setTimeDisplay(e.target.value)}
                placeholder="Ex: 14:00 – 17:30"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Lieu
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Striking Camp Marseille"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Coach / Intervenant
              </label>
              <input
                type="text"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                placeholder="Mahfoud Mohamed"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Section 3 : Tarif, Places, Inscription */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-brand-white/5">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Tarif
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 45€ (Membres) / 60€"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Nombre de places
              </label>
              <input
                type="text"
                value={spots}
                onChange={(e) => setSpots(e.target.value)}
                placeholder="Ex: 20 places max"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Lien d'inscription
              </label>
              <input
                type="text"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="/connexion ou lien externe"
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Section 4 : Description */}
          <div className="pt-3 border-t border-brand-white/5">
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
              Description complète de l'événement
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présentez les objectifs, le contenu et l'ambiance de cette masterclass..."
              className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue leading-relaxed"
            />
          </div>

          {/* Section 5 : Points forts / Au programme */}
          <div className="pt-3 border-t border-brand-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80">
                Points clés au programme (liste à puces)
              </label>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="text-[11px] font-heading font-bold uppercase text-brand-blue hover:text-brand-white inline-flex items-center gap-1"
              >
                <Plus size={12} /> Ajouter un point
              </button>
            </div>

            <div className="space-y-2">
              {highlights.map((hl, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] text-brand-blue font-bold shrink-0">•</span>
                  <input
                    type="text"
                    value={hl}
                    onChange={(e) => handleHighlightChange(idx, e.target.value)}
                    placeholder="Ex: Travail du timing et des sorties d'axe"
                    className="flex-1 bg-[#070c16] border border-brand-white/10 rounded-lg px-3 py-2 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue"
                  />
                  {highlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="p-1.5 text-brand-white/40 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 6 : Statut et Mise en avant */}
          <div className="pt-3 border-t border-brand-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/80 mb-1.5">
                Statut de publication
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full bg-[#070c16] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-xs text-brand-white focus:outline-none focus:border-brand-blue"
              >
                <option value="published">Publié (visible sur le site public)</option>
                <option value="draft">Brouillon (invisible du public)</option>
                <option value="archived">Archivé / Passé</option>
              </select>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-[#070c16] border border-brand-white/10 cursor-pointer hover:border-brand-blue/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-brand-white/20 text-brand-blue focus:ring-brand-blue"
                />
                <div className="text-xs">
                  <span className="font-heading font-bold uppercase text-brand-white flex items-center gap-1.5">
                    <Flame size={13} className="text-amber-400" />
                    Mettre en avant
                  </span>
                  <p className="text-[10px] text-brand-white/50">
                    Affiche cet événement dans le grand encadré héroïque de /evenements.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-brand-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-white/70 hover:text-brand-white bg-brand-white/5 rounded-lg border border-brand-white/10"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-wider text-brand-black bg-brand-blue hover:bg-brand-white rounded-lg shadow-lg shadow-brand-blue/30 transition-colors"
            >
              {isSaving ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer l'événement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
