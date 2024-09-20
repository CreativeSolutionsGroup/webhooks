import { prisma } from "@/lib/db";

export const getTodo = async (todoId: number): Promise<BasecampListData> => {
  const bearer = await prisma.credentials.findFirst({
    where: { key: "basecamp_bearer" },
  });

  const basecampUrl = `https://3.basecampapi.com/5395843/buckets/38088480/todos/${todoId}.json`;

  const response = await fetch(basecampUrl, {
    method: "GET",
    headers: new Headers({
      Authorization: "Bearer " + bearer?.value,
      "Content-Type": "application/json",
      Accept: "*/*",
      "User-Agent":
        "Webhook to basecamp adapter (alexandertaylor@cedarville.edu)",
    }),
  });

  const data = await response.json();

  return {
    content: data.title,
    description: data.description,
    due_on: data.due_on,
    assignee_ids: data.assignees,
  };
};
