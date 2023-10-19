import { prisma } from "@/lib/db";

const toListData = (data: BasecampCardData): BasecampListData => {
  return {
    content: data.title,
    description: data.content,
    due_on: data.due_on,
    assignee_ids: data.assignee_ids,
  };
};

export async function POST(request: Request) {
  // Scope to make sure we don't have variable leaking
  {
    // Get the token from the KV store
    const bearer = await prisma.credentials.findFirst({
      where: { key: "basecamp_bearer" },
    });
    // Check to see if the token is still valid
    const authRequest = await fetch(
      "https://launchpad.37signals.com/authorization.json",
      {
        method: "GET",
        headers: new Headers({
          Authorization: "Bearer " + bearer?.value,
        }),
      }
    );
    // We are not authorized
    if (authRequest.status === 401) {
      // Fetch the endpoint to get a new token
      const refreshResponse = await fetch(
        `https://launchpad.37signals.com/authorization/token?` +
          `type=refresh&` +
          `refresh_token=${process.env.BASECAMP_REFRESH_TOKEN}&` +
          `client_id=${process.env.BASECAMP_CLIENT_ID}&` +
          `redirect_uri=${process.env.BASECAMP_REDIRECT_URI}` +
          `&client_secret=${process.env.BASECAMP_CLIENT_SECRET}`,
        {
          method: "POST",
        }
      );
      // We have our new token now
      const newToken = (await refreshResponse.json()) as {
        access_token: string;
        expires_in: number;
      };
      console.log(newToken);
      // Put the new bearer token to the KV store
      await prisma.credentials.update({
        data: { value: newToken.access_token },
        where: { key: "basecamp_bearer" },
      });
    }
  }

  // We need to make sure that we have the newest bearer token
  const bearer = await prisma.credentials.findFirst({
    where: { key: "basecamp_bearer" },
  });
  // Get the data from the request made to the worker
  const formJson: RequestData = await request.json();
  console.log("Received this data from google forms:");
  console.log(formJson);

  // Calculate a week from now
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  // If we don't have any information about the due date set it to a week from now
  if (!formJson.due_on || formJson.due_on.length === 0) {
    // Only take the data that we need
    formJson.due_on = nextWeek.toISOString().slice(0, 10);
  }

  // Switch based on whether we are pushing to a card table or todo list
  const basecampURL =
    `https://3.basecampapi.com/5395843/buckets/${formJson.projectId}/` +
    (formJson.type === "list"
      ? `todolists/${formJson.subId}/todos.json`
      : `card_tables/lists/${formJson.subId}/cards.json`);

  // Fetch the API endpoint to create a new todo or card
  const response = await fetch(basecampURL, {
    method: "POST",
    headers: new Headers({
      Authorization: "Bearer " + bearer,
      "Content-Type": "application/json",
      Accept: "*/*",
      // User agent is required by basecamp (not sure how strictly this is enforced)
      "User-Agent":
        "Forms to basecamp adapter (alexandertaylor@cedarville.edu)",
    }),
    // Convert the data to the different formats
    // (list format makes no sense, but that's another story)
    body: JSON.stringify(
      formJson.type === "list"
        ? toListData(formJson)
        : (formJson as BasecampCardData)
    ),
  });
  // Log the response we get back
  console.log("Received response " + response.status);

  return new Response("200/OK");
}
