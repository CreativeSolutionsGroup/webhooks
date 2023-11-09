declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASECAMP_CLIENT_ID: string;
      BASECAMP_CLIENT_SECRET: string;
      BASECAMP_REDIRECT_URI: string;
      BASECAMP_REFRESH_TOKEN: string;
      DATABASE_URL: string;
      SMARTSHtEET_API: string;
    }
  }
}

export async function GET(request: Request) {
  return Response.json({
    routes: ["POST /forms", "POST /smartsheet"],
    timestamp: new Date(Date.now()).toISOString(),
  });
}
