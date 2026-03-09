import { Tag } from "../types/task";
const API_AI_URL = process.env.NEXT_PUBLIC_TASKMASTER_AI_URL!;

export async function sendNewTaskToAIAPI(task: {
  title: string;
  description?: string;
  completed?: boolean;
  urgent?: boolean;
  due_date: string;
  due_time: string;
  tags: Tag[];
  category?: string;
  completed_date?: string | null;
  estimated_time: number;
  complexity: number;
}) {
  const res = await fetch(`${API_AI_URL}/plan-tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    throw new Error("Failed to send new task to AI");
  }

  return res.json();
}

