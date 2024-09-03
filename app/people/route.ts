import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function parseJWT(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const authorization = req.headers.get("authorization");
  if (authorization == null) return new Response(null, { status: 401 });

  const authorized = !!(await prisma.authorizedUsers.findFirst({
    where: { email: parseJWT(authorization.split(" ")[1]).email },
  }));

  if (!authorized) return new Response(null, { status: 403 });

  const id = searchParams.get("id");
  if (!id || id.length > 7) {
    return NextResponse.json(
      { message: "Invalid ID" },
      { status: 400 }
    );
  }

  const person = await fetch(
    (process.env.PEOPLE_URL +
      (id.length === 7 ? "PersonId" : "ProxId") +
      "?id=" +
      (id.length < 5 ? id.padStart(5, "0") : id) +
      "&keyname=CSG&key=" +
      process.env.PEOPLE_KEY) as string
  );

  return NextResponse.json(await person.json(), {
    headers: { "content-type": "application/json" },
  });
}
