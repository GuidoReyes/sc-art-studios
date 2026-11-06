"use client";

import type { AdminMaskListResponse, AdminStoryListResponse } from "@sc-art-studio/shared";
import { useAdminData } from "../useAdminData";

// El máximo por página de la API. Si el catálogo crece más, el selector necesitará búsqueda.
const OPTIONS_LIMIT = 48;

export interface Option {
  id: string;
  label: string;
}

/** Máscaras publicadas (todo menos borradores) para vincular videos e historias. */
export function useMaskOptions(): Option[] {
  const { state } = useAdminData<AdminMaskListResponse>(`/api/admin/masks?limit=${OPTIONS_LIMIT}`);
  if (state.kind !== "ready") return [];
  return state.data.data.filter((mask) => mask.status !== "DRAFT").map((mask) => ({ id: mask.id, label: mask.nameEs }));
}

export function useStoryOptions(): Option[] {
  const { state } = useAdminData<AdminStoryListResponse>(`/api/admin/stories?limit=${OPTIONS_LIMIT}`);
  if (state.kind !== "ready") return [];
  return state.data.data.map((story) => ({ id: story.id, label: story.titleEs }));
}

export const OPTIONS_PAGE_LIMIT = OPTIONS_LIMIT;
