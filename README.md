# gathertown-leaderboards
This program automates the generation of a leaderboards image for GatherTown spaces.

## How it works
This project runs on NodeJS, using the command `node index`.

This project makes use of Google Sheets v4, Supabase, and GatherTown APIs. Google Sheets is used to keep track of the scores, and the program retrieves the scores every `x` milliseconds using `setInterval`. ImageScript is used to generate the leaderboard and preview images, and then uploaded to Supabase Storage. Once uploaded to Supabase, the public URL to the image is retrieved and the leaderboard objects are created in GatherTown as embedded image objects.

## Configuration
A `config.js` file is needed in the same directory as this README.
```javascript
module.exports = {
  GATHER_API_KEY: "your-gather-town-api-key",
  GATHER_SPACE_ID: "your-space-id\\space-name",
  SHEET_API_KEY: "your-google-sheet-api",
  SHEET_ID: "your-google-sheet-id",
  SUPABASE_KEY: "your-supabase-key",
  SUPABASE_URL: "your-supabase-url",
  SUPABASE_EMAIL: "your-email",
  SUPABASE_PASSWORD: "your-password",
}
```
A `rooms.json` file is also needed. This file tells hte program in which rooms the leaderboard objects should be created, and the positions where they should be placed.
```json
[
  {
    "mapId": "room-name",
    "leaderboardPositions": [[1, 0]]
  }
]
```

## Gotchas
- Note object does not allow newlines \
At first, I wanted to use note objects to display the scores, but I soon found out that GatherTown removes all newline characters... I resorted to using images as a resort
- Imagescript \
Newlines do not render properly, so for separate lines I had to add them separately. This also allowed for better customisation despite the extra effort. Fonts look really bad at certain sizes, using multiples of 8 turned out to be better for me.
- Image caching \
Updating the images in Supabase did not cause the leaderboard objects in GatherTown to update, unless the page is refreshed, but I did not want that. I figured it was because the same link was used, so I renamed the images whenever a new one was uploaded. I created two folder in my public bucket: `leaderboard` and `leaderboard-preview`, and put the respective images in each folder, with each file being named `[n].png`, where `n` is a number. Whenever a new image is uploaded, `[n]` is incremented by one to get a new URL. However, I seemed to have the same issue, so instead of updating and renaming, I uploaded a new image with the new file name, and removed the old one. This fixed the issue for me.
- Supabase \
I had quite some trouble with this. When trying to select anything related to the buckets, I kept getting 404 messages. Turns out I had to be an authenticated user, which can be done using `supabase.auth.signIn()`. Additionally, I had to add policies to the bucket on the Supabase website. Supabase provided emplates to make it simpler to add policies.

## Attribution
The font I used for the leaderboards is Cascadia Code, and has the SIL Open Font License (OFL). \
The image I used for the leaderboards object is from [http://pixelartmaker.com/art/966909ed1267c80](http://pixelartmaker.com/art/966909ed1267c80).
