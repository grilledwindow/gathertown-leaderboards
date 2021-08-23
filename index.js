const fetch = require('node-fetch');
const { google } = require('googleapis');
const {
  GATHER_API_KEY,
  GATHER_SPACE_ID,
  SHEET_API_KEY,
  SHEET_ID,
} = require('./config.js');

const sheets = google.sheets({
  version: 'v4',
  auth: SHEET_API_KEY, // Use Sheet API key as auth
});

main().catch(console.error);

async function main() {
  console.log(SHEET_ID)
  const request = {
    spreadsheetId: SHEET_ID,
    range: 'CQ Games Day Points!O5:O16',
  };

  const response = (await sheets.spreadsheets.values.get(request)).data;
  console.log(JSON.stringify(response, null, 2));

  const mapId = 'babies';
  const mapContent = await getMap(mapId);
  console.log(mapContent.objects[mapContent.objects.length - 1])

  const leaderboard = createLeaderboardObject(1, 0, mapId, '1. ME');
  clearAllLeaderboards(mapContent.objects);
  mapContent.objects.push(leaderboard);
  setMap(mapContent, mapId);
}

// function createLeaderboardObject()

function getMap(mapId) {
  return fetch(
    `https://gather.town/api/getMap?apiKey=${GATHER_API_KEY}&spaceId=${GATHER_SPACE_ID}&mapId=${mapId}`
  ).then(res => res.json());
}

function setMap(mapContent, mapId) {
  const body = {
    apiKey: GATHER_API_KEY,
    spaceId: GATHER_SPACE_ID,
    mapId,
    mapContent,
  };
  return fetch("https://gather.town/api/setMap", {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createLeaderboardObject(x, y, mapId, message) {
  const imgUrl = "https://raw.githubusercontent.com/grilledwindow/gathertown-leaderboards/main/img/leaderboard.png";
  return {
    type: 6,
    width: 1,
    height: 1,
    scale: 1,
    id: `leaderboards-${mapId}-${x}x${y}`,
    x,
    y,
    distThreshold: 2,
    normal: imgUrl,
    highlighted: imgUrl, // TODO, MAYBE
    templateId: "leaderboards",
    color: "default",
    orientation: 0,
    properties: { message },
    _name: "leaderboards",
    _tags: ["Custom"],
  };
}

function clearAllLeaderboards (objects) {
  let lastLeaderboardIndex = 0;
  let leaderboardCount = 0;
  for (let i = 0; i < objects.length; i++) {
    if ((objects[i].templateId).includes("leaderboard", 0)) {
      lastLeaderboardIndex = i;
      leaderboardCount++;
    }
  }
  objects.splice(lastLeaderboardIndex - leaderboardCount + 1, leaderboardCount);
}