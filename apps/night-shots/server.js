const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const multer = require('multer');


const path = require('path');

const app = express();
const generateId = () => Math.random().toString(36).substring(2, 10);
const PORT = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const historyPath = path.join(__dirname, '../midnight-shots-cli/night-shots-history.json');
const themePath = path.join(__dirname, 'theme.json');
app.get('/', (req, res) => {
  const create = req.query.create === '1';
  const view = req.query.view || 'builder';
  const sort = req.query.sort || 'new';
  const search = (req.query.search || '').toLowerCase();
 let savedTheme = 'light';

if (fs.existsSync(themePath)) {
  const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
  savedTheme = themeData.theme || 'light';
}

const theme = savedTheme;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }
history = history.filter(e => e.deleted !== true);
  if (sort === 'old') {
    history = history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } else {
    history = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  if (view === 'favorites') {
    history = history.filter(e => e.favorite === true);
  }

  if (search) {
    history = history.filter(e =>
      (e.cidText || '').toLowerCase().includes(search) ||
      (e.metadataText || '').toLowerCase().includes(search) ||
      (e.storyText || '').toLowerCase().includes(search) ||
      (e.tagText || '').toLowerCase().includes(search)
    );
  }

  let bg = '#f5f1ea';
  let text = '#111';
  let cardBg = '#ffffff';
  let cardText = '#111';

  if (theme === 'paper') {
    bg = '#f4eadb';
    text = '#2b2118';
    cardBg = '#fffaf0';
    cardText = '#2b2118';
  }

  if (theme === 'dark') {
    bg = '#0f1117';
    text = '#ffffff';
    cardBg = '#1f2937';
    cardText = '#ffffff';
  }

  if (theme === 'sunset') {
    bg = '#f7d6c5';
    text = '#2b1d18';
    cardBg = '#fff4ef';
    cardText = '#2b1d18';
  }

  if (theme === 'ocean') {
    bg = '#d9eef7';
    text = '#102a43';
    cardBg = '#f7fcff';
    cardText = '#102a43';
  }

  if (theme === 'pastel') {
    bg = '#ffe4f1';
    text = '#3a1f2d';
    cardBg = '#fff8fc';
    cardText = '#3a1f2d';
  }

  if (theme === 'family') {
    bg = '#ead8bd';
    text = '#2c1f14';
    cardBg = '#fff8e8';
    cardText = '#2c1f14';
  }

  const totalMemories = history.length;
  const favoriteCount = history.filter(memory => memory.favorite).length;
  const sharedCount = history.filter(memory => memory.visibility === 'shared').length;

  const journalPath = path.join(__dirname, 'journal.json');
  let journalCount = 0;

  if (fs.existsSync(journalPath)) {
    journalCount = JSON.parse(fs.readFileSync(journalPath, 'utf-8')).length;
  }

  const visibleHistory =
    view === 'gallery' || view === 'gallery-search'
      ? history.filter(memory => memory.photoPath)
      : history;

  const html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Night Shots</title>
    <style>
      .nightshots-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 22px;
      }

      .nightshots-stat-card {
        text-align: center;
      }

      @media (max-width: 520px) {
        .nightshots-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .nightshots-stat-card {
          padding: 12px 8px !important;
          border-radius: 14px !important;
        }

        .nightshots-stat-number {
          font-size: 22px !important;
        }

        .nightshots-stat-label {
          font-size: 12px !important;
        }
      }

      @media (max-width: 520px) {
        .nightshots-memory-grid {
          grid-template-columns: 1fr !important;
          gap: 14px !important;
        }

        .nightshots-memory-card {
          margin-bottom: 10px !important;
        }

        .nightshots-memory-photo-link {
          margin: 12px !important;
          padding: 12px 12px 28px 12px !important;
        }

        .nightshots-memory-photo {
          width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          max-height: 420px !important;
          object-fit: cover !important;
        }

        .nightshots-memory-content {
          padding: 12px !important;
        }

        .nightshots-memory-title-row {
          padding-right: 84px !important;
        }

        .nightshots-memory-title {
          font-size: 20px !important;
          overflow-wrap: anywhere;
        }
      }

      /* Scrapbook memory card polish */
      .nightshots-memory-card {
        background: ${cardBg} !important;
        color: ${cardText} !important;
        border: 1px solid rgba(0,0,0,0.08) !important;
        overflow: hidden !important;
        box-shadow: 0 10px 24px rgba(0,0,0,0.12) !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .nightshots-memory-card:nth-child(even) {
        transform: rotate(0.35deg) !important;
      }

      .nightshots-memory-card:nth-child(odd) {
        transform: rotate(-0.35deg) !important;
      }

      .nightshots-memory-card:hover {
        transform: translateY(-3px) rotate(0deg) !important;
        box-shadow: 0 14px 30px rgba(0,0,0,0.16) !important;
      }

      .nightshots-memory-photo-link {
        background: #ffffff !important;
        margin: 16px 16px 4px 16px !important;
        padding: 14px 14px 34px 14px !important;
        border-radius: 10px !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.16) !important;
      }

      .nightshots-memory-photo {
        width: 100% !important;
        min-width: 0 !important;
        height: 310px !important;
        object-fit: cover !important;
        border-radius: 5px !important;
      }

      .nightshots-memory-content {
        padding: 18px !important;
      }

      .nightshots-memory-title-row {
        min-height: 32px;
      }

      .nightshots-memory-title {
        line-height: 1.18;
        overflow-wrap: anywhere;
      }

      .nightshots-memory-content p {
        line-height: 1.55;
      }

      .nightshots-memory-content details {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed rgba(0,0,0,0.16);
      }

      @media (max-width: 520px) {
        .nightshots-memory-card:hover {
          transform: rotate(0deg) !important;
        }

        .nightshots-memory-photo-link {
          margin: 12px 12px 2px 12px !important;
        }

        .nightshots-memory-photo {
          height: auto !important;
          max-height: 420px !important;
        }
      }


      /* Card balance and mobile Create Memory polish */
      .nightshots-memory-grid {
        align-items: start;
      }

      .nightshots-memory-card {
        height: fit-content;
      }

      .nightshots-memory-card:not(:has(.nightshots-memory-photo-link)) {
        min-height: 0;
      }

      @media (max-width: 520px) {
        #addMemory form {
          padding: 0 16px 16px 16px !important;
        }

        #addMemory input[type="text"],
        #addMemory textarea,
        #addMemory button[type="submit"] {
          width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        #addMemory textarea {
          resize: vertical;
        }

        #addMemory input[type="file"] {
          width: 100%;
          box-sizing: border-box;
        }
      }


      /* Photo-first Gallery View */
      .nightshots-gallery-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 18px !important;
      }

      .nightshots-gallery-grid .nightshots-memory-card {
        transform: rotate(0deg) !important;
        border-radius: 18px !important;
        overflow: hidden !important;
      }

      .nightshots-gallery-grid .nightshots-memory-card:hover {
        transform: translateY(-4px) !important;
      }

      .nightshots-gallery-grid .nightshots-memory-photo-link {
        margin: 0 !important;
        padding: 10px 10px 26px 10px !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        transform: none !important;
      }

      .nightshots-gallery-grid .nightshots-memory-photo {
        height: 220px !important;
        max-height: none !important;
        object-fit: cover !important;
        border-radius: 6px !important;
      }

      .nightshots-gallery-grid .nightshots-memory-content {
        padding: 13px 14px 15px 14px !important;
      }

      .nightshots-gallery-grid .nightshots-memory-title-row {
        padding-right: 0 !important;
      }

      .nightshots-gallery-grid .nightshots-memory-title-row form,
      .nightshots-gallery-grid .nightshots-memory-content > p,
      .nightshots-gallery-grid .nightshots-memory-content details,
      .nightshots-gallery-grid .nightshots-memory-content > span,
      .nightshots-gallery-grid .nightshots-memory-content > div:not(.nightshots-memory-title-row) {
        display: none !important;
      }

      .nightshots-gallery-grid .nightshots-memory-title {
        font-size: 18px !important;
        display: block;
      }

      @media (max-width: 760px) {
        .nightshots-gallery-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .nightshots-gallery-grid .nightshots-memory-photo {
          height: 170px !important;
        }

        .nightshots-gallery-grid .nightshots-memory-content {
          padding: 10px 11px 12px 11px !important;
        }

        .nightshots-gallery-grid .nightshots-memory-title {
          font-size: 16px !important;
        }
      }

    </style>
  </head>
  <body style="font-family: Arial; background:${bg}; color:${text}; margin:0; padding:0;">
<div style="max-width:1000px; margin:auto; padding:80px 20px 20px 20px;">
<details style="position:absolute; top:20px; left:20px; z-index:50;">
  <summary style="list-style:none; cursor:pointer; background:white; color:black; border:1px solid #ddd; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); font-size:24px;">
    ☰
  </summary>

  <div style="margin-top:8px; background:white; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.18); padding:10px; width:180px;">
    
      <a href="/?create=1" style="display:block; padding:10px; color:black; text-decoration:none;">Create Memory</a>

      <a href="/?view=favorites" style="display:block; padding:10px; color:black; text-decoration:none;">Favorites 💙</a>

      <a href="/?view=search" style="display:block; padding:10px; color:black; text-decoration:none;">Search Memories 🔎</a>

      <a href="/?sort=new" style="display:block; padding:10px; color:black; text-decoration:none;">Newest First</a>

      <a href="/?sort=old" style="display:block; padding:10px; color:black; text-decoration:none;">Oldest First</a>

      <a href="/" style="display:block; padding:10px; color:black; text-decoration:none;">Show All</a>

      <a href="/?view=gallery" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery View</a>

      <a href="/?view=gallery-search" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery Search 🔎</a>

      <a href="/journal" style="display:block; padding:10px; color:black; text-decoration:none;">Journal</a>

      <a href="/journal-search" style="display:block; padding:10px; color:black; text-decoration:none;">Journal Search 🔎</a>

      <a href="/nft-creator" style="display:block; padding:10px; color:black; text-decoration:none;">NFT Creator 🎨</a>
      
      <a href="/trash" style="display:block; padding:10px; color:black; text-decoration:none;">Recycle Bin 🗑️</a>

      <a href="/feedback" style="display:block; padding:10px; color:black; text-decoration:none;">Beta Feedback</a>

<hr/>

<div style="padding:10px; font-size:12px; color:gray;">
  Themes
</div>

<a href="/theme/light" style="display:block; padding:10px; color:black; text-decoration:none;">Clean Light</a>

<a href="/theme/paper" style="display:block; padding:10px; color:black; text-decoration:none;">Scrapbook</a>

<a href="/theme/dark" style="display:block; padding:10px; color:black; text-decoration:none;">Midnight</a>


<a href="/theme/ocean" style="display:block; padding:10px; color:black; text-decoration:none;">Ocean</a>\n<a href="/theme/pastel" style="display:block; padding:10px; color:black; text-decoration:none;">Soft Pastel</a>\n
  </div>
</details>
<div class="nightshots-stats">
  <div class="nightshots-stat-card" style="background:${cardBg}; color:${cardText}; padding:14px; border-radius:16px; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
    <div class="nightshots-stat-number" style="font-size:24px; font-weight:bold;">${totalMemories}</div>
    <div class="nightshots-stat-label" style="font-size:13px;">Memories</div>
  </div>

  <div class="nightshots-stat-card" style="background:${cardBg}; color:${cardText}; padding:14px; border-radius:16px; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
    <div class="nightshots-stat-number" style="font-size:24px; font-weight:bold;">${favoriteCount}</div>
    <div class="nightshots-stat-label" style="font-size:13px;">Favorites</div>
  </div>

  <div class="nightshots-stat-card" style="background:${cardBg}; color:${cardText}; padding:14px; border-radius:16px; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
    <div class="nightshots-stat-number" style="font-size:24px; font-weight:bold;">${sharedCount}</div>
    <div class="nightshots-stat-label" style="font-size:13px;">Shared</div>
  </div>

  <div class="nightshots-stat-card" style="background:${cardBg}; color:${cardText}; padding:14px; border-radius:16px; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
    <div class="nightshots-stat-number" style="font-size:24px; font-weight:bold;">${journalCount}</div>
    <div class="nightshots-stat-label" style="font-size:13px;">Journals</div>
  </div>
</div>

</div>
      <div style="background:transparent; padding:15px; border-radius:10px; margin-bottom:20px;">
${view !== "gallery" && view !== "gallery-search" && view !== "favorites" && view !== "search" ? `\n<details id="addMemory"  style="background:${cardBg}; color:${cardText}; border-radius:16px; margin-bottom:24px; box-shadow:0 3px 10px rgba(0,0,0,0.10); overflow:hidden;">
  <summary style="font-size:22px; cursor:pointer; padding:18px; font-weight:bold; list-style:none;">
    Create Memory <span style="float:right;">＋</span>
  </summary>

  <form method="POST" action="/add" enctype="multipart/form-data" style="padding:0 18px 18px 18px;">
          <input name="cidText" placeholder="Title" required style="width:auto; min-width:220px; padding:10px; margin-bottom:10px;"/>
          <input name="metadataText" placeholder="Description" required style="width:auto; min-width:220px; padding:10px; margin-bottom:10px;"/>
          <textarea name="storyText" placeholder="Tell the story behind this memory..." rows="4" style="width:auto; min-width:220px; padding:10px; margin-bottom:10px;"></textarea>
          <input name="tagText" placeholder="Tag (optional)" style="width:auto; min-width:220px; padding:10px; margin-bottom:10px;"/>
          <input type="file" name="photo" style="margin-bottom:10px;"/>

<div style="margin-bottom:10px;">
  <label><input type="radio" name="visibility" value="private" checked /> Private</label><br/>
  <label><input type="radio" name="visibility" value="shared" /> Shared</label><br/>
  <label><input type="radio" name="visibility" value="public" /> Public</label>
     </div>
<input type="text" name="password" placeholder="Password (for shared only)" style="width:auto; min-width:220px; padding:10px; margin-bottom:10px;"/>
          <button type="submit" style="width:auto; min-width:220px; padding:10px; background:black; color:white; border:none; border-radius:5px;">
            Add Memory
          </button>
        </form>
        </details>\n` : ""}

      ${view === "search" ? `
        <div style="margin:10px 0 30px 0;">
          <h1 style="font-size:34px; margin-bottom:6px;">Search Memories 🔎</h1>
          <p style="color:gray; margin-top:0;">Search by title, description, story, or tag.</p>

          <form method="GET" action="/" style="margin-top:18px; display:flex; gap:10px;">
            <input type="hidden" name="view" value="search" />
            <input
              type="text"
              name="search"
              value="${search}"
              placeholder="Type a word, name, place, tag..."
              style="flex:1; padding:14px; border-radius:18px; border:1px solid #ddd; font-size:16px;"
            />
            <button type="submit" style="padding:14px 20px; border-radius:18px; border:none; background:black; color:white; cursor:pointer;">
              Search
            </button>
          </form>
        </div>
      ` : ""}

      ${view === "gallery-search" ? `
        <div style="margin:10px 0 30px 0;">
          <h1 style="font-size:34px; margin-bottom:6px;">Gallery Search 🔎</h1>
          <p style="color:gray; margin-top:0;">Search your gallery memories by title, description, story, or tag.</p>

          <form method="GET" action="/" style="margin-top:18px; display:flex; gap:10px;">
            <input type="hidden" name="view" value="gallery-search" />
            <input
              type="text"
              name="search"
              value="${search}"
              placeholder="Search gallery..."
              style="flex:1; padding:14px; border-radius:18px; border:1px solid #ddd; font-size:16px;"
            />
            <button type="submit" style="padding:14px 20px; border-radius:18px; border:none; background:black; color:white; cursor:pointer;">
              Search
            </button>
          </form>
        </div>
      ` : ""}

      ${view === "favorites" ? `
        <div style="margin:10px 0 30px 0;">
          <h1 style="font-size:34px; margin-bottom:6px;">Favorite Memories 💙</h1>
          <p style="color:gray; margin-top:0;">Your saved favorite memories in one place.</p>
        </div>
      ` : ""}

      <div class="nightshots-memory-grid ${view === "gallery" || view === "gallery-search" ? "nightshots-gallery-grid" : ""}" style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:20px;">
      ${visibleHistory.length === 0 ? `
        <div style="background:${cardBg}; color:${cardText}; padding:34px 28px; border-radius:22px; box-shadow:0 8px 20px rgba(0,0,0,0.12); text-align:center; grid-column:1 / -1;">
          ${
            view === "favorites"
              ? `
                <div style="font-size:34px; margin-bottom:10px;">💙</div>
                <h2 style="margin:0 0 10px 0;">No favorites yet</h2>
                <p style="margin:0; opacity:0.78;">Tap the heart beside a memory title to save it here.</p>
              `
              : search && view === "gallery-search"
                ? `
                  <div style="font-size:34px; margin-bottom:10px;">🖼️</div>
                  <h2 style="margin:0 0 10px 0;">No gallery memories found</h2>
                  <p style="margin:0; opacity:0.78;">Try another word, name, place, or tag.</p>
                `
                : search
                  ? `
                    <div style="font-size:34px; margin-bottom:10px;">🔎</div>
                    <h2 style="margin:0 0 10px 0;">No memories found</h2>
                    <p style="margin:0; opacity:0.78;">Try a different word, name, place, or tag.</p>
                  `
                  : `
                    <div style="font-size:38px; margin-bottom:10px;">✨</div>
                    <h2 style="margin:0 0 10px 0;">Your story starts here.</h2>
                    <p style="margin:0; opacity:0.78;">Create your first memory and begin building your personal scrapbook.</p>
                  `
          }
        </div>
      ` : ""}
      ${visibleHistory.map((e) => `
<div class="nightshots-memory-card" style="background:transparent; color:${cardText}; border-radius:22px; margin-bottom:24px; overflow:visible; box-shadow:none; position:relative; transform:rotate(-0.4deg); border:none;">
          ${view !== "gallery" && view !== "gallery-search" ? `

<div style="position:absolute; top:10px; right:10px; display:flex; gap:8px; z-index:10;">

  <a href="/edit/${e.id}" style="background:white; border:1px solid #ddd; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:16px;">
    ✏️
  </a>

  <form method="POST" action="/delete" style="margin:0;">
    <input type="hidden" name="id" value="${e.id}" />
    <button type="submit" style="background:white; border:1px solid #ddd; border-radius:50%; width:32px; height:32px; cursor:pointer;">
      🗑
    </button>
  </form>

</div>

` : ""}
${e.photoPath ? `
  <a class="nightshots-memory-photo-link" href="/view/${e.id}" style="display:block; text-decoration:none; padding:14px 14px 36px 14px; background:white; margin:14px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.18); transform:rotate(0.6deg);">
    <img class="nightshots-memory-photo" src="${e.photoPath}" style="width:auto; min-width:220px; height:300px; object-fit:cover; cursor:pointer; display:block; border-radius:4px;" />
  </a>
` : ''}
          <div class="nightshots-memory-content" style="padding:15px;">
            <div class="nightshots-memory-title-row" style="display:flex; align-items:center; gap:10px; padding-right:45px;">
  <form method="POST" action="/favorite" style="margin:0;">
    <input type="hidden" name="id" value="${e.id}" />
    <button type="submit" style="background:none; border:none; cursor:pointer; font-size:24px; padding:0;">
      ${e.favorite ? '💙' : '🤍'}
    </button>
  </form>

  <strong class="nightshots-memory-title" style="font-size:22px;">${e.cidText}</strong>
</div>

            <p style="margin:10px 0;">${e.metadataText}</p>
${e.storyText ? `
  <p style="margin:5px 0; color:#555;">
    ${e.storyText.substring(0, 100)}...
  </p>

  <details>
    <summary style="
cursor:pointer;
color:#5f6f86;
font-weight:600;
font-size:15px;
margin-top:6px;
display:inline-block;
transition:0.2s;
">Read story</summary>
    <p>${e.storyText}</p>
  </details>
` : ''}
<span style="font-size:12px; color:gray;">
  Tag: ${e.tagText ?? 'none'} | Visibility: ${e.visibility ?? 'private'} | ${new Date(e.timestamp).toLocaleDateString()}
</span>

${e.visibility === 'shared' && e.id ? `
  <div style="margin-top:8px; font-size:12px;">
    Share link:<br/>
    <a href="/view/${e.id}" target="_blank">
      http://localhost:3000/view/${e.id}
    </a>
  </div>
` : ''}
          </div>
        </div>
      `).join('')}
      </div>
    </div>
  </body>
</html>
`;

  res.send(html);
});
app.post('/favorite', (req, res) => {
  const { id } = req.body;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history = history.map(memory => {
    if (memory.id === id) {
      memory.favorite = !memory.favorite;
    }
    return memory;
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/');
});
app.post('/delete', (req, res) => {
  const { id } = req.body;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history = history.map(memory => {
    if (memory.id === id) {
      return {
        ...memory,
        deleted: true,
        deletedAt: new Date().toISOString()
      };
    }

    return memory;
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/');
});
app.get('/theme/:name', (req, res) => {
  const allowedThemes = ['light', 'paper', 'dark', 'sunset', 'ocean'];

  const selectedTheme = req.params.name;

  if (!allowedThemes.includes(selectedTheme)) {
    return res.redirect('/');
  }

  fs.writeFileSync(
    themePath,
    JSON.stringify({ theme: selectedTheme }, null, 2)
  );

  res.redirect('/');
});


app.get('/edit/:id', (req, res) => {
  const { id } = req.params;

  if (!fs.existsSync(historyPath)) {
    return res.send('No data found');
  }

  const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

  const entry = history.find(e => e.id === id);

  if (!entry) {
    return res.send('Memory not found');
  }

  res.send(`
  <html>
    <head>
      <title>Edit Memory</title>
    </head>

    <body style="font-family:Arial; background:#f5f1ea; padding:20px;">

      <div style="max-width:700px; margin:auto;">

        <h1>Edit Memory ✏️</h1>

        <form method="POST" action="/edit/${entry.id}" enctype="multipart/form-data" style="background:white; padding:25px; border-radius:18px; box-shadow:0 3px 10px rgba(0,0,0,0.10);">

          <input
            name="cidText"
            value="${entry.cidText}"
            placeholder="Title"
            style="width:auto; min-width:220px; padding:12px; margin-bottom:12px;"
          />

          <input
            name="metadataText"
            value="${entry.metadataText}"
            placeholder="Description"
            style="width:auto; min-width:220px; padding:12px; margin-bottom:12px;"
          />

          <textarea
            name="storyText"
            rows="6"
            style="width:auto; min-width:220px; padding:12px; margin-bottom:12px;"
          >${entry.storyText || ''}</textarea>

          <input
            name="tagText"
            value="${entry.tagText || ''}"
            placeholder="Tag"
            style="width:auto; min-width:220px; padding:12px; margin-bottom:12px;"
          />

          <div style="margin-bottom:14px;">

            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                ${entry.visibility === 'private' ? 'checked' : ''}
              />
              Private
            </label>

            <br/>

            <label>
              <input
                type="radio"
                name="visibility"
                value="shared"
                ${entry.visibility === 'shared' ? 'checked' : ''}
              />
              Shared
            </label>

            <br/>

            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                ${entry.visibility === 'public' ? 'checked' : ''}
              />
              Public
            </label>

          </div>

          <input
            name="password"
            value="${entry.password || ''}"
            placeholder="Shared password (optional)"
            style="width:auto; min-width:220px; padding:12px; margin-bottom:12px;"
          />
${entry.photoPath ? `
  <div style="margin:18px 0; padding:15px; background:#f7f7f7; border-radius:14px;">
    <div style="font-weight:bold; margin-bottom:8px;">Current Photo</div>
    <img src="${entry.photoPath}" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:12px; background:#111;" />
  </div>
` : `
  <div style="margin:18px 0; padding:15px; background:#f7f7f7; border-radius:14px;">
    <div style="font-weight:bold; margin-bottom:8px;">Current Photo</div>
    <div style="color:#666;">No photo attached yet.</div>
  </div>
`}

<div style="margin:18px 0;">
  <label style="display:block; font-weight:bold; margin-bottom:8px;">
    Replace Photo
  </label>
  <input
    type="file"
    name="photo"
    accept="image/*"
    style="width:auto; min-width:220px; padding:12px; margin-bottom:12px; background:white; border:1px solid #ddd; border-radius:10px;"
  />
  <div style="font-size:13px; color:#666;">
    Leave this blank to keep the current photo.
  </div>
</div>
          <button
            type="submit"
            style="width:auto; min-width:220px; padding:14px; background:black; color:white; border:none; border-radius:12px; cursor:pointer;"
          >
            Save Changes
          </button>

        </form>

      </div>

    </body>
  </html>
  `);
});

app.post('/add', upload.single('photo'), (req, res) => {
  const { cidText, metadataText, storyText, tagText, visibility, password } = req.body;
  const photoPath = req.file ? '/uploads/' + req.file.filename : null;
  const originalPhotoName = req.file ? req.file.originalname : null;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  if (originalPhotoName) {
    const duplicate = history.find(memory =>
      memory.originalPhotoName &&
      memory.originalPhotoName.toLowerCase() === originalPhotoName.toLowerCase()
    );

    if (duplicate) {
      return res.send(`
        <html>
          <body style="font-family:Arial; background:#f5f1ea; padding:20px;">
            <div style="max-width:650px; margin:auto; background:white; padding:25px; border-radius:18px;">
              <h1>Possible Duplicate Photo</h1>
              <p>You already uploaded a photo named:</p>
              <strong>${originalPhotoName}</strong>
              <p>This may be a duplicate memory.</p>

              <a href="/" style="display:inline-block; margin-top:15px; padding:10px 14px; background:black; color:white; text-decoration:none; border-radius:10px;">
                Go Back
              </a>
            </div>
          </body>
        </html>
      `);
    }
  }

history.push({
  id: generateId(),
  cidText,
  metadataText,
  storyText: storyText || '',
tagText: tagText || 'none',
  visibility: visibility || 'private',
  password: password || null,
  photoPath,
  originalPhotoName,
  timestamp: new Date().toISOString()
});
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/');
});


app.post('/edit/:id', upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const { cidText, metadataText, storyText, tagText, visibility, password } = req.body;

  if (!fs.existsSync(historyPath)) {
    return res.send('No data found');
  }

  let history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

 history = history.map(memory => {
  if (memory.id === id) {
    const replacementPhotoPath = req.file ? '/uploads/' + req.file.filename : memory.photoPath;

    return {
      ...memory,
      cidText,
      metadataText,
      storyText: storyText || '',
      tagText: tagText || 'none',
      visibility: visibility || 'private',
      password: password || null,
      photoPath: replacementPhotoPath,
      updatedAt: new Date().toISOString()
    };
  }

  return memory;
});

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/');
});


app.get('/view/:id', (req, res) => {
  const { id } = req.params;
  const enteredPassword = req.query.password;

  if (!fs.existsSync(historyPath)) {
    return res.send('No data found');
  }

  const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  const entry = history.find(e => e.id === id);

  if (!entry) {
    return res.send('Entry not found');
  }

  // 🔒 Password protection check
  if (entry.visibility === 'shared' && entry.password) {
    if (enteredPassword !== entry.password) {
      return res.send(`
        <html>
          <body style="font-family: Arial; padding:20px;">
            <h2>Enter Password</h2>
            <form method="GET">
              <input type="password" name="password" placeholder="Password" />
              <button type="submit">Unlock</button>
            </form>
          </body>
        </html>
      `);
    }
  }

  let savedTheme = 'light';

  if (fs.existsSync(themePath)) {
    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    savedTheme = themeData.theme || 'light';
  }

  let bg = '#f5f5f5';
  let text = '#111';
  let cardBg = '#ffffff';
  let cardText = '#111';

  if (savedTheme === 'paper') {
    bg = '#f4eadb';
  }

  if (savedTheme === 'dark') {
    bg = '#1a1a1a';
    text = '#ffffff';
    cardBg = '#2a2a2a';
    cardText = '#ffffff';
  }

  if (savedTheme === 'sunset') {
    bg = '#f6d2c2';
  }

  if (savedTheme === 'ocean') {
    bg = '#d9eef7';
  }

  const html = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${entry.cidText}</title>
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
        }

        .memory-viewer-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 34px;
        }

        .memory-viewer-card {
          width: min(1100px, 100%);
          background: ${cardBg};
          color: ${cardText};
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 22px 70px rgba(0,0,0,0.35);
        }

        .memory-viewer-photo-wrap {
          padding: 22px 22px 8px 22px;
        }

        .memory-viewer-photo-frame {
          display: block;
          background: #ffffff;
          padding: 14px 14px 34px 14px;
          border-radius: 12px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.18);
          transform: rotate(-0.25deg);
        }

        .memory-viewer-photo {
          width: 100%;
          max-height: 64vh;
          object-fit: contain;
          display: block;
          border-radius: 6px;
          background: #111;
        }

        .memory-viewer-content {
          padding: 30px;
        }

        .memory-viewer-kicker {
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.68;
          margin-bottom: 10px;
        }

        .memory-viewer-title {
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1.08;
          margin: 0 0 12px 0;
          overflow-wrap: anywhere;
        }

        .memory-viewer-description {
          font-size: clamp(18px, 2.2vw, 22px);
          line-height: 1.55;
          margin: 0;
          opacity: 0.92;
        }

        .memory-viewer-story {
          margin-top: 24px;
          padding: 24px;
          border-radius: 20px;
          background: rgba(0,0,0,0.08);
          border: 1px dashed rgba(0,0,0,0.18);
        }

        .memory-viewer-story h2 {
          margin: 0 0 12px 0;
          font-size: 22px;
        }

        .memory-viewer-story p {
          margin: 0;
          white-space: pre-wrap;
          font-size: 18px;
          line-height: 1.72;
        }

        .memory-viewer-meta {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.12);
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.72;
        }

        .memory-viewer-back {
          position: fixed;
          top: 22px;
          left: 22px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          color: #111;
          text-decoration: none;
          font-size: 30px;
          font-weight: bold;
          box-shadow: 0 6px 18px rgba(0,0,0,0.22);
          z-index: 999;
        }

        .memory-viewer-back:hover {
          transform: translateX(-2px);
        }

        @media (max-width: 620px) {
          .memory-viewer-page {
            align-items: flex-start;
            padding: 76px 14px 18px 14px;
          }

          .memory-viewer-card {
            border-radius: 20px;
          }

          .memory-viewer-photo-wrap {
            padding: 14px 14px 2px 14px;
          }

          .memory-viewer-photo-frame {
            padding: 10px 10px 24px 10px;
          }

          .memory-viewer-photo {
            max-height: 48vh;
          }

          .memory-viewer-content {
            padding: 22px 18px;
          }

          .memory-viewer-story {
            padding: 18px;
          }

          .memory-viewer-story p {
            font-size: 16px;
          }

          .memory-viewer-back {
            top: 14px;
            left: 14px;
            width: 44px;
            height: 44px;
            font-size: 27px;
          }
        }
      </style>
    </head>

    <body style="margin:0; background:${bg}; color:${text};">
      <a class="memory-viewer-back" href="/" aria-label="Back to memories">←</a>

      <main class="memory-viewer-page">
        <article class="memory-viewer-card">

          ${entry.photoPath ? `
            <div class="memory-viewer-photo-wrap">
              <div class="memory-viewer-photo-frame">
                <img class="memory-viewer-photo" src="${entry.photoPath}" alt="${entry.cidText}" />
              </div>
            </div>
          ` : ''}

          <div class="memory-viewer-content">
            <div class="memory-viewer-kicker">Night Shots Memory</div>

            <h1 class="memory-viewer-title">${entry.cidText}</h1>

            <p class="memory-viewer-description">
              ${entry.metadataText}
            </p>

            ${entry.storyText ? `
              <section class="memory-viewer-story">
                <h2>The Story</h2>
                <p>${entry.storyText}</p>
              </section>
            ` : ''}

            <div class="memory-viewer-meta">
              Tag: ${entry.tagText || 'none'} ·
              Visibility: ${entry.visibility || 'private'} ·
              ${new Date(entry.timestamp).toLocaleString()}
            </div>
          </div>

        </article>
      </main>
    </body>
  </html>
  `;

  res.send(html);
});

app.get('/feedback', (req, res) => {
  const feedbackPath = path.join(__dirname, 'feedback.json');

  let feedback = [];

  if (fs.existsSync(feedbackPath)) {
    feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
  }

  res.send(`
  <html>
    <head>
      <title>Beta Feedback</title>
    </head>
    <body style="font-family: Arial; background:#f5f1ea; margin:0; padding:20px;">
      <div style="max-width:760px; margin:auto;">
        <h1 style="text-align:center; font-size:42px; margin-bottom:5px;">Beta Feedback</h1>
        <p style="text-align:center; color:#666; margin-top:0; margin-bottom:25px;">
          Save bugs, polish notes, tester comments, and feature ideas.
        </p>

        <div style="background:white; padding:18px; border-radius:16px; box-shadow:0 3px 10px rgba(0,0,0,0.10); margin-bottom:25px;">
          <form method="POST" action="/feedback">
            <textarea name="feedbackText" placeholder="Example: Gallery looks good, but the story preview is too short..." rows="8" required style="width:auto; min-width:220px; padding:12px; border:1px solid #ddd; border-radius:10px; box-sizing:border-box; font-size:16px;"></textarea>
            <button type="submit" style="margin-top:12px; padding:12px; width:auto; min-width:220px; background:black; color:white; border:none; border-radius:10px; font-size:16px; cursor:pointer;">Save Feedback</button>
          </form>
        </div>

        <h2>Saved Feedback</h2>

        ${[...feedback].reverse().map((f) => `
          <div style="background:white; padding:20px; border-radius:16px; margin-bottom:18px; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
            <p style="white-space:pre-wrap;">${f.text}</p>
            <small>${new Date(f.timestamp).toLocaleString()}</small>
          </div>
        `).join('')}

        <br/>
        <a href="/" style="
            position:fixed;
            top:24px;
            left:24px;
            color:#111;
            text-decoration:none;
            font-size:72px;
            font-weight:900;
            line-height:1;
            z-index:999;
            text-shadow:
              0 0 6px rgba(255,255,255,0.85),
              0 0 18px rgba(255,255,255,0.45);
            -webkit-text-stroke:1px rgba(255,255,255,0.18);
            font-family:Arial Black, Arial, sans-serif;
          ">⮜</a>
      </div>
    </body>
  </html>
  `);
});

app.post('/feedback', (req, res) => {
  const feedbackText = req.body.feedbackText;
  const feedbackPath = path.join(__dirname, 'feedback.json');

  let feedback = [];

  if (fs.existsSync(feedbackPath)) {
    feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
  }

  feedback.push({
    text: feedbackText,
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(feedbackPath, JSON.stringify(feedback, null, 2));

  res.redirect('/feedback');
});






app.get('/nft-creator', (req, res) => {
  res.send(`
  <html>
    <head>
      <title>Rare Ink Studios NFT Creator</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    </head>

    <body style="font-family:Arial; background:#111827; color:white; margin:0; padding:40px;">

      <div style="max-width:1000px; margin:auto;">

        <h1 style="font-size:48px; margin-bottom:10px;">Rare Ink Studios NFT Creator</h1>

        <p style="font-size:20px; color:#d1d5db; margin-bottom:40px;">
          Simple NFT collection generation for creators.
        </p>

        <div style="background:#1f2937; padding:35px; border-radius:22px;">

          <h2>Choose Creator Mode</h2>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:18px; margin-top:20px; margin-bottom:35px;">

            <button id="simpleBtn" onclick="selectMode('simple')" style="background:#2563eb; color:white; border:none; padding:22px; border-radius:16px; font-size:18px; cursor:pointer;">
              Simple Edition<br>
              <span style="font-size:13px; color:#dbeafe;">1 image copied into many NFTs</span>
            </button>

            <button type="button" id="multiBtn" onclick="selectMode('multi')" style="background:#374151; color:white; border:none; padding:22px; border-radius:16px; font-size:18px; cursor:pointer;">
              Multi-Image Collection<br>
              <span style="font-size:13px; color:#d1d5db;">Many finished images with metadata</span>
            </button>

            <button type="button" id="advancedBtn" onclick="selectMode('advanced')" style="background:#374151; color:white; border:none; padding:22px; border-radius:16px; font-size:18px; cursor:pointer;">
              Advanced Randomizer<br>
              <span style="font-size:13px; color:#d1d5db;">Layers, traits, rarity, randomized NFTs</span>
            </button>

          </div>

          <div id="selectedMode" style="background:#111827; padding:18px; border-radius:14px; margin-bottom:30px; color:#d1d5db;">
            Selected Mode: Simple Edition
          </div>

          <h2>Create Collection</h2>

          <input id="collectionName" placeholder="Collection Name" style="width:auto; min-width:220px; padding:16px; margin-top:15px; border-radius:12px; border:none; font-size:18px;" />

          <input id="nftBaseName" placeholder="NFT Base Name" style="width:auto; min-width:220px; padding:16px; margin-top:15px; border-radius:12px; border:none; font-size:18px;" />

          <input id="supplyAmount" placeholder="Supply Amount" max="10000" style="width:auto; min-width:220px; padding:16px; margin-top:15px; border-radius:12px; border:none; font-size:18px;" />
          <div id="nightShotsProjectControls" style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">

            <button type="button" onclick="saveNightShotsProject()" style="background:#2563eb; color:white; border:none; padding:12px 18px; border-radius:12px; font-size:16px; cursor:pointer;">
              Save Project JSON
            </button>

            <button type="button" onclick="document.getElementById('loadProjectInput').click()" style="background:#16a34a; color:white; border:none; padding:12px 18px; border-radius:12px; font-size:16px; cursor:pointer;">
              Load Project JSON
            </button>

            <button type="button" onclick="restoreNightShotsAutosave()" style="background:#f59e0b; color:#111827; border:none; padding:12px 18px; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer;">
              Restore Auto Save
            </button>

          </div>

          <input id="loadProjectInput" type="file" accept=".json" style="display:none;" onchange="loadNightShotsProject(event)" />



          <div id="simpleSection">
            <h2 style="margin-top:35px; font-size:34px;">Upload Single Artwork</h2>

            <div style="margin-top:20px; background:#111827; border:2px dashed #374151; border-radius:18px; padding:40px; text-align:center;">
              <div style="font-size:22px; margin-bottom:15px;">Upload 1 image to duplicate into many NFTs</div>
              <div style="color:#9ca3af; margin-bottom:25px;">Best for edition collections</div>

              <input id="simpleArtworkInput" name="simpleArtwork" type="file" accept="image/*" style="display:none;" onchange="showSimpleArtworkName()" />

              <button onclick="document.getElementById('simpleArtworkInput').click()" style="background:#2563eb; color:white; border:none; padding:14px 28px; border-radius:12px; font-size:18px; cursor:pointer;">
                Select Artwork
              </button>

              <div id="simpleArtworkName" style="margin-top:20px; color:#d1d5db;"></div>
            </div>
          </div>

          <div id="multiSection" style="display:none;">
            <h2 style="margin-top:35px; font-size:34px;">Upload Multiple Finished Images</h2>

            <div style="margin-top:20px; background:#111827; border:2px dashed #374151; border-radius:18px; padding:40px; text-align:center;">
              <div style="font-size:22px; margin-bottom:15px;">Upload multiple completed NFT images</div>
              <div style="color:#9ca3af; margin-bottom:25px;">Each image can have its own metadata and traits</div>

              <input id="multiArtworkInput" name="multiArtwork" type="file" accept="image/*" multiple style="display:none;" onchange="showMultiArtworkName()" />

              <button onclick="document.getElementById('multiArtworkInput').click()" style="background:#2563eb; color:white; border:none; padding:14px 28px; border-radius:12px; font-size:18px; cursor:pointer;">
                Select Multiple Images
              </button>

              <div id="multiArtworkName" style="margin-top:20px; color:#d1d5db;"></div>
            </div>

            <div id="multiImageManager" style="display:none; margin-top:30px; background:#111827; padding:25px; border-radius:18px;">
              <h2 style="margin-top:0;">Multi-Image Metadata Manager</h2>
              <p style="color:#9ca3af;">
                Each uploaded image becomes one NFT. Add a name, description, and separate traits for each image.
              </p>

              <div id="multiImageList"></div>
            </div>
          </div>

          <div id="advancedSection" style="display:none;">
            <h2 style="margin-top:35px; font-size:34px;">Advanced Randomized Collection</h2>

            <div style="margin-top:20px; background:#111827; border:2px dashed #374151; border-radius:18px; padding:40px;">
              <div style="font-size:22px; margin-bottom:15px;">Layer + trait generator</div>
              <div style="color:#9ca3af; margin-bottom:25px;">
                Future support: Backgrounds, bodies, eyes, clothing, accessories, rarity percentages, and random generation.
              </div>

              <div style="background:#1f2937; padding:18px; border-radius:14px; color:#d1d5db;">
                Build randomized NFT collections by adding layers, traits, and rarity percentages.
              </div>

              <div style="margin-top:25px; background:#1f2937; padding:22px; border-radius:16px;">

                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                  <h3 style="margin-top:0;">Add Randomizer Trait</h3>

                  <button type="button" onclick="toggleTraitBuilderVisibility()" id="toggleTraitBuilderButton" style="background:#374151; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                    Hide Traits
                  </button>
                </div>

                <div id="traitBuilderContent">

                <div style="display:grid; grid-template-columns:1fr 1fr 120px auto; gap:10px;">

                  <input id="randomLayerName" placeholder="Layer Name, example: Background" style="padding:12px; border-radius:10px; border:none; font-size:16px;" />

                  <input id="randomTraitName" placeholder="Trait Name, example: Gold" style="padding:12px; border-radius:10px; border:none; font-size:16px;" />

                  <input id="randomTraitRarity" placeholder="Rarity %" style="padding:12px; border-radius:10px; border:none; font-size:16px;" />

                  <button onclick="document.getElementById('randomTraitImage').click()" style="background:#374151; color:white; border:none; padding:12px 18px; border-radius:10px; cursor:pointer;">
                    Choose Image
                  </button>

                </div>

                <input id="randomTraitImage" type="file" accept="image/*" style="display:none;" onchange="showRandomTraitImageName()" />

                <div id="randomTraitImageName" style="margin-top:12px; color:#9ca3af;">
                  No trait image selected.
                </div>

                <button onclick="addRandomTrait()" style="margin-top:15px; background:#2563eb; color:white; border:none; padding:12px 22px; border-radius:10px; cursor:pointer;">
                  Add Trait With Image
                </button>

                <div id="randomTraitList" style="margin-top:20px;"></div>

                </div>

                <div id="savedTraitSetManager" style="margin-top:25px; background:#0f172a; border:2px solid #374151; border-radius:16px; padding:18px;">
                  <h3 style="margin-top:0; color:white;">Saved Trait Sets</h3>

                  <div style="color:#9ca3af; margin-bottom:12px;">
                    Save many trait sets, then add or replace traits from checked items.
                  </div>

                  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                    <button type="button" onclick="saveCurrentTraitSetClean()" style="background:#2563eb; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Save Current Traits
                    </button>

                    <select id="savedTraitSetSelect" onchange="drawSavedTraitPickerFinal()" style="padding:10px; border-radius:10px; border:none; min-width:240px;">
                      <option value="">No saved trait sets</option>
                    </select>

                    <button type="button" onclick="deleteSavedTraitSetClean()" style="background:#dc2626; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Delete Saved Set
                    </button>
                  </div>

                  <button type="button" onclick="toggleSavedTraitPickerBox()" style="background:#374151; color:white; border:none; padding:9px 12px; border-radius:10px; cursor:pointer; margin-bottom:10px;">
                    Show / Hide Trait Picker
                  </button>

                  <div id="savedTraitPickerBox" style="background:#111827; border-radius:12px; padding:14px; min-height:50px; max-height:260px; overflow-y:auto; color:#d1d5db;">
                    Choose a saved trait set.
                  </div>

                  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
                    <button type="button" onclick="addCheckedTraitsOnly()" style="background:#16a34a; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Add Checked Traits
                    </button>

                    <button type="button" onclick="replaceWithCheckedTraitsOnly()" style="background:#f59e0b; color:#111827; border:none; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:bold;">
                      Replace With Checked Traits
                    </button>
                  </div>
                </div>

                <div id="traitRuleEngineBox" style="margin-top:25px; background:#0f172a; border:2px solid #7c3aed; border-radius:16px; padding:18px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <h3 style="margin-top:0; color:white;">Trait Rule Engine</h3>

                    <button type="button" onclick="toggleTraitRulesVisibility()" id="toggleTraitRulesButton" style="background:#374151; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Hide Rules
                    </button>
                  </div>

                  <div id="traitRulesContent">

                  <div style="color:#c4b5fd; margin-bottom:12px;">
                    Add rules to prevent bad combinations before NFTs are generated.
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 170px 1fr auto; gap:10px; align-items:center;">
                    <select id="ruleTraitA" style="padding:10px; border-radius:10px; border:none;">
                      <option value="">Choose first trait</option>
                    </select>

                    <select id="ruleType" style="padding:10px; border-radius:10px; border:none;">
                      <option value="cannot_pair">Cannot pair with</option>
                      <option value="requires">Requires</option>
                    </select>

                    <select id="ruleTraitB" style="padding:10px; border-radius:10px; border:none;">
                      <option value="">Choose second trait</option>
                    </select>

                    <button type="button" onclick="addTraitRule()" style="background:#7c3aed; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Add Rule
                    </button>

                    <button type="button" onclick="removeAllTraitRules()" style="background:#dc2626; color:white; border:none; padding:10px 14px; border-radius:10px; cursor:pointer;">
                      Remove All Rules
                    </button>
                  </div>

                  <div id="traitRuleList" style="margin-top:14px; color:#d1d5db;">
                    No rules added yet.
                  </div>

                  </div>
                </div>

                <div id="advancedOneOfOneBox" style="margin-top:22px; background:#7c2d12; border:3px solid #f59e0b; border-radius:14px; padding:16px;">
                  <label style="display:block; color:white; font-weight:bold; margin-bottom:8px; font-size:18px;">
                    TRUE 1/1 COUNT FOR THIS GENERATION
                  </label>
                  <input id="advancedOneOfOneCount" type="number" min="0" max="589" value="0" placeholder="Example: 8" style="width:auto; min-width:260px; padding:14px; border-radius:10px; border:none; font-size:18px; font-weight:bold;" />
                  <div style="color:#fde68a; margin-top:8px;">
                    Maximum is 589 true 1/1s. Enter up to 589 to create gold TRUE 1/1 cards.
                  </div>
                </div>

                <button onclick="startRandomNFTGeneration(this)" style="
                  margin-top:25px;
                  background:#16a34a;
                  color:white;
                  border:none;
                  padding:14px 24px;
                  border-radius:12px;
                  font-size:18px;
                  cursor:pointer;
                ">
                  Generate NFTs
                </button>

                <button type="button" onclick="removeGeneratedNFTs()" style="
                  margin-top:25px;
                  margin-left:10px;
                  background:#dc2626;
                  color:white;
                  border:none;
                  padding:14px 24px;
                  border-radius:12px;
                  font-size:18px;
                  cursor:pointer;
                ">
                  Clear Results
                </button>


                <div id="generationStatus" style="display:none; margin-top:22px; background:#0f172a; border:2px solid #2563eb; border-radius:14px; padding:16px; color:#dbeafe; font-weight:bold;">
                  Ready to generate.
                </div>

                <div id="generatedRandomNFTs" style="margin-top:30px;"></div>


              </div>
            </div>
          </div>

          <div style="margin-top:35px; background:#2563eb; padding:30px; border-radius:18px;">

            <h2 style="text-align:center; font-size:32px;">Shared Collection Traits</h2>

            <div style="display:flex; gap:12px; margin-top:20px;">

              <input id="traitType" placeholder="Shared Trait Type" style="flex:1; padding:14px; border-radius:10px; border:none; font-size:18px;" />

              <input id="traitValue" placeholder="Shared Trait Value" style="flex:1; padding:14px; border-radius:10px; border:none; font-size:18px;" />

              <button onclick="addTrait()" style="background:#374151; color:white; border:none; padding:14px 24px; border-radius:10px; font-size:16px; cursor:pointer;">
                Add Shared Trait
              </button>

            </div>

          </div>

          <div style="margin-top:30px; background:#111827; padding:25px; border-radius:18px;">

            <h3 style="margin-top:0; color:#9ca3af; font-size:24px;">Current Shared Traits</h3>

            <div id="traitList"></div>

          </div>

          <button id="mainGenerateZipButton" onclick="generateCollection()" style="margin-top:30px; background:#2563eb; color:white; border:none; padding:16px 30px; border-radius:12px; font-size:18px; cursor:pointer;">
            Generate NFT Collection ZIP
          </button>

        </div>

      </div>

      <script>
        let currentMode = 'simple'
        let sharedTraits = []
        let perImageTraits = {}

        function selectMode(mode) {
          currentMode = mode

          document.getElementById('simpleSection').style.display = 'none'
          document.getElementById('multiSection').style.display = 'none'
          document.getElementById('advancedSection').style.display = 'none'

          document.getElementById('simpleBtn').style.background = '#374151'
          document.getElementById('multiBtn').style.background = '#374151'
          document.getElementById('advancedBtn').style.background = '#374151'

          let label = 'Simple Edition'

          if (mode === 'simple') {
            document.getElementById('simpleSection').style.display = 'block'
            document.getElementById('simpleBtn').style.background = '#2563eb'
            label = 'Simple Edition'
          }

          if (mode === 'multi') {
            document.getElementById('multiSection').style.display = 'block'
            document.getElementById('multiBtn').style.background = '#2563eb'
            label = 'Multi-Image Collection'
          }

          if (mode === 'advanced') {
            document.getElementById('advancedSection').style.display = 'block'
            document.getElementById('advancedBtn').style.background = '#2563eb'
            label = 'Advanced Randomized Collection'
          }

          document.getElementById('selectedMode').innerHTML = 'Selected Mode: ' + label

          const mainZipButton = document.getElementById('mainGenerateZipButton')

          if (mainZipButton) {
            if (mode === 'advanced') {
              mainZipButton.style.display = 'none'
            } else {
              mainZipButton.style.display = 'inline-block'
            }
          }
        }

        function showSimpleArtworkName() {
          const fileInput = document.getElementById('simpleArtworkInput')
          const artworkName = document.getElementById('simpleArtworkName')

          if (fileInput.files.length > 0) {
            artworkName.innerHTML = 'Selected artwork: ' + fileInput.files[0].name
          }
        }

        function showMultiArtworkName() {
          const fileInput = document.getElementById('multiArtworkInput')
          const artworkName = document.getElementById('multiArtworkName')
          const manager = document.getElementById('multiImageManager')
          const list = document.getElementById('multiImageList')

          list.innerHTML = ''
          perImageTraits = {}

          if (fileInput.files.length > 0) {
            artworkName.innerHTML = 'Selected images: ' + fileInput.files.length
            manager.style.display = 'block'

            Array.from(fileInput.files).forEach((file, index) => {
              const number = index + 1
              perImageTraits[number] = []

              const imageURL = URL.createObjectURL(file)

              const item = document.createElement('div')

              item.style.display = 'grid'
              item.style.gridTemplateColumns = '160px 1fr'
              item.style.gap = '20px'
              item.style.alignItems = 'start'
              item.style.background = '#1f2937'
              item.style.padding = '20px'
              item.style.borderRadius = '18px'
              item.style.marginTop = '20px'

              item.innerHTML = \`
                <img src="\${imageURL}" style="width:160px; height:160px; object-fit:cover; border-radius:14px;" />

                <div>
                  <div style="font-size:24px; margin-bottom:12px;">NFT #\${number}</div>

                  <input id="multiName\${number}" placeholder="NFT Name" value="\${document.getElementById('nftBaseName').value || 'NFT'} #\${number}" style="width:auto; min-width:220px; padding:12px; border-radius:10px; border:none; font-size:16px; margin-bottom:10px;" />

                  <textarea id="multiDescription\${number}" placeholder="NFT Description" style="width:auto; min-width:220px; padding:12px; border-radius:10px; border:none; font-size:16px; min-height:70px; margin-bottom:12px;">Generated with Rare Ink Studios NFT Creator</textarea>

                  <div style="font-size:18px; margin-top:12px; margin-bottom:10px;">Traits for NFT #\${number}</div>

                  <div style="display:flex; gap:10px;">
                    <input id="imageTraitType\${number}" placeholder="Trait Type" style="flex:1; padding:10px; border-radius:8px; border:none; font-size:15px;" />

                    <input id="imageTraitValue\${number}" placeholder="Trait Value" style="flex:1; padding:10px; border-radius:8px; border:none; font-size:15px;" />

                    <button onclick="addImageTrait(\${number})" style="background:#2563eb; color:white; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">
                      Add
                    </button>
                  </div>

                  <div id="imageTraitList\${number}" style="margin-top:12px;"></div>

                  <div style="margin-top:12px; color:#9ca3af; font-size:14px;">Source file: \${file.name}</div>

                  <div style="font-size:18px; margin-top:18px; margin-bottom:8px;">Live Metadata JSON</div>

                  <pre id="multiPreview\${number}" style="background:#0f172a; padding:14px; border-radius:10px; overflow:auto; font-size:12px; color:#93c5fd; white-space:pre-wrap;">Loading metadata...</pre>
                </div>
              \`

              list.appendChild(item)
              updateMultiPreview(number)
            })
          }
        }

        function addImageTrait(number) {
          const traitType = document.getElementById('imageTraitType' + number).value
          const traitValue = document.getElementById('imageTraitValue' + number).value

          if (!traitType || !traitValue) {
            alert('Please enter both a Trait Type and Trait Value for this NFT.')
            return
          }

          if (!perImageTraits[number]) {
            perImageTraits[number] = []
          }

          perImageTraits[number].push({
            trait_type: traitType,
            value: traitValue
          })

          document.getElementById('imageTraitType' + number).value = ''
          document.getElementById('imageTraitValue' + number).value = ''

          renderImageTraits(number)
          updateMultiPreview(number)
        }

        function renderImageTraits(number) {
          const list = document.getElementById('imageTraitList' + number)

          if (!list) {
            return
          }

          list.innerHTML = ''

          if (!perImageTraits[number]) {
            perImageTraits[number] = []
          }

          perImageTraits[number].forEach(function(trait, index) {
            const box = document.createElement('div')
            box.style.background = '#111827'
            box.style.padding = '10px'
            box.style.borderRadius = '10px'
            box.style.marginTop = '8px'
            box.style.fontSize = '15px'
            box.style.display = 'flex'
            box.style.justifyContent = 'space-between'
            box.style.alignItems = 'center'
            box.style.gap = '8px'

            const text = document.createElement('div')
            text.innerHTML = trait.trait_type + ' → ' + trait.value

            const buttons = document.createElement('div')
            buttons.style.display = 'flex'
            buttons.style.gap = '6px'

            const editButton = document.createElement('button')
            editButton.innerHTML = 'Edit'
            editButton.style.background = '#2563eb'
            editButton.style.color = 'white'
            editButton.style.border = 'none'
            editButton.style.borderRadius = '8px'
            editButton.style.padding = '5px 9px'
            editButton.style.cursor = 'pointer'

            editButton.onclick = function() {
              document.getElementById('imageTraitType' + number).value = trait.trait_type
              document.getElementById('imageTraitValue' + number).value = trait.value

              perImageTraits[number].splice(index, 1)

              renderImageTraits(number)
            }

            const removeButton = document.createElement('button')
            removeButton.innerHTML = 'Remove'
            removeButton.style.background = '#dc2626'
            removeButton.style.color = 'white'
            removeButton.style.border = 'none'
            removeButton.style.borderRadius = '8px'
            removeButton.style.padding = '5px 9px'
            removeButton.style.cursor = 'pointer'

            removeButton.onclick = function() {
              perImageTraits[number].splice(index, 1)

              renderImageTraits(number)
            }

            buttons.appendChild(editButton)
            buttons.appendChild(removeButton)

            box.appendChild(text)
            box.appendChild(buttons)

            list.appendChild(box)
          })
        }

        function updateMultiPreview(number) {
          const previewBox = document.getElementById('multiPreview' + number)

          if (!previewBox) {
            return
          }

          const nameInput = document.getElementById('multiName' + number)
          const descriptionInput = document.getElementById('multiDescription' + number)

          const metadata = {
            name: nameInput ? nameInput.value : 'NFT #' + number,
            description: descriptionInput ? descriptionInput.value : '',
            image: number + '.jpg',
            attributes: [
              ...sharedTraits,
              ...(perImageTraits[number] || [])
            ]
          }

          previewBox.textContent = JSON.stringify(metadata, null, 2)
        }

        function updateAllMultiPreviews() {
          Object.keys(perImageTraits).forEach(function(number) {
            updateMultiPreview(number)
          })
        }

        function addTrait() {
          const traitType = document.getElementById('traitType').value
          const traitValue = document.getElementById('traitValue').value

          if (!traitType || !traitValue) {
            alert('Please enter both a Shared Trait Type and Shared Trait Value.')
            return
          }

          sharedTraits.push({
            trait_type: traitType,
            value: traitValue
          })

          renderSharedTraits()
          updateAllMultiPreviews()

          document.getElementById('traitType').value = ''
          document.getElementById('traitValue').value = ''

          if (typeof updateMetadataPreview === 'function') {
            updateMetadataPreview()
          }
        }

        function renderSharedTraits() {
          const traitList = document.getElementById('traitList')
          traitList.innerHTML = ''

          sharedTraits.forEach(function(trait, index) {
            const traitBox = document.createElement('div')
            traitBox.style.background = '#1f2937'
            traitBox.style.padding = '14px'
            traitBox.style.borderRadius = '12px'
            traitBox.style.marginTop = '12px'
            traitBox.style.fontSize = '18px'
            traitBox.style.display = 'flex'
            traitBox.style.justifyContent = 'space-between'
            traitBox.style.alignItems = 'center'
            traitBox.style.gap = '10px'

            const traitText = document.createElement('div')
            traitText.innerHTML = trait.trait_type + ' → ' + trait.value

            const buttons = document.createElement('div')
            buttons.style.display = 'flex'
            buttons.style.gap = '8px'

            const editButton = document.createElement('button')
            editButton.innerHTML = 'Edit'
            editButton.style.background = '#2563eb'
            editButton.style.color = 'white'
            editButton.style.border = 'none'
            editButton.style.borderRadius = '8px'
            editButton.style.padding = '6px 10px'
            editButton.style.cursor = 'pointer'

            editButton.onclick = function() {
              document.getElementById('traitType').value = trait.trait_type
              document.getElementById('traitValue').value = trait.value

              sharedTraits.splice(index, 1)

              renderSharedTraits()

              if (typeof updateMetadataPreview === 'function') {
                updateMetadataPreview()
              }
            }

            const removeButton = document.createElement('button')
            removeButton.innerHTML = 'Remove'
            removeButton.style.background = '#dc2626'
            removeButton.style.color = 'white'
            removeButton.style.border = 'none'
            removeButton.style.borderRadius = '8px'
            removeButton.style.padding = '6px 10px'
            removeButton.style.cursor = 'pointer'

            removeButton.onclick = function() {
              sharedTraits.splice(index, 1)

              renderSharedTraits()

              if (typeof updateMetadataPreview === 'function') {
                updateMetadataPreview()
              }
            }

            buttons.appendChild(editButton)
            buttons.appendChild(removeButton)

            traitBox.appendChild(traitText)
            traitBox.appendChild(buttons)

            traitList.appendChild(traitBox)
          })
        }

        let randomizerTraits = []
        let randomizerTraitRules = []
        let randomizerLayerChances = {}
        let randomizerLayerOrder = []
        let selectedRandomTraitImage = null

        function showRandomTraitImageName() {
          const fileInput = document.getElementById('randomTraitImage')
          const label = document.getElementById('randomTraitImageName')

          if (fileInput.files.length > 0) {
            selectedRandomTraitImage = fileInput.files[0]
            label.innerHTML = 'Selected trait image: ' + selectedRandomTraitImage.name
          } else {
            selectedRandomTraitImage = null
            label.innerHTML = 'No trait image selected.'
          }
        }

        function addRandomTrait() {
          const rawLayerName = document.getElementById('randomLayerName').value
          const traitName = document.getElementById('randomTraitName').value.trim()
          const rarity = document.getElementById('randomTraitRarity').value.trim()

          const layerName = displayLayerName(rawLayerName)

          if (!layerName || !traitName || !rarity) {
            alert('Please enter Layer Name, Trait Name, and Rarity %.')
            return
          }

          if (!selectedRandomTraitImage) {
            alert('Please choose an image for this trait.')
            return
          }

          randomizerTraits.push({
            layer: layerName,
            trait: traitName,
            rarity: rarity,
            imageName: selectedRandomTraitImage.name,
            imageURL: URL.createObjectURL(selectedRandomTraitImage)
          })

          document.getElementById('randomLayerName').value = ''
          document.getElementById('randomTraitName').value = ''
          document.getElementById('randomTraitRarity').value = ''
          document.getElementById('randomTraitImage').value = ''

          selectedRandomTraitImage = null
          document.getElementById('randomTraitImageName').innerHTML = 'No trait image selected.'

          renderRandomTraits()
        }

        function renderRandomTraits() {
            const list = document.getElementById('randomTraitList')

            if (!list) {
              return
            }

            list.innerHTML = ''

            const groupedLayers = {}

            randomizerTraits.forEach(function(item, index) {
              item.layer = displayLayerName(item.layer)

              if (!groupedLayers[item.layer]) {
                groupedLayers[item.layer] = []
              }

              groupedLayers[item.layer].push({
                item: item,
                index: index
              })
            })

            orderedLayerNames(groupedLayers).forEach(function(layerName) {
              const layerBox = document.createElement('div')
              layerBox.style.background = '#111827'
              layerBox.style.padding = '18px'
              layerBox.style.borderRadius = '14px'
              layerBox.style.marginTop = '18px'

              const layerHeader = document.createElement('div')
              layerHeader.style.display = 'flex'
              layerHeader.style.justifyContent = 'space-between'
              layerHeader.style.alignItems = 'center'
              layerHeader.style.gap = '12px'
              layerHeader.style.marginBottom = '15px'

              const layerTitle = document.createElement('h3')
              layerTitle.textContent = layerName
              layerTitle.style.margin = '0'

              const chanceWrap = document.createElement('div')
              chanceWrap.style.display = 'flex'
              chanceWrap.style.alignItems = 'center'
              chanceWrap.style.gap = '8px'
              chanceWrap.style.color = '#d1d5db'
              chanceWrap.style.fontSize = '14px'

              const chanceLabel = document.createElement('span')
              chanceLabel.textContent = 'Layer Chance %'

              const chanceInput = document.createElement('input')
              chanceInput.type = 'number'
              chanceInput.min = '0'
              chanceInput.max = '100'
              chanceInput.value = randomizerLayerChances[layerName] !== undefined
                ? randomizerLayerChances[layerName]
                : defaultLayerChance(layerName)
              chanceInput.style.width = '80px'
              chanceInput.style.padding = '8px'
              chanceInput.style.borderRadius = '8px'
              chanceInput.style.border = 'none'

              randomizerLayerChances[layerName] = parseFloat(chanceInput.value)

              chanceInput.onchange = function() {
                let value = parseFloat(chanceInput.value)
                if (isNaN(value)) value = defaultLayerChance(layerName)
                value = Math.max(0, Math.min(100, value))
                chanceInput.value = value
                randomizerLayerChances[layerName] = value

                if (typeof autoSaveNightShotsProject === 'function') {
                  autoSaveNightShotsProject()
                }
              }

              chanceWrap.appendChild(chanceLabel)
              chanceWrap.appendChild(chanceInput)

              const orderWrap = document.createElement('div')
              orderWrap.style.display = 'flex'
              orderWrap.style.gap = '6px'

              const upButton = document.createElement('button')
              upButton.type = 'button'
              upButton.innerHTML = '↑'
              upButton.title = 'Move layer up'
              upButton.style.background = '#374151'
              upButton.style.color = 'white'
              upButton.style.border = 'none'
              upButton.style.borderRadius = '8px'
              upButton.style.padding = '8px 10px'
              upButton.style.cursor = 'pointer'
              upButton.onclick = function() {
                moveLayerUp(layerName)
              }

              const downButton = document.createElement('button')
              downButton.type = 'button'
              downButton.innerHTML = '↓'
              downButton.title = 'Move layer down'
              downButton.style.background = '#374151'
              downButton.style.color = 'white'
              downButton.style.border = 'none'
              downButton.style.borderRadius = '8px'
              downButton.style.padding = '8px 10px'
              downButton.style.cursor = 'pointer'
              downButton.onclick = function() {
                moveLayerDown(layerName)
              }

              orderWrap.appendChild(upButton)
              orderWrap.appendChild(downButton)

              const rightControls = document.createElement('div')
              rightControls.style.display = 'flex'
              rightControls.style.alignItems = 'center'
              rightControls.style.gap = '10px'
              rightControls.appendChild(chanceWrap)
              rightControls.appendChild(orderWrap)

              layerHeader.appendChild(layerTitle)
              layerHeader.appendChild(rightControls)
              layerBox.appendChild(layerHeader)

              groupedLayers[layerName].forEach(function(entry) {
                const item = entry.item
                const index = entry.index

                const row = document.createElement('div')
                row.style.background = '#1f2937'
                row.style.padding = '12px'
                row.style.borderRadius = '10px'
                row.style.marginTop = '10px'
                row.style.display = 'flex'
                row.style.justifyContent = 'space-between'
                row.style.alignItems = 'center'
                row.style.gap = '14px'

                const label = document.createElement('div')
                label.style.display = 'flex'
                label.style.alignItems = 'center'
                label.style.gap = '12px'
                label.style.flex = '1'

                const preview = document.createElement('img')
                preview.src = item.imageURL
                preview.style.width = '48px'
                preview.style.height = '48px'
                preview.style.objectFit = 'contain'
                preview.style.borderRadius = '8px'

                const text = document.createElement('div')
                text.innerHTML =
                  '<strong>' + item.trait + ' → ' + item.rarity + '%</strong><br>' +
                  '<span style="color:#9ca3af;">' + (item.imageName || item.fileName || 'Trait image') + '</span>'

                label.appendChild(preview)
                label.appendChild(text)

                const remove = document.createElement('button')
                remove.type = 'button'
                remove.innerHTML = 'Remove'
                remove.style.background = '#dc2626'
                remove.style.color = 'white'
                remove.style.border = 'none'
                remove.style.borderRadius = '8px'
                remove.style.padding = '8px 12px'
                remove.style.cursor = 'pointer'

                remove.onclick = function() {
                  randomizerTraits.splice(index, 1)
                  renderRandomTraits()
                }

                row.appendChild(label)
                row.appendChild(remove)
                layerBox.appendChild(row)
              })

              list.appendChild(layerBox)
            })

            if (typeof refreshTraitRuleOptions === 'function') {
              refreshTraitRuleOptions()
            }
          }



        function toggleTraitBuilderVisibility() {
          const content = document.getElementById('traitBuilderContent')
          const button = document.getElementById('toggleTraitBuilderButton')

          if (!content || !button) return

          const hidden = content.style.display === 'none'

          content.style.display = hidden ? '' : 'none'
          button.innerHTML = hidden ? 'Hide Traits' : 'Show Traits'
        }

        function toggleTraitRulesVisibility() {
          const content = document.getElementById('traitRulesContent')
          const button = document.getElementById('toggleTraitRulesButton')

          if (!content || !button) return

          const hidden = content.style.display === 'none'

          content.style.display = hidden ? '' : 'none'
          button.innerHTML = hidden ? 'Hide Rules' : 'Show Rules'
        }



        function updateLayerOrderFromTraits() {
          const seen = []

          randomizerTraits.forEach(function(item) {
            const layer = displayLayerName(item.layer)
            if (!seen.includes(layer)) seen.push(layer)
          })

          randomizerLayerOrder = randomizerLayerOrder.filter(function(layer) {
            return seen.includes(layer)
          })

          seen.forEach(function(layer) {
            if (!randomizerLayerOrder.includes(layer)) {
              randomizerLayerOrder.push(layer)
            }
          })
        }

        function orderedLayerNames(groupedLayers) {
          updateLayerOrderFromTraits()

          const keys = Object.keys(groupedLayers)

          const ordered = randomizerLayerOrder.filter(function(layer) {
            return keys.includes(layer)
          })

          keys.forEach(function(layer) {
            if (!ordered.includes(layer)) ordered.push(layer)
          })

          return ordered
        }

        function moveLayerUp(layerName) {
          updateLayerOrderFromTraits()

          const index = randomizerLayerOrder.indexOf(layerName)
          if (index <= 0) return

          const temp = randomizerLayerOrder[index - 1]
          randomizerLayerOrder[index - 1] = randomizerLayerOrder[index]
          randomizerLayerOrder[index] = temp

          renderRandomTraits()
          autoSaveNightShotsProject()
        }

        function moveLayerDown(layerName) {
          updateLayerOrderFromTraits()

          const index = randomizerLayerOrder.indexOf(layerName)
          if (index === -1 || index >= randomizerLayerOrder.length - 1) return

          const temp = randomizerLayerOrder[index + 1]
          randomizerLayerOrder[index + 1] = randomizerLayerOrder[index]
          randomizerLayerOrder[index] = temp

          renderRandomTraits()
          autoSaveNightShotsProject()
        }

        function defaultLayerChance(layerName) {
          const lowerLayer = String(displayLayerName(layerName) || '').toLowerCase()

          if (
            lowerLayer.includes('accessory') ||
            lowerLayer.includes('accessories') ||
            lowerLayer.includes('hat') ||
            lowerLayer.includes('hand') ||
            lowerLayer.includes('prop') ||
            lowerLayer.includes('item')
          ) {
            return 35
          }

          if (
            lowerLayer.includes('clothes') ||
            lowerLayer.includes('clothing') ||
            lowerLayer.includes('shirt') ||
            lowerLayer.includes('outfit') ||
            lowerLayer.includes('jacket')
          ) {
            return 70
          }

          return 100
        }

        function getLayerChance(layerName) {
          const cleanLayer = displayLayerName(layerName)

          if (randomizerLayerChances[cleanLayer] !== undefined) {
            let value = parseFloat(randomizerLayerChances[cleanLayer])
            if (isNaN(value)) value = defaultLayerChance(cleanLayer)
            return Math.max(0, Math.min(100, value))
          }

          const fallback = defaultLayerChance(cleanLayer)
          randomizerLayerChances[cleanLayer] = fallback
          return fallback
        }

        function traitRuleKey(item) {
          return displayLayerName(item.layer) + '::' + item.trait
        }

        function traitRuleLabelFromKey(key) {
          return String(key || '').replace('::', ' → ')
        }

        function refreshTraitRuleOptions() {
          const a = document.getElementById('ruleTraitA')
          const b = document.getElementById('ruleTraitB')

          if (!a || !b) return

          const currentA = a.value
          const currentB = b.value

          const keys = []
          randomizerTraits.forEach(function(item) {
            const key = traitRuleKey(item)
            if (!keys.includes(key)) keys.push(key)
          })

          const html = '<option value="">Choose trait</option>' + keys.map(function(key) {
            return '<option value="' + key + '">' + traitRuleLabelFromKey(key) + '</option>'
          }).join('')

          a.innerHTML = html
          b.innerHTML = html

          if (keys.includes(currentA)) a.value = currentA
          if (keys.includes(currentB)) b.value = currentB
        }

        function addTraitRule() {
          const a = document.getElementById('ruleTraitA')
          const type = document.getElementById('ruleType')
          const b = document.getElementById('ruleTraitB')

          if (!a || !type || !b || !a.value || !b.value) {
            alert('Choose both traits for the rule.')
            return
          }

          if (a.value === b.value) {
            alert('Choose two different traits.')
            return
          }

          const exists = randomizerTraitRules.some(function(rule) {
            return rule.a === a.value && rule.b === b.value && rule.type === type.value
          })

          if (exists) {
            alert('That rule already exists.')
            return
          }

          randomizerTraitRules.push({
            a: a.value,
            b: b.value,
            type: type.value
          })

          renderTraitRules()
          autoSaveNightShotsProject()
        }

        function renderTraitRules() {
          const list = document.getElementById('traitRuleList')
          if (!list) return

          if (!randomizerTraitRules.length) {
            list.innerHTML = 'No rules added yet.'
            return
          }

          list.innerHTML = ''

          randomizerTraitRules.forEach(function(rule, index) {
            const row = document.createElement('div')
            row.style.background = '#111827'
            row.style.padding = '10px'
            row.style.borderRadius = '10px'
            row.style.marginTop = '8px'
            row.style.display = 'flex'
            row.style.justifyContent = 'space-between'
            row.style.gap = '10px'
            row.style.alignItems = 'center'

            const text = document.createElement('div')
            const ruleText = rule.type === 'requires' ? 'requires' : 'cannot pair with'
            text.innerHTML =
              '<strong>' + traitRuleLabelFromKey(rule.a) + '</strong> ' +
              ruleText +
              ' <strong>' + traitRuleLabelFromKey(rule.b) + '</strong>'

            const remove = document.createElement('button')
            remove.type = 'button'
            remove.innerHTML = 'Remove'
            remove.style.background = '#dc2626'
            remove.style.color = 'white'
            remove.style.border = 'none'
            remove.style.borderRadius = '8px'
            remove.style.padding = '7px 10px'
            remove.style.cursor = 'pointer'

            remove.onclick = function() {
              randomizerTraitRules.splice(index, 1)
              renderTraitRules()
              autoSaveNightShotsProject()
            }

            row.appendChild(text)
            row.appendChild(remove)
            list.appendChild(row)
          })
        }

        function removeAllTraitRules() {
          if (!randomizerTraitRules.length) {
            alert('No rules to remove.')
            return
          }

          if (!confirm('Remove all trait rules?')) return

          randomizerTraitRules = []
          renderTraitRules()

          if (typeof autoSaveNightShotsProject === 'function') {
            autoSaveNightShotsProject()
          }
        }

        window.randomizerComboPassesRules = function(items) {
          const keys = (items || []).map(function(item) {
            return traitRuleKey(item)
          })

          for (let i = 0; i < randomizerTraitRules.length; i++) {
            const rule = randomizerTraitRules[i]
            const hasA = keys.includes(rule.a)
            const hasB = keys.includes(rule.b)

            if (rule.type === 'cannot_pair' && hasA && hasB) {
              return false
            }

            if (rule.type === 'requires' && hasA && !hasB) {
              return false
            }
          }

          return true
        }

        function displayLayerName(layerName) {
            const raw = String(layerName || '').toLowerCase()
            const normalized = raw.replace(/[^a-z]/g, '')

            if (normalized.includes('accessory') || normalized.includes('acceory') || normalized.includes('accesory') || normalized.includes('access') || normalized.includes('acc')) {
              return 'Accessory'
            }

            if (normalized.includes('base') || normalized.includes('bae') || normalized === 'ba') {
              return 'Base'
            }

            if (normalized.includes('eyes') || normalized.includes('eye')) {
              return 'Eyes'
            }

            if (normalized.includes('hat')) {
              return 'Hat'
            }

            if (normalized.includes('background') || normalized.includes('bg')) {
              return 'Background'
            }

            return String(layerName || '').trim()
          }
        
        let generatedRandomNFTsForExport = []


        async function imageURLToDataURLForProject(imageURL) {
          if (!imageURL) return ''

          if (String(imageURL).startsWith('data:')) {
            return imageURL
          }

          try {
            const blob = await fetch(imageURL).then(function(r) { return r.blob() })

            return await new Promise(function(resolve) {
              const reader = new FileReader()
              reader.onload = function() { resolve(reader.result) }
              reader.readAsDataURL(blob)
            })
          } catch (e) {
            console.error('Could not preserve project image:', e)
            return imageURL
          }
        }

        async function getNightShotsProjectData() {
          const packedTraits = []

          for (let i = 0; i < (randomizerTraits || []).length; i++) {
            const item = randomizerTraits[i]

            packedTraits.push({
              layer: displayLayerName(item.layer),
              trait: item.trait || '',
              rarity: item.rarity || '',
              imageName: item.imageName || item.fileName || 'Trait image',
              fileName: item.fileName || item.imageName || 'Trait image',
              imageURL: await imageURLToDataURLForProject(item.imageURL)
            })
          }

          return {
            version: 'NightShotsGeneratorV2',
            savedAt: new Date().toISOString(),

            collection: {
              collectionName: document.getElementById('collectionName')?.value || '',
              nftBaseName: document.getElementById('nftBaseName')?.value || '',
              supplyAmount: document.getElementById('supplyAmount')?.value || '',
              oneOfOneCount: document.getElementById('advancedOneOfOneCount')?.value || '0'
            },

            randomizerTraits: packedTraits,
            traits: packedTraits,
            sharedTraits: sharedTraits || [],
            perImageTraits: perImageTraits || {},
            randomizerTraitRules: randomizerTraitRules || [],
            randomizerLayerChances: randomizerLayerChances || {},
            randomizerLayerOrder: randomizerLayerOrder || []
          }
        }

        async function autoSaveNightShotsProject() {
          try {
            const project = await getNightShotsProjectData()
            localStorage.setItem(
              'nightShotsAutoSaveProject',
              JSON.stringify(project)
            )
          } catch (e) {
            console.error('Auto save failed:', e)
          }
        }

        async function restoreNightShotsAutosave() {
          try {
            const raw = localStorage.getItem('nightShotsAutoSaveProject')

            if (!raw) {
              alert('No auto save found.')
              return
            }

            const project = JSON.parse(raw)

            applyNightShotsProject(project)

            alert('Auto save restored successfully. Traits loaded: ' + (randomizerTraits ? randomizerTraits.length : 0))
          } catch (e) {
            console.error(e)
            alert('Failed to restore auto save.')
          }
        }

        function applyNightShotsProject(project) {
          if (!project) return

          if (project.collection) {
            const collectionNameInput = document.getElementById('collectionName')
            const nftBaseNameInput = document.getElementById('nftBaseName')
            const supplyAmountInput = document.getElementById('supplyAmount')
            const oneBox = document.getElementById('advancedOneOfOneCount')

            if (collectionNameInput) {
              collectionNameInput.value = project.collection.collectionName || ''
            }

            if (nftBaseNameInput) {
              nftBaseNameInput.value = project.collection.nftBaseName || ''
            }

            if (supplyAmountInput) {
              supplyAmountInput.value = project.collection.supplyAmount || ''
            }

            if (oneBox) {
              oneBox.value = project.collection.oneOfOneCount || '0'
            }
          }

          const loadedTraits =
            Array.isArray(project.randomizerTraits) ? project.randomizerTraits :
            Array.isArray(project.traits) ? project.traits :
            []

          randomizerTraits = loadedTraits.map(function(item) {
            return {
              layer: displayLayerName(item.layer),
              trait: item.trait || '',
              rarity: item.rarity || '',
              imageName: item.imageName || item.fileName || 'Trait image',
              fileName: item.fileName || item.imageName || 'Trait image',
              imageURL: item.imageURL || ''
            }
          })

          sharedTraits = Array.isArray(project.sharedTraits)
            ? project.sharedTraits
            : []

          perImageTraits = project.perImageTraits || {}
          randomizerTraitRules = Array.isArray(project.randomizerTraitRules) ? project.randomizerTraitRules : []
          randomizerLayerChances = project.randomizerLayerChances || {}
          randomizerLayerOrder = Array.isArray(project.randomizerLayerOrder) ? project.randomizerLayerOrder : []

          if (typeof selectMode === 'function') {
            selectMode('advanced')
          }

          setTimeout(function() {
            if (typeof renderRandomTraits === 'function') {
              renderRandomTraits()
            }

            if (typeof renderSharedTraits === 'function') {
              renderSharedTraits()
            }

            if (typeof updateAllMultiPreviews === 'function') {
              updateAllMultiPreviews()
            }

            if (typeof refreshTraitRuleOptions === 'function') {
              refreshTraitRuleOptions()
            }

            if (typeof renderTraitRules === 'function') {
              renderTraitRules()
            }

            const status = document.getElementById('generationStatus')
            if (status) {
              status.style.display = 'block'
              status.innerHTML = 'Project loaded. Traits restored: ' + randomizerTraits.length
            }

            console.log('PROJECT APPLIED:', {
              traitsLoaded: randomizerTraits.length,
              sharedTraitsLoaded: sharedTraits.length,
              perImageTraitGroups: Object.keys(perImageTraits || {}).length
            })
          }, 100)
        }

        async function saveNightShotsProject() {
          try {
            const project = await getNightShotsProjectData()

            const blob = new Blob(
              [JSON.stringify(project, null, 2)],
              { type: 'application/json' }
            )

            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')

            const collectionName =
              document.getElementById('collectionName')?.value ||
              'night-shots-project'

            const safeName = collectionName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')

            a.href = url
            a.download = safeName + '-project.json'

            document.body.appendChild(a)
            a.click()
            a.remove()

            URL.revokeObjectURL(url)

            await autoSaveNightShotsProject()

            alert('Project saved successfully.')
          } catch (e) {
            console.error(e)
            alert('Failed to save project.')
          }
        }

        async function loadNightShotsProject(event) {
          try {
            const file = event.target.files[0]

            if (!file) return

            const text = await file.text()

            const project = JSON.parse(text)

            applyNightShotsProject(project)

            await autoSaveNightShotsProject()

            alert('Project loaded successfully. Traits loaded: ' + (randomizerTraits ? randomizerTraits.length : 0))
          } catch (e) {
            console.error(e)
            alert('Failed to load project.')
          }
        }

        setInterval(function() {
          autoSaveNightShotsProject()
        }, 15000)

        
        async function downloadGeneratedNFTZip() {
          let downloadStatus = document.getElementById('downloadZipStatus')

          if (!downloadStatus) {
            downloadStatus = document.createElement('div')
            downloadStatus.id = 'downloadZipStatus'
            downloadStatus.style.background = '#0f172a'
            downloadStatus.style.color = '#dbeafe'
            downloadStatus.style.border = '2px solid #2563eb'
            downloadStatus.style.borderRadius = '12px'
            downloadStatus.style.padding = '12px'
            downloadStatus.style.marginTop = '14px'
            downloadStatus.style.fontWeight = 'bold'

            const output = document.getElementById('generatedRandomNFTs')
            if (output) {
              output.prepend(downloadStatus)
            } else {
              document.body.prepend(downloadStatus)
            }
          }

          downloadStatus.style.display = 'block'
          downloadStatus.innerHTML = 'Preparing ZIP download... please wait.'

          try {

            if (!generatedRandomNFTsForExport || !generatedRandomNFTsForExport.length) {
              alert('Please generate NFTs first.')
              return
            }

            if (typeof JSZip === 'undefined') {
              alert('JSZip failed to load. Refresh page and try again.')
              return
            }

            const keptNFTs = generatedRandomNFTsForExport.filter(function(nft) {
              return nft.kept !== false
            })

            if (!keptNFTs.length) {
              alert('No kept NFTs available.')
              return
            }

            const zip = new JSZip()

            const imageFolder = zip.folder('images')
            const metadataFolder = zip.folder('metadata')

            async function loadImage(src) {
              return new Promise(function(resolve, reject) {
                const img = new Image()

                img.crossOrigin = 'anonymous'

                img.onload = function() {
                  resolve(img)
                }

                img.onerror = function(err) {
                  reject(err)
                }

                img.src = src
              })
            }

            function safeName(value, fallback) {
              return String(value || fallback || 'nft')
                .replace(/[^a-z0-9-_ ]/gi, '')
                .trim()
                .replace(/\s+/g, '-') || fallback || 'nft'
            }

            for (let i = 0; i < keptNFTs.length; i++) {

              downloadStatus.innerHTML = 'Building ZIP... NFT ' + (i + 1) + ' of ' + keptNFTs.length

              const nft = keptNFTs[i]

              const canvas = document.createElement('canvas')
              canvas.width = 1000
              canvas.height = 1000

              const ctx = canvas.getContext('2d')

              ctx.clearRect(0, 0, 1000, 1000)

              for (let j = 0; j < nft.items.length; j++) {

                const item = nft.items[j]

                if (!item || !item.imageURL) continue

                try {
                  const img = await loadImage(item.imageURL)
                  ctx.drawImage(img, 0, 0, 1000, 1000)
                } catch (e) {
                  console.log('Failed image load:', item)
                }
              }

              const blob = await new Promise(function(resolve) {
                canvas.toBlob(resolve, 'image/png')
              })

              const fileBase = safeName(
                nft.name,
                'generated-nft-' + (i + 1)
              )

              imageFolder.file(fileBase + '.png', blob)

              const metadata = {
                name: nft.name,
                description: 'Generated with Rare Ink Studios / Night Shots NFT Creator',
                image: 'images/' + fileBase + '.png',
                attributes: nft.items.map(function(item) {
                  return {
                    trait_type: displayLayerName(item.layer),
                    value: item.trait
                  }
                }).concat([
                  {
                    trait_type: 'Natural Combo Count',
                    value: nft.comboCount + ' of ' + keptNFTs.length
                  },
                  {
                    trait_type: 'Collection Rarity',
                    value: nft.collectionRarity + '%'
                  },
                  {
                    trait_type: 'Rarity Tier',
                    value: nft.rarityTier
                  },
                  {
                    trait_type: 'Rarity Rank',
                    value: '#' + nft.rank
                  }
                ]).concat(
                  nft.oneOfOne ? [{
                    trait_type: 'Edition',
                    value: '1 of 1'
                  }] : []
                )
              }

              metadataFolder.file(
                fileBase + '.json',
                JSON.stringify(metadata, null, 2)
              )
            }

            downloadStatus.innerHTML = 'Compressing ZIP file...'

            const zipBlob = await zip.generateAsync({
              type: 'blob'
            })

            const url = URL.createObjectURL(zipBlob)

            const a = document.createElement('a')

            a.href = url
            a.download = 'night-shots-randomized-nfts.zip'

            document.body.appendChild(a)

            a.click()

            a.remove()

            URL.revokeObjectURL(url)

            downloadStatus.innerHTML = 'ZIP ready. Save window should be open now.'

            setTimeout(function() {
              downloadStatus.style.display = 'none'
            }, 6000)

            console.log('ZIP DOWNLOAD COMPLETE')

          } catch (err) {

            console.error(err)

            if (downloadStatus) {
              downloadStatus.style.background = '#7f1d1d'
              downloadStatus.style.border = '2px solid #dc2626'
              downloadStatus.style.color = 'white'
              downloadStatus.innerHTML = 'ZIP generation failed. Check console.'
            } else {
              alert('ZIP generation failed. Check console.')
            }
          }
        }


        function startRandomNFTGeneration(button) {
            if (window.nightShotsGenerating) {
              alert('Generation is already running. Please wait.')
              return
            }

            window.nightShotsGenerating = true

            if (button) {
              button.disabled = true
              button.dataset.originalText = button.innerHTML
              button.innerHTML = 'Generating...'
              button.style.opacity = '0.6'
              button.style.cursor = 'not-allowed'
            }

            const status = document.getElementById('generationStatus')
            if (status) {
              status.style.display = 'block'
              status.innerHTML = 'Preparing generator...'
            }

            setTimeout(function() {
              try {
                generateRandomNFTs()
              } finally {
                window.nightShotsGenerating = false

                if (button) {
                  button.disabled = false
                  button.innerHTML = button.dataset.originalText || 'Generate NFTs'
                  button.style.opacity = '1'
                  button.style.cursor = 'pointer'
                }
              }
            }, 75)
          }

        function generateRandomNFTs() {
            const output = document.getElementById('generatedRandomNFTs')
            const statusBox = document.getElementById('generationStatus')
            output.innerHTML = ''
            generatedRandomNFTsForExport = []

            if (statusBox) {
              statusBox.style.display = 'block'
              statusBox.innerHTML = 'Generating collection... please wait.'
            }

            if (!randomizerTraits || randomizerTraits.length === 0) {
              alert('Please add randomizer traits first.')
              return
            }

            let requestedCount = parseInt(document.getElementById('supplyAmount').value) || 5
            requestedCount = Math.max(1, Math.min(10000, requestedCount))
            document.getElementById('supplyAmount').value = requestedCount

            const oneInput = document.getElementById('advancedOneOfOneCount')
            let requestedOneOfOnes = oneInput ? parseInt(oneInput.value || '0', 10) : 0
            requestedOneOfOnes = parseInt(requestedOneOfOnes || 0, 10)

            if (isNaN(requestedOneOfOnes)) {
              requestedOneOfOnes = 0
            }

            requestedOneOfOnes = Math.max(0, requestedOneOfOnes)

            if (requestedOneOfOnes > 589) {
              alert('Maximum TRUE 1/1 count is 589.')
              requestedOneOfOnes = 589
            }

            requestedOneOfOnes = Math.min(requestedOneOfOnes, requestedCount)
            if (oneInput) oneInput.value = requestedOneOfOnes

            console.log('READ TRUE 1/1 INPUT VALUE:', requestedOneOfOnes)

            const groupedLayers = {}
            randomizerTraits.forEach(function(item) {
              const cleanLayer = displayLayerName(item.layer)
              if (!groupedLayers[cleanLayer]) groupedLayers[cleanLayer] = []
              groupedLayers[cleanLayer].push(Object.assign({}, item, { layer: cleanLayer }))
            })

            function chooseTraitByRarity(traits, layerName) {
              const cleanLayer = displayLayerName(layerName)
              const lowerLayer = String(cleanLayer || '').toLowerCase()

              let layerUseChance = getLayerChance(cleanLayer)

              const totalChance = traits.reduce(function(total, trait) {
                return total + (parseFloat(trait.rarity) || 0)
              }, 0)

              if (totalChance > 0 && totalChance < layerUseChance) {
                layerUseChance = totalChance
              }

              const layerRoll = Math.random() * 100

              if (layerRoll > layerUseChance) {
                return null
              }

              const weightedTotal = traits.reduce(function(total, trait) {
                return total + Math.max(0, parseFloat(trait.rarity) || 0)
              }, 0)

              if (weightedTotal <= 0) {
                return traits[Math.floor(Math.random() * traits.length)]
              }

              const roll = Math.random() * weightedTotal
              let running = 0

              for (let i = 0; i < traits.length; i++) {
                running += Math.max(0, parseFloat(traits[i].rarity) || 0)
                if (roll <= running) return traits[i]
              }

              return traits[Math.floor(Math.random() * traits.length)]
            }

            function comboKey(items) {
              return (items || [])
                .map(function(item) {
                  return displayLayerName(item.layer) + '::' + item.trait
                })
                .sort()
                .join('|') || 'NO_TRAITS'
            }

            function makeCombo() {
              for (let attempt = 0; attempt < 1000; attempt++) {
                const items = []

                orderedLayerNames(groupedLayers).forEach(function(layerName) {
                  const chosen = chooseTraitByRarity(groupedLayers[layerName], layerName)
                  if (chosen) items.push(chosen)
                })

                if (typeof window.randomizerComboPassesRules === 'function') {
                  if (!window.randomizerComboPassesRules(items)) continue
                }

                return { items: items, key: comboKey(items) }
              }

              return { items: [], key: 'NO_TRAITS' }
            }

            function makeDifferentCombo(blockedKeys) {
              for (let attempt = 0; attempt < 3000; attempt++) {
                const combo = makeCombo()
                if (!blockedKeys[combo.key]) {
                  blockedKeys[combo.key] = true
                  return combo
                }
              }

              const fallback = makeCombo()
              fallback.key = fallback.key + '::FORCED_UNIQUE_' + Math.random()
              blockedKeys[fallback.key] = true
              return fallback
            }

            const oneOfOneBlocked = {}
            const oneOfOneRecords = []

            for (let i = 0; i < requestedOneOfOnes; i++) {
              const combo = makeDifferentCombo(oneOfOneBlocked)

              oneOfOneRecords.push({
                name: '',
                kept: true,
                intendedOneOfOne: true,
                oneOfOne: true,
                oneOfOneEdition: i + 1,
                forcedOneOfOne: true,
                items: combo.items
              })
            }

            const nonOneRecords = []
            const remainingCount = requestedCount - oneOfOneRecords.length

            while (nonOneRecords.length < remainingCount) {
              const combo = makeCombo()

              nonOneRecords.push({
                name: '',
                kept: true,
                intendedOneOfOne: false,
                oneOfOne: false,
                items: combo.items
              })
            }

            const allRecords = oneOfOneRecords.concat(nonOneRecords)

            for (let i = allRecords.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              const temp = allRecords[i]
              allRecords[i] = allRecords[j]
              allRecords[j] = temp
            }

            allRecords.forEach(function(record, index) {
              record.name = 'Generated NFT #' + (index + 1)
              generatedRandomNFTsForExport.push(record)
            })

            const total = generatedRandomNFTsForExport.length
            const counts = {}

            generatedRandomNFTsForExport.forEach(function(nft, index) {
              const baseKey = comboKey(nft.items)
              nft.baseComboKey = baseKey
              nft.comboKey = nft.oneOfOne ? baseKey + '::TRUE_1_OF_1_' + index : baseKey
              counts[nft.comboKey] = (counts[nft.comboKey] || 0) + 1
            })

            generatedRandomNFTsForExport.forEach(function(nft) {
              nft.comboCount = nft.oneOfOne ? 1 : counts[nft.comboKey]
              nft.collectionRarity = (nft.comboCount / total) * 100
              nft.rarityTier = nft.oneOfOne ? '1 of 1' :
                nft.collectionRarity <= 0.5 ? 'Ultra Rare' :
                nft.collectionRarity <= 5 ? 'Rare' :
                nft.collectionRarity <= 15 ? 'Uncommon' :
                'Common'
            })

            generatedRandomNFTsForExport
              .map(function(nft, index) { return { nft: nft, index: index } })
              .sort(function(a, b) {
                if (a.nft.oneOfOne !== b.nft.oneOfOne) return a.nft.oneOfOne ? -1 : 1
                if (a.nft.comboCount !== b.nft.comboCount) return a.nft.comboCount - b.nft.comboCount
                return a.index - b.index
              })
              .forEach(function(entry, rankIndex) {
                entry.nft.rank = rankIndex + 1
              })

            const createdOneOfOnes = generatedRandomNFTsForExport.filter(function(nft) {
              return nft.oneOfOne === true
            }).length

            const tierStats = {
              common: generatedRandomNFTsForExport.filter(function(nft) { return nft.rarityTier === 'Common' }).length,
              uncommon: generatedRandomNFTsForExport.filter(function(nft) { return nft.rarityTier === 'Uncommon' }).length,
              rare: generatedRandomNFTsForExport.filter(function(nft) { return nft.rarityTier === 'Rare' }).length,
              ultraRare: generatedRandomNFTsForExport.filter(function(nft) { return nft.rarityTier === 'Ultra Rare' }).length,
              oneOfOne: createdOneOfOnes
            }

            const uniqueCombos = new Set(generatedRandomNFTsForExport.map(function(nft) {
              return nft.baseComboKey || nft.comboKey
            })).size

            const duplicateCount = total - uniqueCombos

            const filterBar = document.createElement('div')
            filterBar.style.display = 'flex'
            filterBar.style.gap = '10px'
            filterBar.style.marginTop = '20px'
            filterBar.style.marginBottom = '10px'

            const showAllButton = document.createElement('button')
            showAllButton.innerHTML = 'Show All NFTs'
            showAllButton.style.background = '#2563eb'
            showAllButton.style.color = 'white'
            showAllButton.style.border = 'none'
            showAllButton.style.padding = '10px 14px'
            showAllButton.style.borderRadius = '10px'
            showAllButton.style.cursor = 'pointer'

            const showOneButton = document.createElement('button')
            showOneButton.innerHTML = '⭐ Show Only 1/1s'
            showOneButton.style.background = '#f59e0b'
            showOneButton.style.color = '#111827'
            showOneButton.style.border = 'none'
            showOneButton.style.padding = '10px 14px'
            showOneButton.style.borderRadius = '10px'
            showOneButton.style.fontWeight = 'bold'
            showOneButton.style.cursor = 'pointer'

            const compactButton = document.createElement('button')
            compactButton.innerHTML = 'Compact View'
            compactButton.style.background = '#374151'
            compactButton.style.color = 'white'
            compactButton.style.border = 'none'
            compactButton.style.padding = '10px 14px'
            compactButton.style.borderRadius = '10px'
            compactButton.style.cursor = 'pointer'

            const downloadNowButton = document.createElement('button')
            downloadNowButton.innerHTML = 'Download ZIP'
            downloadNowButton.style.background = '#2563eb'
            downloadNowButton.style.color = 'white'
            downloadNowButton.style.border = 'none'
            downloadNowButton.style.padding = '10px 14px'
            downloadNowButton.style.borderRadius = '10px'
            downloadNowButton.style.cursor = 'pointer'
            downloadNowButton.onclick = function() {
              downloadGeneratedNFTZip()
            }
            filterBar.appendChild(downloadNowButton)

            output.appendChild(filterBar)

            const advancedFilterBar = document.createElement('div')
            advancedFilterBar.style.display = 'flex'
            advancedFilterBar.style.flexWrap = 'wrap'
            advancedFilterBar.style.gap = '10px'
            advancedFilterBar.style.marginTop = '12px'
            advancedFilterBar.style.marginBottom = '18px'

            const searchInput = document.createElement('input')
            searchInput.placeholder = 'Search traits, layers, rarity, rank...'
            searchInput.style.padding = '10px'
            searchInput.style.borderRadius = '10px'
            searchInput.style.border = 'none'
            searchInput.style.minWidth = '260px'

            const sortSelect = document.createElement('select')
            sortSelect.style.padding = '10px'
            sortSelect.style.borderRadius = '10px'
            sortSelect.style.border = 'none'

            ;[
              'Highest Rank',
              'Lowest Rank',
              'Rarest',
              'Most Common',
              '1/1s Only',
              'Duplicates Only',
              'Kept',
              'Discarded',
              'Approved',
              'Needs Review',
              'Flagged Problem'
            ].forEach(function(label) {
              const opt = document.createElement('option')
              opt.value = label
              opt.textContent = label
              sortSelect.appendChild(opt)
            })

            advancedFilterBar.appendChild(searchInput)
            advancedFilterBar.appendChild(sortSelect)


            output.appendChild(advancedFilterBar)

            const batchBar = document.createElement('div')
            batchBar.style.display = 'flex'
            batchBar.style.flexWrap = 'wrap'
            batchBar.style.gap = '10px'
            batchBar.style.marginTop = '10px'
            batchBar.style.marginBottom = '18px'

            function makeBatchButton(label, bg) {
              const btn = document.createElement('button')
              btn.type = 'button'
              btn.innerHTML = label
              btn.style.background = bg
              btn.style.color = 'white'
              btn.style.border = 'none'
              btn.style.padding = '10px 14px'
              btn.style.borderRadius = '10px'
              btn.style.cursor = 'pointer'
              return btn
            }

            const keepOneBtn = makeBatchButton('Keep All 1/1s', '#f59e0b')
            const discardDuplicateBtn = makeBatchButton('Discard Duplicate Copies', '#dc2626')
            const restoreBtn = makeBatchButton('Restore All', '#2563eb')

            batchBar.appendChild(keepOneBtn)
            batchBar.appendChild(discardDuplicateBtn)
            batchBar.appendChild(restoreBtn)

            output.appendChild(batchBar)


            const summary = document.createElement('div')
            summary.style.background = '#0f172a'
            summary.style.color = '#d1d5db'
            summary.style.padding = '14px'
            summary.style.borderRadius = '12px'
            summary.style.marginTop = '20px'
            summary.innerHTML =
              '<strong>Collection Summary:</strong><br>' +
              'Generated: ' + total +
              '<br>Requested 1 of 1s: ' + requestedOneOfOnes +
              '<br><span style="color:#f59e0b; font-weight:bold;">Created 1 of 1s: ' + createdOneOfOnes + '</span>'
            output.appendChild(summary)

            const statsPanel = document.createElement('div')
            statsPanel.style.background = '#111827'
            statsPanel.style.color = '#d1d5db'
            statsPanel.style.padding = '14px'
            statsPanel.style.borderRadius = '12px'
            statsPanel.style.marginTop = '14px'
            statsPanel.style.border = '2px solid #374151'
            statsPanel.innerHTML =
              '<strong>Collection Stats:</strong><br>' +
              'Common: ' + tierStats.common +
              '<br>Uncommon: ' + tierStats.uncommon +
              '<br>Rare: ' + tierStats.rare +
              '<br>Ultra Rare: ' + tierStats.ultraRare +
              '<br>1/1: ' + tierStats.oneOfOne +
              '<br>Unique Combos: ' + uniqueCombos +
              '<br>Duplicate Combos: ' + duplicateCount
            output.appendChild(statsPanel)

            const nftGrid = document.createElement('div')
            nftGrid.id = 'generatedNFTGrid'
            nftGrid.style.display = 'grid'
            nftGrid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
            nftGrid.style.gap = '18px'
            nftGrid.style.marginTop = '20px'
            output.appendChild(nftGrid)

            generatedRandomNFTsForExport.forEach(function(exportRecord) {
              const selectedItems = exportRecord.items

              const nftBox = document.createElement('div')
              nftBox.style.background = '#111827'
              nftBox.style.padding = '14px'
              nftBox.style.borderRadius = '14px'
              nftBox.style.marginTop = '0'
              nftBox.style.border = exportRecord.oneOfOne ? '4px solid #f59e0b' : '2px solid #374151'
              nftBox.style.boxShadow = exportRecord.oneOfOne ? '0 0 24px rgba(245,158,11,0.65)' : ''

              if (exportRecord.oneOfOne) {
                const oneBadge = document.createElement('div')
                oneBadge.className = 'one-of-one-badge'
                oneBadge.innerHTML = '⭐ TRUE 1/1 EDITION'
                oneBadge.style.background = '#f59e0b'
                oneBadge.style.color = '#111827'
                oneBadge.style.display = 'inline-block'
                oneBadge.style.padding = '8px 14px'
                oneBadge.style.borderRadius = '999px'
                oneBadge.style.fontWeight = 'bold'
                oneBadge.style.marginBottom = '10px'
                nftBox.appendChild(oneBadge)
              }

              const rankBadge = document.createElement('div')
              rankBadge.innerHTML = '🏆 Rank #' + exportRecord.rank + ' of ' + total
              rankBadge.style.background = '#312e81'
              rankBadge.style.color = 'white'
              rankBadge.style.display = 'inline-block'
              rankBadge.style.padding = '7px 12px'
              rankBadge.style.borderRadius = '999px'
              rankBadge.style.fontWeight = 'bold'
              rankBadge.style.marginBottom = '8px'
              rankBadge.style.marginLeft = exportRecord.oneOfOne ? '8px' : '0'
              nftBox.appendChild(rankBadge)

              const title = document.createElement('h3')
              title.innerHTML = exportRecord.name
              nftBox.appendChild(title)

              const raritySummary = document.createElement('div')
              raritySummary.style.background = '#0f172a'
              raritySummary.style.color = '#93c5fd'
              raritySummary.style.padding = '10px 12px'
              raritySummary.style.borderRadius = '10px'
              raritySummary.style.marginBottom = '10px'
              raritySummary.style.fontSize = '12px'
              raritySummary.innerHTML =
                '<strong>Natural Combo Count:</strong> ' + exportRecord.comboCount + ' of ' + total +
                '<br><strong>Collection Rarity:</strong> ' + exportRecord.collectionRarity.toFixed(4).replace(/\.?0+$/, '') + '%' +
                '<br><strong>Rarity Tier:</strong> ' + exportRecord.rarityTier +
                '<br><strong>Rarity Rank:</strong> #' + exportRecord.rank + ' of ' + total +
                (exportRecord.oneOfOne ? '<br><strong>Edition:</strong> 1 of 1' : '')
              nftBox.appendChild(raritySummary)

              const status = document.createElement('div')
              status.innerHTML = 'Status: <span style="color:#22c55e;">Kept</span>'
              status.style.marginBottom = '10px'
              status.style.fontSize = '13px'
              const reviewStatus = document.createElement('div')
              reviewStatus.innerHTML = 'Review: <span style="color:#f59e0b;">Needs Review</span>'
              reviewStatus.style.marginBottom = '10px'
              reviewStatus.style.fontSize = '13px'

              nftBox.appendChild(status)
              nftBox.appendChild(reviewStatus)

              const buttonRow = document.createElement('div')
              buttonRow.style.display = 'flex'
              buttonRow.style.gap = '10px'
              buttonRow.style.marginBottom = '12px'

              const keepButton = document.createElement('button')
              keepButton.type = 'button'
              keepButton.innerHTML = 'Keep / Un-discard'
              keepButton.style.background = '#16a34a'
              keepButton.style.color = 'white'
              keepButton.style.border = 'none'
              keepButton.style.padding = '8px 10px'
              keepButton.style.borderRadius = '10px'

              const discardButton = document.createElement('button')
              discardButton.type = 'button'
              discardButton.innerHTML = 'Discard NFT'
              discardButton.style.background = '#dc2626'
              discardButton.style.color = 'white'
              discardButton.style.border = 'none'
              discardButton.style.padding = '8px 10px'
              discardButton.style.borderRadius = '10px'

              keepButton.onclick = function() {
                exportRecord.kept = true
                nftBox.dataset.kept = 'true'
                nftBox.style.opacity = '1'
                status.innerHTML = 'Status: <span style="color:#22c55e;">Kept</span>'

                if (typeof refreshNFTGridFilters === 'function') {
                  refreshNFTGridFilters()
                }
              }

              discardButton.onclick = function() {
                exportRecord.kept = false
                nftBox.dataset.kept = 'false'
                nftBox.style.opacity = '0.45'
                status.innerHTML = 'Status: <span style="color:#ef4444;">Discarded</span>'

                if (typeof refreshNFTGridFilters === 'function') {
                  refreshNFTGridFilters()
                }
              }


              const approveButton = document.createElement('button')
              approveButton.type = 'button'
              approveButton.innerHTML = 'Approve'
              approveButton.style.background = '#2563eb'
              approveButton.style.color = 'white'
              approveButton.style.border = 'none'
              approveButton.style.padding = '8px 10px'
              approveButton.style.borderRadius = '10px'

              const reviewButton = document.createElement('button')
              reviewButton.type = 'button'
              reviewButton.innerHTML = 'Needs Review'
              reviewButton.style.background = '#d97706'
              reviewButton.style.color = 'white'
              reviewButton.style.border = 'none'
              reviewButton.style.padding = '8px 10px'
              reviewButton.style.borderRadius = '10px'

              const flagButton = document.createElement('button')
              flagButton.type = 'button'
              flagButton.innerHTML = 'Flag Problem'
              flagButton.style.background = '#7f1d1d'
              flagButton.style.color = 'white'
              flagButton.style.border = 'none'
              flagButton.style.padding = '8px 10px'
              flagButton.style.borderRadius = '10px'

              approveButton.onclick = function() {
                nftBox.dataset.review = 'approved'
                reviewStatus.innerHTML = 'Review: <span style="color:#60a5fa;">Approved</span>'

                if (typeof refreshNFTGridFilters === 'function') {
                  refreshNFTGridFilters()
                }
              }

              reviewButton.onclick = function() {
                nftBox.dataset.review = 'needs-review'
                reviewStatus.innerHTML = 'Review: <span style="color:#f59e0b;">Needs Review</span>'

                if (typeof refreshNFTGridFilters === 'function') {
                  refreshNFTGridFilters()
                }
              }

              flagButton.onclick = function() {
                nftBox.dataset.review = 'flagged'
                reviewStatus.innerHTML = 'Review: <span style="color:#ef4444;">Flagged Problem</span>'

                if (typeof refreshNFTGridFilters === 'function') {
                  refreshNFTGridFilters()
                }
              }

              buttonRow.appendChild(approveButton)
              buttonRow.appendChild(reviewButton)
              buttonRow.appendChild(flagButton)

              buttonRow.appendChild(keepButton)
              buttonRow.appendChild(discardButton)

              nftBox.appendChild(buttonRow)

              const fullPreview = document.createElement('div')
              fullPreview.style.position = 'relative'
              fullPreview.style.width = '100%'
              fullPreview.style.height = '220px'
              fullPreview.style.background = '#000'
              fullPreview.style.borderRadius = '16px'
              fullPreview.style.overflow = 'hidden'
              fullPreview.style.marginBottom = '12px'
              fullPreview.style.border = '2px solid #374151'
              nftBox.appendChild(fullPreview)

              const detailButton = document.createElement('button')
              detailButton.type = 'button'
              detailButton.innerHTML = 'Show Traits'
              detailButton.style.background = '#374151'
              detailButton.style.color = 'white'
              detailButton.style.border = 'none'
              detailButton.style.padding = '8px 10px'
              detailButton.style.borderRadius = '8px'
              detailButton.style.cursor = 'pointer'
              detailButton.style.marginTop = '8px'
              detailButton.style.width = '100%'
              nftBox.appendChild(detailButton)

              const traitDetailsBox = document.createElement('div')
              traitDetailsBox.style.display = 'none'
              traitDetailsBox.style.marginTop = '10px'
              nftBox.appendChild(traitDetailsBox)

              detailButton.onclick = function() {
                const hidden = traitDetailsBox.style.display === 'none'
                traitDetailsBox.style.display = hidden ? '' : 'none'
                detailButton.innerHTML = hidden ? 'Hide Traits' : 'Show Traits'
              }

              selectedItems.forEach(function(randomTrait) {
                const fullLayerImage = document.createElement('img')
                fullLayerImage.src = randomTrait.imageURL
                fullLayerImage.style.position = 'absolute'
                fullLayerImage.style.top = '0'
                fullLayerImage.style.left = '0'
                fullLayerImage.style.width = '100%'
                fullLayerImage.style.height = '100%'
                fullLayerImage.style.objectFit = 'contain'
                fullPreview.appendChild(fullLayerImage)

                const traitRow = document.createElement('div')
                traitRow.style.display = 'flex'
                traitRow.style.alignItems = 'center'
                traitRow.style.gap = '14px'
                traitRow.style.marginTop = '12px'
                traitRow.style.background = '#1f2937'
                traitRow.style.padding = '8px'
                traitRow.style.borderRadius = '10px'

                const preview = document.createElement('img')
                preview.src = randomTrait.imageURL
                preview.style.width = '36px'
                preview.style.height = '36px'
                preview.style.objectFit = 'cover'
                preview.style.borderRadius = '10px'

                const info = document.createElement('div')
                info.innerHTML =
                  '<strong>' + displayLayerName(randomTrait.layer) + '</strong><br>' +
                  randomTrait.trait + ' (' + randomTrait.rarity + '%)'

                traitRow.appendChild(preview)
                traitRow.appendChild(info)
                traitDetailsBox.appendChild(traitRow)
              })

              nftBox.dataset.oneofone = exportRecord.oneOfOne ? 'true' : 'false'


              nftBox.dataset.exportIndex = generatedRandomNFTsForExport.indexOf(exportRecord)
              nftBox.dataset.rank = exportRecord.rank || 999999
              nftBox.dataset.rarity = exportRecord.collectionRarity || 0
              nftBox.dataset.oneofone = exportRecord.oneOfOne ? 'true' : 'false'
              nftBox.dataset.kept = exportRecord.kept ? 'true' : 'false'
              nftBox.dataset.review = 'needs-review'
              nftBox.dataset.combo = exportRecord.comboCount || 0

              nftBox.dataset.search = (
                exportRecord.name + ' ' +
                exportRecord.rarityTier + ' ' +
                exportRecord.rank + ' ' +
                exportRecord.comboCount + ' ' +
                selectedItems.map(function(i) {
                  return i.layer + ' ' + i.trait
                }).join(' ')
              ).toLowerCase()

              nftGrid.appendChild(nftBox)

            })

            if (statusBox) {
              statusBox.innerHTML = 'Generation complete: ' + total + ' NFTs created.'
            }


            function refreshNFTGridFilters() {
              const cards = Array.from(nftGrid.children)

              const query = (searchInput.value || '').toLowerCase().trim()
              const mode = sortSelect.value

              cards.forEach(function(card) {
                let visible = true

                if (query && !card.dataset.search.includes(query)) {
                  visible = false
                }

                if (mode === '1/1s Only' && card.dataset.oneofone !== 'true') {
                  visible = false
                }

                if (mode === 'Duplicates Only' && parseInt(card.dataset.combo || '0', 10) <= 1) {
                  visible = false
                }

                if (mode === 'Kept' && card.dataset.kept !== 'true') {
                  visible = false
                }

                if (mode === 'Discarded' && card.dataset.kept !== 'false') {
                  visible = false
                }

                if (mode === 'Approved' && card.dataset.review !== 'approved') {
                  visible = false
                }

                if (mode === 'Needs Review' && card.dataset.review !== 'needs-review') {
                  visible = false
                }

                if (mode === 'Flagged Problem' && card.dataset.review !== 'flagged') {
                  visible = false
                }

                card.style.display = visible ? '' : 'none'
              })

              let visibleCards = cards.filter(function(card) {
                return card.style.display !== 'none'
              })

              visibleCards.sort(function(a, b) {

                if (mode === 'Highest Rank') {
                  return parseInt(a.dataset.rank, 10) - parseInt(b.dataset.rank, 10)
                }

                if (mode === 'Lowest Rank') {
                  return parseInt(b.dataset.rank, 10) - parseInt(a.dataset.rank, 10)
                }

                if (mode === 'Rarest') {
                  return parseFloat(a.dataset.rarity) - parseFloat(b.dataset.rarity)
                }

                if (mode === 'Most Common') {
                  return parseFloat(b.dataset.rarity) - parseFloat(a.dataset.rarity)
                }

                return parseInt(a.dataset.rank, 10) - parseInt(b.dataset.rank, 10)
              })

              visibleCards.forEach(function(card) {
                nftGrid.appendChild(card)
              })
            }
            keepOneBtn.onclick = function() {
              Array.from(nftGrid.children).forEach(function(card, i) {

                if (card.dataset.oneofone === 'true') {
                  card.dataset.kept = 'true'
                  card.style.opacity = '1'

                  generatedRandomNFTsForExport[i].kept = true

                  const status = card.querySelector('div')
                  if (status && status.innerHTML.includes('Status:')) {
                    status.innerHTML = 'Status: <span style="color:#22c55e;">Kept</span>'
                  }
                }
              })

              refreshNFTGridFilters()
            }

            discardDuplicateBtn.onclick = function() {
              let discarded = 0

              Array.from(nftGrid.children).forEach(function(card) {
                const isVisible = card.style.display !== 'none'
                const isDuplicateCopy = card.dataset.duplicatecopy === 'true'

                if (!isVisible || !isDuplicateCopy) return

                card.dataset.kept = 'false'
                card.style.opacity = '0.45'

                const exportIndex = parseInt(card.dataset.exportIndex || '-1', 10)

                if (generatedRandomNFTsForExport[exportIndex]) {
                  generatedRandomNFTsForExport[exportIndex].kept = false
                }

                const statusBlocks = card.querySelectorAll('div')
                statusBlocks.forEach(function(block) {
                  if (block.innerHTML && block.innerHTML.includes('Status:')) {
                    block.innerHTML = 'Status: <span style="color:#ef4444;">Discarded</span>'
                  }
                })

                discarded++
              })

              const status = document.getElementById('generationStatus')
              if (status) {
                status.style.display = 'block'
                status.innerHTML = 'Discarded duplicate copies: ' + discarded
              }

              refreshNFTGridFilters()
            }

            restoreBtn.onclick = function() {
              Array.from(nftGrid.children).forEach(function(card, i) {

                card.dataset.kept = 'true'
                card.style.opacity = '1'

                generatedRandomNFTsForExport[i].kept = true

                const status = card.querySelector('div')
                if (status && status.innerHTML.includes('Status:')) {
                  status.innerHTML = 'Status: <span style="color:#22c55e;">Kept</span>'
                }
              })

              refreshNFTGridFilters()
            }

            searchInput.addEventListener('input', refreshNFTGridFilters)
            sortSelect.addEventListener('change', refreshNFTGridFilters)

            console.log('FINAL EXACT 1/1 GENERATOR:', {
              requestedOneOfOnes: requestedOneOfOnes,
              createdOneOfOnes: createdOneOfOnes,
              generatedRandomNFTsForExport: generatedRandomNFTsForExport
            })
          }



        function removeGeneratedNFTs() {
          const output = document.getElementById('generatedRandomNFTs')
          const status = document.getElementById('generationStatus')

          if (!generatedRandomNFTsForExport || !generatedRandomNFTsForExport.length) {
            alert('No generated NFTs to remove.')
            return
          }

          if (!confirm('Remove all generated NFTs from the page?')) return

          generatedRandomNFTsForExport = []

          if (output) {
            output.innerHTML = ''
          }

          if (status) {
            status.style.display = 'none'
            status.innerHTML = 'Ready to generate.'
          }
        }

        async function generateCollection() {
          const formData = new FormData()

          formData.append('mode', currentMode)
          formData.append('collectionName', document.getElementById('collectionName').value)
          formData.append('nftBaseName', document.getElementById('nftBaseName').value)
          formData.append('supplyAmount', document.getElementById('supplyAmount').value)
          formData.append('sharedTraits', JSON.stringify(sharedTraits))
          formData.append('perImageTraits', JSON.stringify(perImageTraits))

          if (currentMode === 'simple') {
            const simpleFile = document.getElementById('simpleArtworkInput').files[0]
            if (!simpleFile) {
              alert('Please select artwork first.')
              return
            }
            formData.append('simpleArtwork', simpleFile)
          }

          if (currentMode === 'multi') {
            const multiFiles = document.getElementById('multiArtworkInput').files
            if (!multiFiles || multiFiles.length === 0) {
              alert('Please select images first.')
              return
            }

            const names = []
            const descriptions = []

            for (let i = 0; i < multiFiles.length; i++) {
              const number = i + 1
              formData.append('multiArtwork', multiFiles[i])
              names.push(document.getElementById('multiName' + number).value)
              descriptions.push(document.getElementById('multiDescription' + number).value)
            }

            formData.append('multiNames', JSON.stringify(names))
            formData.append('multiDescriptions', JSON.stringify(descriptions))
          }

          if (currentMode === 'advanced') {
            alert('Advanced Randomizer ZIP export is coming next.')
            return
          }

          const response = await fetch('/nft-creator/generate-zip', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            alert('ZIP generation failed.')
            return
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)

          const a = document.createElement('a')
          a.href = url
          const enteredCollectionName =
            document.getElementById('collectionName').value || 'rare-ink-nft-collection'

          const safeDownloadName =
            enteredCollectionName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'rare-ink-nft-collection'

          a.download = safeDownloadName + '-nft-export.zip'
          document.body.appendChild(a)
          a.click()
          a.remove()

          window.URL.revokeObjectURL(url)
        }
      





























/* === FINAL SAVED TRAIT SET SYSTEM === */
(function () {
  const DB_NAME = 'RareInkTraitSetDatabase'
  const DB_VERSION = 1
  const STORE_NAME = 'traitSets'

  function openTraitDB() {
    return new Promise(function(resolve, reject) {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = function(event) {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      request.onsuccess = function(event) {
        resolve(event.target.result)
      }

      request.onerror = function() {
        reject(request.error)
      }
    })
  }

  async function getAllTraitSets() {
    const db = await openTraitDB()

    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = function() {
        const sets = request.result || []
        sets.sort(function(a, b) {
          return (a.createdAt || 0) - (b.createdAt || 0)
        })
        resolve(sets)
      }

      request.onerror = function() {
        reject(request.error)
      }
    })
  }

  async function saveTraitSetRecord(record) {
    const db = await openTraitDB()

    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(record)

      request.onsuccess = function() {
        resolve(request.result)
      }

      request.onerror = function() {
        reject(request.error)
      }
    })
  }

  async function deleteTraitSetRecord(id) {
    const db = await openTraitDB()

    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = function() {
        resolve()
      }

      request.onerror = function() {
        reject(request.error)
      }
    })
  }

  function fileToDataURLFromImageURL(imageURL) {
    return fetch(imageURL)
      .then(function(r) { return r.blob() })
      .then(function(blob) {
        return new Promise(function(resolve) {
          const reader = new FileReader()
          reader.onload = function() { resolve(reader.result) }
          reader.readAsDataURL(blob)
        })
      })
  }

  window.refreshSavedTraitDropdownFinal = async function () {
    const select = document.getElementById('savedTraitSetSelect')
    if (!select) return

    const current = select.value
    const sets = await getAllTraitSets()

    select.innerHTML = ''

    const first = document.createElement('option')
    first.value = ''
    first.textContent = sets.length ? 'Choose saved trait set' : 'No saved trait sets'
    select.appendChild(first)

    sets.forEach(function(set, index) {
      const opt = document.createElement('option')
      opt.value = String(set.id)
      opt.textContent = (index + 1) + '. ' + set.name
      select.appendChild(opt)
    })

    if (current && Array.from(select.options).some(function(o) { return o.value === current })) {
      select.value = current
    }
  }

  window.drawSavedTraitPickerFinal = async function () {
    const select = document.getElementById('savedTraitSetSelect')
    const picker = document.getElementById('savedTraitPickerBox')
    if (!select || !picker) return

    const id = parseInt(select.value, 10)
    const sets = await getAllTraitSets()
    const set = sets.find(function(item) { return item.id === id })

    if (!set) {
      picker.innerHTML = '<div style="color:#9ca3af;">Choose a saved trait set.</div>'
      return
    }

    let html =
      '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">' +
      '<button type="button" onclick="selectAllSavedTraitsFinal()" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:8px;">Select All</button>' +
      '<button type="button" onclick="unselectAllSavedTraitsFinal()" style="background:#374151; color:white; border:none; padding:8px 12px; border-radius:8px;">Unselect All</button>' +
      '</div>'

    const grouped = {}
    ;(set.traits || []).forEach(function(item, index) {
      item.layer = displayLayerName(item.layer)
      if (!grouped[item.layer]) grouped[item.layer] = []
      grouped[item.layer].push({ item: item, index: index })
    })

    Object.keys(grouped).forEach(function(layer) {
      html += '<div style="color:#93c5fd; font-weight:bold; margin-top:12px;">' + layer + '</div>'
      html += '<div style="margin-bottom:14px; background:#0f172a; padding:10px; border-radius:10px;">'

      grouped[layer].forEach(function(entry) {
        html += '<label style="display:block; color:#d1d5db; margin-top:8px;">'
        html += '<input type="checkbox" class="savedTraitPick" value="' + entry.index + '"> '
        html += entry.item.trait + ' (' + entry.item.rarity + '%)'
        html += '</label>'
      })

      html += '</div>'
    })

    picker.innerHTML = html
  }

  window.toggleSavedTraitPickerBox = function () {
    const picker = document.getElementById('savedTraitPickerBox')
    if (!picker) return
    picker.style.display = picker.style.display === 'none' ? '' : 'none'
  }

  window.selectAllSavedTraitsFinal = function () {
    document.querySelectorAll('.savedTraitPick').forEach(function(cb) { cb.checked = true })
  }

  window.unselectAllSavedTraitsFinal = function () {
    document.querySelectorAll('.savedTraitPick').forEach(function(cb) { cb.checked = false })
  }

  window.saveCurrentTraitSetClean = async function () {
    if (!randomizerTraits.length) {
      alert('Please add traits before saving.')
      return
    }

    let name = prompt('Name this saved trait set:')
    if (!name || !name.trim()) return
    name = name.trim()

    const sets = await getAllTraitSets()
    const existing = sets.find(function(set) {
      return set.name.toLowerCase() === name.toLowerCase()
    })

    if (existing && !confirm('Replace saved set "' + name + '"?')) {
      return
    }

    const packed = []

    for (let i = 0; i < randomizerTraits.length; i++) {
      const item = randomizerTraits[i]
      let imageURL = item.imageURL

      try {
        imageURL = await fileToDataURLFromImageURL(item.imageURL)
      } catch (e) {}

      packed.push({
        layer: displayLayerName(item.layer),
        trait: item.trait,
        rarity: item.rarity,
        imageName: item.imageName || item.fileName || '',
        fileName: item.fileName || item.imageName || '',
        imageURL: imageURL
      })
    }

    const record = {
      name: name,
      traits: packed,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now()
    }

    if (existing) record.id = existing.id

    const savedId = await saveTraitSetRecord(record)

    await window.refreshSavedTraitDropdownFinal()

    const select = document.getElementById('savedTraitSetSelect')
    if (select) select.value = String(savedId)

    await window.drawSavedTraitPickerFinal()

    alert('Saved trait set: ' + name)
  }

  window.addCheckedTraitsOnly = async function () {
    const select = document.getElementById('savedTraitSetSelect')
    const sets = await getAllTraitSets()
    const id = parseInt(select.value, 10)
    const set = sets.find(function(item) { return item.id === id })

    if (!set) {
      alert('Choose a saved trait set first.')
      return
    }

    const checked = Array.from(document.querySelectorAll('.savedTraitPick:checked'))

    if (!checked.length) {
      alert('Check at least one trait or use Select All.')
      return
    }

    checked.forEach(function(cb) {
      const item = set.traits[parseInt(cb.value, 10)]
      if (!item) return

      randomizerTraits.push({
        layer: displayLayerName(item.layer),
        trait: item.trait,
        rarity: item.rarity,
        imageName: item.imageName || item.fileName || '',
        fileName: item.fileName || item.imageName || '',
        imageURL: item.imageURL
      })
    })

    renderRandomTraits()
  }

  window.replaceWithCheckedTraitsOnly = async function () {
    randomizerTraits = []
    await window.addCheckedTraitsOnly()
  }

  window.deleteSavedTraitSetClean = async function () {
    const select = document.getElementById('savedTraitSetSelect')
    const sets = await getAllTraitSets()
    const id = parseInt(select.value, 10)
    const set = sets.find(function(item) { return item.id === id })

    if (!set) {
      alert('Choose a saved trait set first.')
      return
    }

    if (!confirm('Delete "' + set.name + '"?')) return

    await deleteTraitSetRecord(id)
    await window.refreshSavedTraitDropdownFinal()
    await window.drawSavedTraitPickerFinal()
  }

  setInterval(function () {
    const select = document.getElementById('savedTraitSetSelect')
    if (select && !select.dataset.finalSaveReady) {
      select.dataset.finalSaveReady = 'true'
      select.addEventListener('change', function() {
        window.drawSavedTraitPickerFinal()
      })
      window.refreshSavedTraitDropdownFinal()
      window.drawSavedTraitPickerFinal()
    }
  }, 700)
})()
/* === END FINAL SAVED TRAIT SET SYSTEM === */


</script>

    </body>
  </html>
  `)
})


app.post('/nft-creator/generate-zip', upload.fields([
  { name: 'simpleArtwork', maxCount: 1 },
  { name: 'multiArtwork', maxCount: 1000 }
]), async (req, res) => {
  const path = require('path');

  try {
    const mode = req.body.mode || 'simple';
    const collectionName = req.body.collectionName || 'NFT Collection';
    const nftBaseName = req.body.nftBaseName || 'NFT';
    const supplyAmount = parseInt(req.body.supplyAmount || '1', 10);
    const sharedTraits = JSON.parse(req.body.sharedTraits || '[]');
    const perImageTraits = JSON.parse(req.body.perImageTraits || '{}');

    const exportId = Date.now().toString();
    const exportRoot = path.join(__dirname, 'nft-exports', exportId);
    const imagesDir = path.join(exportRoot, 'images');
    const metadataDir = path.join(exportRoot, 'metadata');

    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(metadataDir, { recursive: true });

    function extensionFromFile(file) {
      const original = file.originalname || '';
      const ext = path.extname(original).toLowerCase();
      return ext || '.jpg';
    }

    if (mode === 'simple') {
      const file = req.files.simpleArtwork && req.files.simpleArtwork[0];

      if (!file) {
        return res.status(400).send('No simple artwork uploaded.');
      }

      const total = Math.max(1, supplyAmount);
      const ext = extensionFromFile(file);

      for (let i = 1; i <= total; i++) {
        const imageName = `${i}${ext}`;
        fs.copyFileSync(file.path, path.join(imagesDir, imageName));

        const metadata = {
          name: `${nftBaseName} #${i}`,
          description: collectionName,
          image: imageName,
          attributes: [
            ...sharedTraits,
            {
              trait_type: 'Edition',
              value: `${i} of ${total}`
            }
          ]
        };

        fs.writeFileSync(
          path.join(metadataDir, `${i}.json`),
          JSON.stringify(metadata, null, 2)
        );
      }
    }

    if (mode === 'multi') {
      const files = req.files.multiArtwork || [];
      const names = JSON.parse(req.body.multiNames || '[]');
      const descriptions = JSON.parse(req.body.multiDescriptions || '[]');

      if (files.length === 0) {
        return res.status(400).send('No multi-image artwork uploaded.');
      }

      files.forEach((file, index) => {
        const number = index + 1;
        const ext = extensionFromFile(file);
        const imageName = `${number}${ext}`;

        fs.copyFileSync(file.path, path.join(imagesDir, imageName));

        const metadata = {
          name: names[index] || `${nftBaseName} #${number}`,
          description: descriptions[index] || collectionName,
          image: imageName,
          attributes: [
            ...sharedTraits,
            ...(perImageTraits[number] || [])
          ]
        };

        fs.writeFileSync(
          path.join(metadataDir, `${number}.json`),
          JSON.stringify(metadata, null, 2)
        );
      });
    }

    const manifest = {
      created_by: 'Rare Ink Studios NFT Creator',
      collection_name: collectionName,
      mode: mode,
      nft_base_name: nftBaseName,
      exported_at: new Date().toISOString(),
      folders: {
        images: 'images/',
        metadata: 'metadata/'
      },
      notes: 'This ZIP contains NFT images and matching metadata JSON files.'
    };

    fs.writeFileSync(
      path.join(exportRoot, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    fs.writeFileSync(
      path.join(exportRoot, 'README.txt'),
      'Rare Ink Studios NFT Creator Export\n\n' +
      'Collection: ' + collectionName + '\n' +
      'Mode: ' + mode + '\n\n' +
      'This package contains:\n' +
      '- images folder\n' +
      '- metadata folder\n' +
      '- manifest.json\n\n' +
      'Each metadata JSON file should match the image with the same number.\n'
    );

    const zipPath = path.join(__dirname, 'nft-exports', `${exportId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      
      const safeCollectionName = collectionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'rare-ink-nft-collection';

      res.download(zipPath, safeCollectionName + '-nft-export.zip');

    });

    archive.on('error', err => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(imagesDir, 'images');
    archive.directory(metadataDir, 'metadata');

    archive.file(
      path.join(exportRoot, 'manifest.json'),
      { name: 'manifest.json' }
    );

    archive.file(
      path.join(exportRoot, 'README.txt'),
      { name: 'README.txt' }
    );
    archive.finalize();

  } catch (error) {
    console.error(error);
    res.status(500).send('NFT ZIP generation failed.');
  }
});

app.get('/trash', (req, res) => {
  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  const trashedMemories = history
    .filter(memory => memory.deleted === true)
    .sort((a, b) => new Date(b.deletedAt || b.timestamp) - new Date(a.deletedAt || a.timestamp));

  res.send(`
  <html>
    <head>
      <title>Recycle Bin</title>
    </head>

    <body style="font-family:Arial; background:#f5f1ea; margin:0; padding:20px;">

      <div style="max-width:950px; margin:auto;">

        <a href="/" style="
          position:fixed;
          top:24px;
          left:24px;
          color:#111;
          text-decoration:none;
          font-size:72px;
          font-weight:900;
          line-height:1;
          z-index:999;
          text-shadow:
            0 0 6px rgba(255,255,255,0.85),
            0 0 18px rgba(255,255,255,0.45);
          -webkit-text-stroke:1px rgba(255,255,255,0.18);
          font-family:Arial Black, Arial, sans-serif;
        ">⮜</a>

        <h1 style="text-align:center; font-size:42px; margin-bottom:5px;">Recycle Bin 🗑️</h1>

        <p style="text-align:center; color:#666; margin-top:0; margin-bottom:30px;">
          Deleted memories are stored here before permanent removal.
        </p>

        ${trashedMemories.length === 0 ? `
          <div style="background:white; padding:28px; border-radius:22px; box-shadow:0 8px 20px rgba(0,0,0,0.12); text-align:center;">
            <h2>Trash is empty</h2>
            <p style="color:gray;">No deleted memories right now.</p>
          </div>
        ` : ''}

        <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:20px;">
          ${trashedMemories.map(memory => `
            <div style="background:white; padding:20px; border-radius:22px; box-shadow:0 8px 20px rgba(0,0,0,0.12);">

              ${memory.photoPath ? `
                <img src="${memory.photoPath}" style="width:100%; height:260px; object-fit:cover; border-radius:14px; background:#111;" />
              ` : ''}

              <h2 style="margin-bottom:6px;">${memory.cidText || 'Untitled Memory'}</h2>

              <p style="color:#555;">${memory.metadataText || ''}</p>

              ${memory.storyText ? `
                <p style="color:#777;">
                  ${memory.storyText.substring(0, 120)}...
                </p>
              ` : ''}

              <div style="font-size:13px; color:gray; margin-bottom:16px;">
                Deleted: ${memory.deletedAt ? new Date(memory.deletedAt).toLocaleString() : 'Unknown'}
              </div>

              <div style="display:flex; gap:10px; flex-wrap:wrap;">

                <form method="POST" action="/restore" style="margin:0;">
                  <input type="hidden" name="id" value="${memory.id}" />
                  <button type="submit" style="padding:10px 14px; background:#16a34a; color:white; border:none; border-radius:10px; cursor:pointer;">
                    Restore
                  </button>
                </form>

                <form method="POST" action="/delete-forever" style="margin:0;" onsubmit="return confirm('Permanently delete this memory forever? This cannot be undone.');">
                  <input type="hidden" name="id" value="${memory.id}" />
                  <button type="submit" style="padding:10px 14px; background:#dc2626; color:white; border:none; border-radius:10px; cursor:pointer;">
                    Delete Forever
                  </button>
                </form>

              </div>
            </div>
          `).join('')}
        </div>

      </div>

    </body>
  </html>
  `);
});

app.post('/restore', (req, res) => {
  const { id } = req.body;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history = history.map(memory => {
    if (memory.id === id) {
      const restoredMemory = { ...memory };
      delete restoredMemory.deleted;
      delete restoredMemory.deletedAt;
      restoredMemory.restoredAt = new Date().toISOString();
      return restoredMemory;
    }

    return memory;
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/trash');
});

app.post('/delete-forever', (req, res) => {
  const { id } = req.body;

  let history = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history = history.filter(memory => memory.id !== id);

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  res.redirect('/trash');
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


app.get('/journal-search', (req, res) => {

  const journalPath = path.join(__dirname, 'journal.json');

  let journal = [];

  if (fs.existsSync(journalPath)) {
    journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  }

  const search = (req.query.search || '').toLowerCase();

  if (search) {
    journal = journal.filter(j =>
      (j.entry || '').toLowerCase().includes(search) ||
      (j.tag || '').toLowerCase().includes(search)
    );
  }

  res.send(`
  <html>
    <head>
      <title>Journal Search</title>
    </head>

    <body style="font-family: Arial; background:#f5f1ea; margin:0; padding:20px;">

<details style="position:fixed; top:20px; left:20px; z-index:1000;">
  <summary style="list-style:none; cursor:pointer; background:white; color:black; border:1px solid #ddd; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); font-size:24px;">
    ☰
  </summary>

  <div style="margin-top:8px; background:white; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.18); padding:10px; width:190px;">
    <a href="/?create=1" style="display:block; padding:10px; color:black; text-decoration:none;">Create Memory</a>
    <a href="/?view=favorites" style="display:block; padding:10px; color:black; text-decoration:none;">Favorites 💙</a>
    <a href="/?view=search" style="display:block; padding:10px; color:black; text-decoration:none;">Search Memories 🔎</a>
    <a href="/?sort=new" style="display:block; padding:10px; color:black; text-decoration:none;">Newest First</a>
    <a href="/?sort=old" style="display:block; padding:10px; color:black; text-decoration:none;">Oldest First</a>
    <a href="/" style="display:block; padding:10px; color:black; text-decoration:none;">Show All</a>
    <a href="/?view=gallery" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery View</a>
    <a href="/?view=gallery-search" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery Search 🔎</a>
    <a href="/journal" style="display:block; padding:10px; color:black; text-decoration:none;">Journal</a>
    <a href="/journal-search" style="display:block; padding:10px; color:black; text-decoration:none;">Journal Search 🔎</a>
    <a href="/trash" style="display:block; padding:10px; color:black; text-decoration:none;">Recycle Bin 🗑️</a>
    <a href="/feedback" style="display:block; padding:10px; color:black; text-decoration:none;">Beta Feedback</a>
  </div>
</details>


      <div style="max-width:900px; margin:auto;">

        <h1 style="font-size:48px; margin-top:30px;">
          Journal Search 🔎
        </h1>

        <form method="GET" action="/journal-search" style="display:flex; gap:10px; margin-bottom:30px;">

          <input
            type="text"
            name="search"
            value="${req.query.search || ''}"
            placeholder="Search stories or tags..."
            style="
              flex:1;
              padding:16px;
              border-radius:20px;
              border:1px solid #ddd;
              font-size:16px;
            "
          />

          <button type="submit" style="
            padding:16px 22px;
            border:none;
            border-radius:20px;
            background:black;
            color:white;
            cursor:pointer;
          ">
            Search
          </button>

        </form>

        ${[...journal].reverse().map(j => `
          <div style="
            background:white;
            padding:20px;
            border-radius:18px;
            margin-bottom:20px;
            box-shadow:0 4px 14px rgba(0,0,0,0.08);
          ">
            <p style="white-space:pre-wrap;">${j.entry}</p>

            ${j.tag ? `
              <div style="margin-top:12px; color:#666;">
                Tag: ${j.tag}
              </div>
            ` : ''}

            <small>
              ${new Date(j.timestamp).toLocaleString()}
            </small>
          </div>
        `).join('')}

      </div>
    </body>
  </html>
  `);
});


app.get('/journal', (req, res) => {
  const journalPath = path.join(__dirname, 'journal.json');

  let journal = [];

  if (fs.existsSync(journalPath)) {
    journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  }

  const journalSearch = (req.query.search || '').toLowerCase();

  if (journalSearch) {
    journal = journal.filter(j =>
      (j.entry || '').toLowerCase().includes(journalSearch) ||
      (j.tag || '').toLowerCase().includes(journalSearch)
    );
  }

  res.send(`
  <html>
    <head>
      <title>Journal</title>
    </head>
    <body style="font-family: Arial; background:#f5f1ea; margin:0; padding:20px;">
<details style="position:fixed; top:20px; left:20px; z-index:1000;">
  <summary style="list-style:none; cursor:pointer; background:white; color:black; border:1px solid #ddd; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); font-size:24px;">
    ☰
  </summary>

  <div style="margin-top:8px; background:white; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.18); padding:10px; width:190px;">
    <a href="/?create=1" style="display:block; padding:10px; color:black; text-decoration:none;">Create Memory</a>
    <a href="/?view=favorites" style="display:block; padding:10px; color:black; text-decoration:none;">Favorites 💙</a>
    <a href="/?view=search" style="display:block; padding:10px; color:black; text-decoration:none;">Search Memories 🔎</a>
    <a href="/?sort=new" style="display:block; padding:10px; color:black; text-decoration:none;">Newest First</a>
    <a href="/?sort=old" style="display:block; padding:10px; color:black; text-decoration:none;">Oldest First</a>
    <a href="/" style="display:block; padding:10px; color:black; text-decoration:none;">Show All</a>
    <a href="/?view=gallery" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery View</a>
    <a href="/?view=gallery-search" style="display:block; padding:10px; color:black; text-decoration:none;">Gallery Search 🔎</a>
    <a href="/journal" style="display:block; padding:10px; color:black; text-decoration:none;">Journal</a>
    <a href="/journal-search" style="display:block; padding:10px; color:black; text-decoration:none;">Journal Search 🔎</a>
    <a href="/feedback" style="display:block; padding:10px; color:black; text-decoration:none;">Beta Feedback</a>
  </div>
</details>
      <div style="max-width:760px; margin:auto;">
        <h1 style="text-align:center; font-size:42px; margin-bottom:5px;">Journal</h1>
        <p style="text-align:center; color:#666; margin-top:0; margin-bottom:25px;">
          A private place for written memories, life stories, and reflections.
        </p>

        <div style="background:white; padding:18px; border-radius:16px; box-shadow:0 3px 10px rgba(0,0,0,0.10); margin-bottom:25px;">
          <form method="POST" action="/journal">
            <textarea name="entry" placeholder="Write your story..." rows="10" style="width:auto; min-width:220px; padding:12px; border:1px solid #ddd; border-radius:10px; box-sizing:border-box; font-size:16px;"></textarea>

            <input
              name="tag"
              placeholder="Tag this journal entry, example: family, childhood, lesson..."
              style="width:auto; min-width:220px; padding:12px; border:1px solid #ddd; border-radius:10px; box-sizing:border-box; font-size:16px; margin-top:12px;"
            />

            <button type="submit" style="margin-top:12px; padding:12px; width:auto; min-width:220px; background:black; color:white; border:none; border-radius:10px; font-size:16px; cursor:pointer;">Save Entry</button>
          </form>
        </div>

        <hr/>

        <h2>Saved Journal Entries</h2>

        ${[...journal].reverse().map((j) => `
          <div style="background:white; padding:20px; border-radius:16px; margin-bottom:18px; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
            <p style="white-space:pre-wrap;">${j.entry}</p>
            <small>${new Date(j.timestamp).toLocaleString()}</small>

            <div style="display:flex; gap:10px; margin-top:10px;">
              <a href="/journal-edit/${j.id}" style="background:white; color:black; border:1px solid #ddd; padding:6px 10px; border-radius:8px; text-decoration:none;">
                Edit
              </a>

              <form method="POST" action="/journal-delete" style="margin:0;">
                <input type="hidden" name="id" value="${j.id}" />
                <button type="submit" style="background:white; color:red; border:1px solid red; padding:6px 10px; border-radius:8px; cursor:pointer;">
                  Delete
                </button>
              </form>
            </div>
          </div>
        `).join('')}

      </div>
    </body>
  </html>
  `);
});
app.post('/journal', (req, res) => {
  const entry = req.body.entry;
  const tag = req.body.tag || '';

  const journalPath = path.join(__dirname, 'journal.json');

  let journal = [];

  if (fs.existsSync(journalPath)) {
    journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  }

  journal.push({
    id: generateId(),
    entry,
    tag,
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  res.redirect('/journal');
});
app.post('/journal-delete', (req, res) => {
  const { id } = req.body;
  const journalPath = path.join(__dirname, 'journal.json');

  if (!fs.existsSync(journalPath)) {
    return res.redirect('/journal');
  }

  let journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  journal = journal.filter(j => j.id !== id);

  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  res.redirect('/journal');
});

app.get('/journal-edit/:id', (req, res) => {
  const { id } = req.params;
  const journalPath = path.join(__dirname, 'journal.json');

  if (!fs.existsSync(journalPath)) {
    return res.send('No journal found');
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  const entry = journal.find(j => j.id === id);

  if (!entry) {
    return res.send('Journal entry not found');
  }

  res.send(`
    <html>
      <body style="font-family:Arial; background:#f5f1ea; padding:20px;">
        <div style="max-width:700px; margin:auto;">
          <h1>Edit Journal Entry</h1>

          <form method="POST" action="/journal-edit/${entry.id}" style="background:white; padding:20px; border-radius:16px;">
            <textarea name="entry" rows="10" style="width:100%; padding:12px;">${entry.entry || ''}</textarea>

            <input name="tag" value="${entry.tag || ''}" placeholder="Tag" style="width:100%; padding:12px; margin-top:12px;" />

            <button type="submit" style="width:100%; padding:12px; margin-top:12px; background:black; color:white; border:none; border-radius:10px;">
              Save Changes
            </button>
          </form>

          <br/>
          <a href="/journal">← Back to Journal</a>
        </div>
      </body>
    </html>
  `);
});

app.post('/journal-edit/:id', (req, res) => {
  const { id } = req.params;
  const { entry, tag } = req.body;
  const journalPath = path.join(__dirname, 'journal.json');

  if (!fs.existsSync(journalPath)) {
    return res.redirect('/journal');
  }

  let journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  journal = journal.map(j => {
    if (j.id === id) {
      return {
        ...j,
        entry,
        tag: tag || '',
        updatedAt: new Date().toISOString()
      };
    }

    return j;
  });

  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  res.redirect('/journal');
});
