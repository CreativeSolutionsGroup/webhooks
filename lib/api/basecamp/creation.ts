import { prisma } from "@/lib/db";

const toListData = (data: BasecampCardData): BasecampListData => {
  return {
    content: data.title,
    description: data.content,
    due_on: data.due_on,
    assignee_ids: data.assignee_ids,
  };
};

const createCard = async (info: RequestData) => {
  // We need to make sure that we have the newest bearer token
  const bearer = await prisma.credentials.findFirst({
    where: { key: "basecamp_bearer" },
  });

  // Switch based on whether we are pushing to a card table or todo list
  const basecampURL =
    `https://3.basecampapi.com/5395843/buckets/${info.projectId}/` +
    (info.type === "list"
      ? `todolists/${info.subId}/todos.json`
      : `card_tables/lists/${info.subId}/cards.json`);

  // Fetch the API endpoint to create a new todo or card
  const response = await fetch(basecampURL, {
    method: "POST",
    headers: new Headers({
      Authorization: "Bearer " + bearer?.value,
      "Content-Type": "application/json",
      Accept: "*/*",
      // User agent is required by basecamp (not sure how strictly this is enforced)
      "User-Agent":
        "Webhook to basecamp adapter (alexandertaylor@cedarville.edu)",
    }),
    // Convert the data to the different formats
    // (list format makes no sense, but that's another story)
    body: JSON.stringify(
      info.type === "list" ? toListData(info) : (info as BasecampCardData)
    ),
  });

  return await response.json() as BasecampTask;
};

export { createCard, toListData };
