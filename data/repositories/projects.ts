import { mockProjects } from "@/data/mock/projects";
import {
  getAsanaProjects,
  getAsanaProjectById,
} from "@/data/repositories/asana-projects";
import type { Project } from "@/data/types";

function useAsana() {
  return !!process.env.ASANA_PAT;
}

export async function getProjects(filters?: {
  clientId?: string;
  status?: string;
}): Promise<Project[]> {
  if (useAsana()) {
    const projects = await getAsanaProjects();
    let result = projects;
    if (filters?.status)
      result = result.filter((p) => p.status === filters.status);
    return result;
  }

  let result = [...mockProjects];
  if (filters?.clientId)
    result = result.filter((p) => p.clientId === filters.clientId);
  if (filters?.status)
    result = result.filter((p) => p.status === filters.status);
  return result;
}

export async function getProjectById(
  id: string
): Promise<Project | null> {
  if (useAsana()) {
    return getAsanaProjectById(id);
  }
  return mockProjects.find((p) => p.id === id) ?? null;
}
