const fetch = require('node-fetch');
const fs = require('fs')
const { google } = require('googleapis');
const { Image, TextLayout } = require('imagescript');
const { createClient } = require('@supabase/supabase-js')
const {
  GATHER_API_KEY,
  GATHER_SPACE_ID,
  SHEET_API_KEY,
  SHEET_ID,
  SUPABASE_KEY,
  SUPABASE_URL,
  SUPABASE_EMAIL,
  SUPABASE_PASSWORD,
} = require('./config.js');

const sheets = google.sheets({
  version: 'v4',
  auth: SHEET_API_KEY, // Use Sheet API key as auth
});

const request = {
  spreadsheetId: SHEET_ID,
  range: 'CQ Games Day Points!O5:O16',
  majorDimension: 'COLUMNS',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

main().catch(console.error);
setInterval(() => main().catch(console.error), 300000);

async function main() {
  const now = new Date().toLocaleString();
  console.log('main', now);

  const response = (await sheets.spreadsheets.values.get(request)).data;
  const scores = response.values[0];

  const leaderboard = new Map();
  for (let i = 0; i < scores.length; i++) {
    leaderboard.set(i + 1, Number(scores[i]));
  }

  const sortedLeaderboard = new Map([...leaderboard.entries()].sort((a, b) => b[1] - a[1]));

  const font = fs.readFileSync('./font/Cascadia.ttf');
  const fontSize = 16;
  const textLayout = new TextLayout();

  const leaderboardPreviewImgFile = await generateLeaderboardPreview(now, font, fontSize, textLayout);
  const leaderboardImgFile = await generateLeaderboard(sortedLeaderboard, now, font, fontSize, textLayout);

  // Authenticate yourself
  await supabase.auth.signIn({
    email: SUPABASE_EMAIL,
    password: SUPABASE_PASSWORD,
  });

  const leaderboardImgUrl = await updateSupabaseImg('leaderboard', leaderboardImgFile);
  const leaderboardPreviewImgUrl =
    await updateSupabaseImg('leaderboard-preview', leaderboardPreviewImgFile);

  const rooms = JSON.parse(fs.readFileSync('rooms.json'));
  for (const room of rooms) {
    const { mapId, leaderboardPositions: positions } = room;
    updateMapsLeaderboards(mapId, positions, leaderboardImgUrl, leaderboardPreviewImgUrl);
  }
}

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

function createLeaderboardObject(x, y, mapId, image, preview) {
  const objectImgUrl = "https://raw.githubusercontent.com/grilledwindow/gathertown-leaderboards/main/img/leaderboard-object.png";
  return {
    type: 2,
    width: 1,
    height: 1,
    scale: 1,
    id: `leaderboards-${mapId}-${x}x${y}`,
    x,
    y,
    distThreshold: 2,
    normal: objectImgUrl,
    highlighted: objectImgUrl,
    templateId: "leaderboards",
    color: "default",
    orientation: 0,
    properties: {
      image,
      preview,
    },
    _name: "leaderboards",
    _tags: ["Custom"],
  };
}

function clearAllLeaderboards(objects) {
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

function createText(text, font, fontSize, textLayout) {
  return Image.renderText(font, fontSize, text, 0x000000ff, textLayout);
}

async function generateLeaderboardPreview(now, font, fontSize, textLayout) {
  const imgWidth = fontSize * 14;
  const imgHeight = fontSize * 3.3;
  const marginLeft = 2;

  const img = new Image(imgWidth, imgHeight).fill(0xffffffff);

  // Title
  let imgText = await createText('LEADERBOARDS', font, fontSize * 1.5, textLayout);
  img.composite(imgText, marginLeft, 0);

  // Last updated
  imgText = await createText(now, font, fontSize, textLayout);
  img.composite(imgText, marginLeft, fontSize * 1.8);

  return await img.encode();
}

async function generateLeaderboard(leaderboard, now, font, fontSize, textLayout) {
  const imgWidth = fontSize * 18;
  const imgHeight = fontSize * 20;
  const marginLeft = fontSize;

  const img = new Image(imgWidth, imgHeight).fill(0xffffffff);
  // Title
  const imgText = await createText('LEADERBOARDS', font, fontSize * 1.5, textLayout);
  img.composite(imgText, marginLeft, 0);

  // Last updated
  let i = 1;
  for (const text of ['Last updated', now]) {
    const imgText = await createText(text, font, fontSize, textLayout);
    img.composite(imgText, marginLeft, (i + 0.6) * fontSize * 1.2);
    i++;
  }

  i = 1;
  for (const [k, v] of leaderboard.entries()) {
    const position = String(i).padStart(2, ' ');
    const groupNo = String(k).padStart(2, ' ');
    const score = String(v).padStart(4, ' ');
    const text = `${position}.  Group ${groupNo}    ${score} pts`;
    const row = await createText(text, font, fontSize, textLayout);
    img.composite(row, marginLeft, (i + 3.3) * fontSize * 1.2);
    i++;
  }

  return await img.encode();
}

async function updateSupabaseImg(folder, imgFile) {
  const { data } = await supabase.storage.from('public').list(folder);
  const file = data[0];

  // Increments 0.png to 1.png and so on
  const len = file.name.length;
  const newFileName = (Number(file.name.slice(0, len - 4)) + 1) + '.png';
  const newPath = `${folder}/${newFileName}`;

  await supabase.storage.from('public')
    .upload(newPath, imgFile, {
      contentType: 'image/png',
    });

  await supabase.storage.from('public')
    .remove([`${folder}/${file.name}`]);

  const { publicURL } = supabase.storage.from('public').getPublicUrl(newPath);
  console.log(`${newPath} Url: ${publicURL}`);

  return publicURL;
}

async function updateMapsLeaderboards(mapId, positions, imgUrl, previewUrl) {
  const mapContent = await getMap(mapId);
  clearAllLeaderboards(mapContent.objects);

  for (const [x, y] of positions) {
    const leaderboardObject = createLeaderboardObject(x, y, mapId, imgUrl, previewUrl);
    mapContent.objects.push(leaderboardObject);
  }

  setMap(mapContent, mapId);
}