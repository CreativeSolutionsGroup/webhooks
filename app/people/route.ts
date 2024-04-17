import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const authorization = req.headers.get("authorization");
  if (authorization == null) return new Response(null, { status: 401 });

  // This is a workaround until we have a central auth server.
  // To use the user path you must have the `view` credential.
  // TODO: CENTRAL AUTH SERVER
  const authRes = await fetch(
    "https://kiosk-backend.cusmartevents.com/api/user",
    { headers: { authorization } }
  );
  if (authRes.status !== 200) return new Response(null, { status: 403 });

  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "No prox ID provided" },
      { status: 400 }
    );
  }
  
  const person = await fetch(
    process.env.PEOPLE_URL +
      (id.length === 7 ? "personid" : "proxid") +
      "?id=" +
      (id.length < 5 ? id.padStart(5, "0") : id),
    {
      headers: {
        "x-functions-key": process.env.PEOPLE_KEY as string,
      },
    }
  );

  return NextResponse.json(await person.json(), {
    headers: { "content-type": "application/json" },
  });
}
