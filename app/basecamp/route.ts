import { checkAuth, createCard, getTodo } from "@/lib/api/basecamp";

export async function POST(request: Request) {
  try {
    await checkAuth();

    const formData = await request.json();
    if (formData["kind"] != "todo_created") {
      return new Response("202/Accepted", { status: 202 });
    }

    const todoId = formData["recording"]["id"];
    const todoContent = await getTodo(todoId);
    const cleanData = todoContent.description
      .replaceAll("\n", "")
      .replace(/^[^{]*|[^}]*$/g, "");
    const cardInfo = JSON.parse(cleanData);

    await createCard({
      title: todoContent.content,
      content: cardInfo.content,
      due_on: todoContent.due_on,
      type: "card_table",
      projectId: cardInfo.project_id,
      subId: cardInfo.column_id,
      assignee_ids: todoContent.assignee_ids,
    });

    return new Response("200/OK");
  } catch (e) {
    console.error(e);
    return new Response("500/Server Error", { status: 500 });
  }
}
