import { asanaFetch } from "@/lib/asana";
import type { MessageThread, Message } from "@/data/types";

// -- Asana API types --

interface AsanaStory {
  gid: string;
  type: string;
  resource_subtype: string;
  text: string;
  created_at: string;
  created_by: { gid: string; name: string } | null;
}

interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  created_at: string;
  modified_at: string;
  assignee: { gid: string; name: string } | null;
  followers: { gid: string; name: string }[];
  memberships: { project: { gid: string; name: string } }[];
}

/**
 * Check if a user (by Asana GID) is involved in a task:
 * either as assignee, follower, or commenter.
 */
function isUserInvolved(
  userGid: string,
  task: AsanaTask,
  comments: AsanaStory[]
): boolean {
  // Check if assignee
  if (task.assignee?.gid === userGid) return true;
  // Check if follower
  if (task.followers?.some((f) => f.gid === userGid)) return true;
  // Check if commenter
  if (comments.some((c) => c.created_by?.gid === userGid)) return true;
  return false;
}

interface AsanaProject {
  gid: string;
  name: string;
}

// -- Helpers --

function getConfiguredProjectIds(): string[] | null {
  const ids = process.env.ASANA_PROJECT_IDS;
  if (!ids) return null;
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// -- Public API --

/**
 * Fetches tasks (with comments) from configured Asana projects and maps them
 * to MessageThread objects. Each task with at least one comment becomes a thread.
 */
export async function getAsanaThreads(
  filterByUserGid?: string | null
): Promise<MessageThread[]> {
  const projectIds = getConfiguredProjectIds();
  if (!projectIds || projectIds.length === 0) return [];

  const allThreads: MessageThread[] = [];

  for (const projectId of projectIds) {
    // Fetch the project name for context
    const project = await asanaFetch<AsanaProject>(
      `/projects/${projectId}`,
      { opt_fields: "name" }
    );

    const tasks = await asanaFetch<AsanaTask[]>(
      `/projects/${projectId}/tasks`,
      {
        opt_fields:
          "name,notes,created_at,modified_at,assignee,assignee.name,followers,followers.name",
        limit: "100",
      }
    );

    // For each task, check if it has comments by fetching stories
    const threadsFromTasks = await Promise.all(
      tasks.map(async (task) => {
        const stories = await asanaFetch<AsanaStory[]>(
          `/tasks/${task.gid}/stories`,
          {
            opt_fields:
              "type,resource_subtype,text,created_at,created_by,created_by.name",
          }
        );

        const comments = stories.filter(
          (s) => s.resource_subtype === "comment_added"
        );

        // Only create a thread if there are comments
        if (comments.length === 0) return null;

        // If filtering by user, skip tasks where user is not involved
        if (
          filterByUserGid &&
          !isUserInvolved(filterByUserGid, task, comments)
        ) {
          return null;
        }

        const participants = new Set<string>();
        if (task.assignee) participants.add(task.assignee.name);
        for (const follower of task.followers ?? []) {
          participants.add(follower.name);
        }
        for (const comment of comments) {
          if (comment.created_by) participants.add(comment.created_by.name);
        }

        const lastComment = comments[comments.length - 1];

        const thread: MessageThread = {
          id: task.gid,
          subject: task.name,
          participants: Array.from(participants),
          projectId,
          projectName: project.name,
          lastMessageAt: new Date(lastComment.created_at),
          unreadCount: 0,
          createdAt: new Date(task.created_at),
        };

        return thread;
      })
    );

    for (const thread of threadsFromTasks) {
      if (thread) allThreads.push(thread);
    }
  }

  return allThreads.sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );
}

/**
 * Fetches a single task and returns it as a MessageThread.
 * Includes project name from the task's membership.
 */
export async function getAsanaThreadById(
  taskId: string
): Promise<MessageThread | null> {
  try {
    const task = await asanaFetch<AsanaTask>(`/tasks/${taskId}`, {
      opt_fields:
        "name,notes,created_at,modified_at,assignee.name,followers.name,memberships.project.gid,memberships.project.name",
    });

    const stories = await asanaFetch<AsanaStory[]>(
      `/tasks/${taskId}/stories`,
      {
        opt_fields: "type,resource_subtype,text,created_at,created_by.name",
      }
    );

    const comments = stories.filter(
      (s) => s.resource_subtype === "comment_added"
    );

    const participants = new Set<string>();
    if (task.assignee) participants.add(task.assignee.name);
    for (const follower of task.followers ?? []) {
      participants.add(follower.name);
    }
    for (const comment of comments) {
      if (comment.created_by) participants.add(comment.created_by.name);
    }

    const lastComment = comments[comments.length - 1];
    const projectMembership = task.memberships?.[0]?.project;

    return {
      id: task.gid,
      subject: task.name,
      participants: Array.from(participants),
      projectId: projectMembership?.gid,
      projectName: projectMembership?.name,
      lastMessageAt: lastComment
        ? new Date(lastComment.created_at)
        : new Date(task.modified_at),
      unreadCount: 0,
      createdAt: new Date(task.created_at),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches all comment stories on a task and maps them to Message objects.
 */
export async function getAsanaMessagesByThread(
  taskId: string
): Promise<Message[]> {
  const stories = await asanaFetch<AsanaStory[]>(
    `/tasks/${taskId}/stories`,
    {
      opt_fields: "type,resource_subtype,text,created_at,created_by.name",
    }
  );

  return stories
    .filter((s) => s.resource_subtype === "comment_added")
    .map((story) => ({
      id: story.gid,
      threadId: taskId,
      senderId: story.created_by?.gid ?? "unknown",
      senderName: story.created_by?.name ?? "Unknown",
      content: story.text,
      attachments: [],
      readBy: [],
      createdAt: new Date(story.created_at),
    }));
}

/**
 * Returns 0 since Asana API doesn't track portal-level unread state.
 */
export async function getAsanaTotalUnreadCount(): Promise<number> {
  return 0;
}
