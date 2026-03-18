import { asanaFetch, getWorkspaceId } from "@/lib/asana";
import type { Project, ProjectStatus, Milestone, MilestoneStatus } from "@/data/types";

// -- Asana API types --

interface AsanaProject {
  gid: string;
  name: string;
  notes: string;
  owner: { gid: string; name: string } | null;
  due_on: string | null;
  start_on: string | null;
  created_at: string;
  modified_at: string;
  current_status_update: {
    title: string;
    text: string;
    status_type: string;
  } | null;
  members: { gid: string; name: string }[];
}

interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  due_on: string | null;
  start_on: string | null;
  completed_at: string | null;
  created_at: string;
  assignee: { gid: string; name: string } | null;
  memberships: { section: { gid: string; name: string } }[];
}

interface AsanaSection {
  gid: string;
  name: string;
}

// -- Mapping helpers --

const sectionToStatus: Record<string, ProjectStatus> = {
  "in progress": "in-progress",
  "active": "in-progress",
  "to do": "planning",
  "planning": "planning",
  "not started": "planning",
  "complete": "completed",
  "completed": "completed",
  "done": "completed",
  "on hold": "on-hold",
  "review": "review",
  "in review": "review",
};

function inferProjectStatus(tasks: AsanaTask[]): ProjectStatus {
  if (tasks.length === 0) return "planning";
  const completed = tasks.filter((t) => t.completed).length;
  if (completed === tasks.length) return "completed";
  if (completed === 0) return "planning";
  return "in-progress";
}

function computeProgress(tasks: AsanaTask[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

function taskToMilestoneStatus(task: AsanaTask): MilestoneStatus {
  if (task.completed) return "completed";
  // Check section name for "in progress"
  const sectionName = task.memberships?.[0]?.section?.name?.toLowerCase() ?? "";
  if (sectionName.includes("progress") || sectionName.includes("active")) {
    return "in-progress";
  }
  return "pending";
}

function mapTaskToMilestone(task: AsanaTask, index: number): Milestone {
  return {
    id: task.gid,
    projectId: "", // filled by caller
    title: task.name,
    description: task.notes || "",
    status: taskToMilestoneStatus(task),
    dueDate: task.due_on ? new Date(task.due_on) : new Date(),
    completedDate: task.completed_at ? new Date(task.completed_at) : undefined,
    order: index + 1,
  };
}

// -- Configurable project list --
// Set ASANA_PROJECT_IDS env var as comma-separated GIDs to control
// which Asana projects appear in the portal.

function getConfiguredProjectIds(): string[] | null {
  const ids = process.env.ASANA_PROJECT_IDS;
  if (!ids) return null;
  return ids.split(",").map((id) => id.trim()).filter(Boolean);
}

// -- Public API --

export async function getAsanaProjects(): Promise<Project[]> {
  const configuredIds = getConfiguredProjectIds();

  let projects: AsanaProject[];

  if (configuredIds && configuredIds.length > 0) {
    // Fetch specific projects
    projects = await Promise.all(
      configuredIds.map((id) =>
        asanaFetch<AsanaProject>(`/projects/${id}`, {
          opt_fields:
            "name,notes,owner.name,due_on,start_on,created_at,modified_at,current_status_update,current_status_update.title,current_status_update.text,current_status_update.status_type,members.name",
        })
      )
    );
  } else {
    // Fetch all projects in workspace
    projects = await asanaFetch<AsanaProject[]>(
      `/workspaces/${getWorkspaceId()}/projects`, {
        opt_fields:
          "name,notes,owner.name,due_on,start_on,created_at,modified_at,current_status_update,current_status_update.title,current_status_update.text,current_status_update.status_type,members.name",
        limit: "50",
      }
    );
  }

  // Fetch tasks for each project
  const results = await Promise.all(
    projects.map(async (proj) => {
      const tasks = await asanaFetch<AsanaTask[]>(
        `/projects/${proj.gid}/tasks`,
        {
          opt_fields:
            "name,notes,completed,due_on,start_on,completed_at,created_at,assignee.name,memberships.section.name",
          limit: "100",
        }
      );

      const milestones = tasks.map((t, i) => ({
        ...mapTaskToMilestone(t, i),
        projectId: proj.gid,
      }));

      const statusFromUpdate = proj.current_status_update?.status_type;
      let status: ProjectStatus;
      if (statusFromUpdate === "on_track") status = "in-progress";
      else if (statusFromUpdate === "at_risk") status = "review";
      else if (statusFromUpdate === "off_track") status = "on-hold";
      else if (statusFromUpdate === "complete") status = "completed";
      else status = inferProjectStatus(tasks);

      // Determine dates
      const taskDueDates = tasks
        .filter((t) => t.due_on)
        .map((t) => new Date(t.due_on!));
      const latestDue =
        taskDueDates.length > 0
          ? new Date(Math.max(...taskDueDates.map((d) => d.getTime())))
          : null;

      const project: Project = {
        id: proj.gid,
        name: proj.name,
        clientId: "user-1",
        description: proj.notes || "",
        status,
        progress: computeProgress(tasks),
        startDate: proj.start_on
          ? new Date(proj.start_on)
          : new Date(proj.created_at),
        targetDate: proj.due_on
          ? new Date(proj.due_on)
          : latestDue ?? new Date(),
        milestones,
        createdAt: new Date(proj.created_at),
        updatedAt: new Date(proj.modified_at),
      };

      return project;
    })
  );

  return results;
}

export async function getAsanaProjectById(
  id: string
): Promise<Project | null> {
  try {
    const proj = await asanaFetch<AsanaProject>(`/projects/${id}`, {
      opt_fields:
        "name,notes,owner.name,due_on,start_on,created_at,modified_at,current_status_update,current_status_update.title,current_status_update.text,current_status_update.status_type,members.name",
    });

    const tasks = await asanaFetch<AsanaTask[]>(
      `/projects/${id}/tasks`,
      {
        opt_fields:
          "name,notes,completed,due_on,start_on,completed_at,created_at,assignee.name,memberships.section.name",
        limit: "100",
      }
    );

    const milestones = tasks.map((t, i) => ({
      ...mapTaskToMilestone(t, i),
      projectId: proj.gid,
    }));

    const statusFromUpdate = proj.current_status_update?.status_type;
    let status: ProjectStatus;
    if (statusFromUpdate === "on_track") status = "in-progress";
    else if (statusFromUpdate === "at_risk") status = "review";
    else if (statusFromUpdate === "off_track") status = "on-hold";
    else if (statusFromUpdate === "complete") status = "completed";
    else status = inferProjectStatus(tasks);

    const taskDueDates = tasks
      .filter((t) => t.due_on)
      .map((t) => new Date(t.due_on!));
    const latestDue =
      taskDueDates.length > 0
        ? new Date(Math.max(...taskDueDates.map((d) => d.getTime())))
        : null;

    return {
      id: proj.gid,
      name: proj.name,
      clientId: "user-1",
      description: proj.notes || "",
      status,
      progress: computeProgress(tasks),
      startDate: proj.start_on
        ? new Date(proj.start_on)
        : new Date(proj.created_at),
      targetDate: proj.due_on
        ? new Date(proj.due_on)
        : latestDue ?? new Date(),
      milestones,
      createdAt: new Date(proj.created_at),
      updatedAt: new Date(proj.modified_at),
    };
  } catch {
    return null;
  }
}
