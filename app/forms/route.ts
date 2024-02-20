import { checkAuth, createCard } from "@/lib/api/basecamp";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await checkAuth();
  
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
  
    await createCard(formJson);
  
    return new Response("200/OK");
  } catch (e) {
    console.error(e);
    return new Response("500/Server Error" + e);
  }
}
