import { checkAuth, createCard } from "@/lib/api/basecamp";
import { updateCard, updateCardComment } from "@/lib/api/basecamp/update";
import { getColumn, getRawColumn } from "@/lib/api/smartsheet";
import { prisma } from "@/lib/db";

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

  await checkAuth();

  // Get the SmartSheet API key from the KV Store
  const sheetKey = process.env.SMARTSHEET_API;

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
    const columns = (await (
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

    const smartsheetRow = await prisma.smartsheetRow.findFirst({
      where: { smartsheetId: rowInfo.id.toString() },
      include: { cells: true },
    });

    // Get the person assigned to the event
    const eventManager = getRawColumn(
      "Event Manager Assigned",
      rowInfo,
      columns
    );
    if (!eventManager) {
      // Nobody is assigned, ignore it
      continue;
    }

    // Construct the title
    const basecampTitle = `${getColumn(
      "Event/Program Name",
      rowInfo,
      columns
    )} - ${getColumn("Contact Name", rowInfo, columns)} - ${getColumn(
      "Proposed Start Date",
      rowInfo,
      columns
    )} through ${getColumn("Proposed End Date", rowInfo, columns)}`;

    // Construct the content
    const basecampContent = `
    <h3>${getColumn("Event/Program Name", rowInfo, columns)}</h3>
    <h3>Description:</h3>
    <p>${getColumn("Event/Program Description", rowInfo, columns)}</p>
    <p>
      This is a ${getColumn("Event Type", rowInfo, columns)} 
      requested by the ${getColumn("University Division", rowInfo, columns)} 
      division
    </p>
    <p>
      <b>University Budget Number:</b> 
      ${getColumn("University Budget Number", rowInfo, columns)}
    </p>
    <p>
      <b>Projected Attendance</b> 
      ${getColumn("Projected Attendance", rowInfo, columns)}
    </p>
    <h3>Dates and Times</h3>
    <ul>
      <li>
        <b>Start Date:</b> 
        ${getColumn("Proposed Start Date", rowInfo, columns)}
      </li>
      <li><b>Start Time:</b> ${getColumn("Start Time", rowInfo, columns)}</li>
      <li>
        <b>End Date:</b> 
        ${getColumn("Proposed End Date", rowInfo, columns)}
      </li>
      <li><b>End Time:</b> ${getColumn("End Time", rowInfo, columns)}</li>
    </ul>
    <h3>Spaces and Services</h3>
    <p>
      <b>Requested Space:</b> 
      ${getColumn("Desired University Space", rowInfo, columns)}
    </p>
    <p>
      <b>Requested Services:</b>
      ${getColumn("Desired Services", rowInfo, columns)}
    </p>
    <p><b>Booked in EMS:</b> ${
      getRawColumn("Booked in EMS?", rowInfo, columns) ? "YES" : "NO"
    }</p>
    <h3>Contact Info</h3>
    <ul>
      <li><b>Name:</b> ${getColumn("Contact Name", rowInfo, columns)}</li>
      <li><b>Email:</b> ${getColumn("Contact Email", rowInfo, columns)}</li>
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

    if (!smartsheetRow) {
      const createdCard = await createCard({
        title: basecampTitle,
        content: basecampContent,
        due_on: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        projectId: "32112585", //"28387661",
        subId: "5977136283", //"6394048191",
        type: "card_table",
        assignee_ids: [
          eventManagers[eventManager.value ?? eventManager.displayValue],
        ],
      });

      await prisma.smartsheetRow.create({
        data: {
          accessLevel: rowInfo.accessLevel,
          sheetId: rowInfo.sheetId.toString(),
          createdAt: rowInfo.createdAt,
          modifiedAt: rowInfo.modifiedAt,
          rowNumber: rowInfo.rowNumber,
          expanded: rowInfo.expanded,
          version: rowInfo.version,
          basecampId: createdCard.id.toString(),
          smartsheetId: rowInfo.id.toString(),
          cells: {
            createMany: {
              data: rowInfo.cells.map((v) => ({
                columnId: v.columnId.toString(),
                value: v.value?.toString(),
                displayValue: v.value?.toString(),
              })),
            },
          },
        },
      });
    } else {
      let changes = "";

      rowInfo.cells.forEach(async (smartsheetCell) => {
        const dbCell = smartsheetRow.cells.find(
          (v) => v.columnId.toString() === smartsheetCell.columnId.toString()
        );

        if (dbCell && dbCell.value != smartsheetCell.value) {
          changes +=
            "<h4>" +
            columns.data.find(
              (v) => v.id.toString() === dbCell.columnId.toString()
            )?.title +
            ":</h4><p>" +
            dbCell.value +
            " -> " +
            smartsheetCell.value +
            "</p>";

          await prisma.smartsheetCell.update({
            where: { id: dbCell.id },
            data: {
              value: smartsheetCell.value.toString(),
              displayValue: smartsheetCell.displayValue.toString(),
            },
          });
        }
      });

      if (smartsheetRow.basecampId) {
        updateCardComment("32112585", smartsheetRow.basecampId, changes);

        updateCard({
          title: basecampTitle,
          content: basecampContent,
          due_on: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
          projectId: "32112585", //"28387661",
          cardID: smartsheetRow.basecampId,
          type: "card_table",
          assignee_ids: [
            eventManagers[eventManager.value ?? eventManager.displayValue],
          ],
        });
      }
    }
  }

  return Response.json({ message: "200/OK" }, { status: 200 });
}
