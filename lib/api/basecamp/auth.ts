import { prisma } from "@/lib/db";

const checkAuth = async () => {
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
  if (authRequest.status !== 200) {
    console.log("Need to get a new token.");
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
};

export { checkAuth };
