import { prisma } from "@/lib/db";

const getColumn = (name: string, row: Row, columnList: ColumnsList) => {
  const columnValue = getRawColumn(name, row, columnList);

  if (columnValue) {
    if (columnValue.displayValue) {
      return columnValue.displayValue;
    } else if (columnValue.value) {
      return columnValue.value;
    } else {
      return "<span style='color:red'>N/A</span>";
    }
  }

  return "";
};

const getRawColumn = (name: string, row: Row, columnList: ColumnsList) => {
  const column = columnList.data.find((v) => v.title === name);
  if (column) {
    return row.cells.find((v) => v.columnId === column.id);
  }
  return undefined;
};

export async function POST(request: Request) {
  // The challenge is sent every 50 requests or so to make sure that the webhook is still alive
  const challenge = request.headers.get("Smartsheet-Hook-Challenge");
  if (challenge) {
    // We have a challenge header so we need to construct the response
    const res = new Response(`{smartsheetHookResponse: "${challenge}"}`, {
      status: 200,
      headers: { "Smartsheet-Hook-Response": challenge },
    });
    console.log(res);
    return res;
  }

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
          Authorization: "Bearer " + bearer,
        }),
      }
    );
    // We are not authorized
    if (authRequest.status === 401) {
      // Fetch the endpoint to get a new token
      const refreshResponse = await fetch(
        `https://launchpad.37signals.com/authorization/token?type=refresh&` +
          `refresh_token=${process.env.BASECAMP_REFRESH_TOKEN}&` +
          `client_id=${process.env.BASECAMP_CLIENT_ID}&` +
          `redirect_uri=${process.env.BASECAMP_REDIRECT_URI}&` +
          `client_secret=${process.env.BASECAMP_CLIENT_SECRET}`,
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
        where: { key: "basecamp_bearer" },
        data: { value: newToken.access_token },
      });
    }
  }

  // We need to make sure that we have the newest bearer token
  const bearer = await prisma.credentials.findFirst({
    where: { key: "basecamp_bearer" },
  });

  // Get the SmartSheet API key from the KV Store
  const sheetKey = process.env.SMARSHEET_API;

  // Get the information the hook sends to us
  const eventInfo = (await request.json()) as Callback;

  // Loop over the events
  for (let i = 0; i < eventInfo.events.length; i++) {
    const event = eventInfo.events[i];
    // We ignore deleted events
    if (event.eventType === "deleted") {
      continue;
    }

    // Get the column names for the sheet
    const columnsDescriptor = (await (
      await fetch(
        "https://api.smartsheet.com/2.0/sheets/5206820445808516/columns",
        {
          headers: { Authorization: `Bearer ${sheetKey}` },
        }
      )
    ).json()) as ColumnsList;

    // Get the row that changed
    const rowInfo = (await (
      await fetch(
        `https://api.smartsheet.com/2.0/sheets/5206820445808516/rows/${event.rowId}`,
        {
          headers: { Authorization: `Bearer ${sheetKey}` },
        }
      )
    ).json()) as Row;

    // Get the person assigned to the event
    const eventManager = getRawColumn(
      "Event Manager Assigned",
      rowInfo,
      columnsDescriptor
    );
    if (!eventManager) {
      // Nobody is assigned, ignore it
      continue;
    }

    console.log(rowInfo);

    // Construct the content
    const basecampContent = `
    <h3>${getColumn("Event/Program Name", rowInfo, columnsDescriptor)}</h3>
    <h3>Description:</h3>
    <p>${getColumn("Event/Program Description", rowInfo, columnsDescriptor)}</p>
    <p>This is a ${getColumn(
      "Event Type",
      rowInfo,
      columnsDescriptor
    )} requested by the ${getColumn(
      "University Division",
      rowInfo,
      columnsDescriptor
    )} division</p>
    <p><b>University Budget Number:</b> ${getColumn(
      "University Budget Number",
      rowInfo,
      columnsDescriptor
    )}</p>
    <p><b>Projected Attendance</b> ${getColumn(
      "Projected Attendance",
      rowInfo,
      columnsDescriptor
    )}</p>
    <h3>Dates and Times</h3>
    <ul>
    <li><b>Start Date:</b> ${getColumn(
      "Proposed Start Date",
      rowInfo,
      columnsDescriptor
    )}</li>
    <li><b>Start Time:</b> ${getColumn(
      "Start Time",
      rowInfo,
      columnsDescriptor
    )}</li>
    <li><b>End Date:</b> ${getColumn(
      "Proposed End Date",
      rowInfo,
      columnsDescriptor
    )}</li>
    <li><b>End Time:</b> ${getColumn(
      "End Time",
      rowInfo,
      columnsDescriptor
    )}</li>
    </ul>
    <h3>Spaces and Services</h3>
    <p><b>Requested Space:</b> ${getColumn(
      "Desired University Space",
      rowInfo,
      columnsDescriptor
    )}</p>
    <p><b>Requested Services:</b> ${getColumn(
      "Desired Services",
      rowInfo,
      columnsDescriptor
    )}</p>
    <p><b>Booked in EMS:</b> ${
      getRawColumn("Booked in EMS?", rowInfo, columnsDescriptor) ? "YES" : "NO"
    }</p>
    <h3>Contact Info</h3>
    <ul>
    <li><b>Name:</b> ${getColumn(
      "Contact Name",
      rowInfo,
      columnsDescriptor
    )}</li>
    <li><b>Email:</b> ${getColumn(
      "Contact Email",
      rowInfo,
      columnsDescriptor
    )}</li>
    </ul>
    `;

    // List of all the IDs in Basecamp
    const eventManagers: { [key: string]: number } = {
      Burns: 40264334,
      Pickering: 40264335,
      Long: 40286803,
      Faulkner: 40286804,
      Park: 40286806,
      Oliver: 42497941,
    };

    const basecampURL =
      "https://3.basecampapi.com/5395843/buckets/28387661/card_tables/lists/6394048191/cards.json";

    // Perform the request to Basecamp
    const basecampFetch = await fetch(basecampURL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + bearer,
        "Content-Type": "application/json",
        Accept: "*/*",
        // User agent is required by basecamp (not sure how strictly this is enforced)
        "User-Agent": "Smartsheet to basecamp (alexandertaylor@cedarville.edu)",
      },
      body: JSON.stringify({
        title: `${getColumn(
          "Event/Program Name",
          rowInfo,
          columnsDescriptor
        )} - ${getColumn(
          "Contact Name",
          rowInfo,
          columnsDescriptor
        )} - ${getColumn(
          "Proposed Start Date",
          rowInfo,
          columnsDescriptor
        )} through ${getColumn(
          "Proposed End Date",
          rowInfo,
          columnsDescriptor
        )}`,
        content: basecampContent,
        due_on: new Date(Date.now() + 1000 * 60 * 60 * 72),
        assignee_ids: [
          eventManagers[eventManager.value ?? eventManager.displayValue],
        ],
      }),
    });

    console.log(basecampFetch.status);
  }

  return new Response("200/OK");
}
