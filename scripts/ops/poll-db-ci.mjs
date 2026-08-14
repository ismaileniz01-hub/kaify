import https from "node:https";

const rid = process.argv[2];
if (!rid) {
  console.error("usage: node scripts/ops/poll-db-ci.mjs <run_id>");
  process.exit(2);
}

function get(path) {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://api.github.com${path}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "kaify-w2",
          },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(d.replace(/^\uFEFF/, "")));
            } catch (e) {
              reject(e);
            }
          });
        },
      )
      .on("error", reject);
  });
}

const interesting =
  /Start local|Reset database|Export local|Run database|Commit failure|Publish test/;

for (let i = 1; i <= 48; i++) {
  const j = await get(
    `/repos/ismaileniz01-hub/kaify/actions/runs/${rid}/jobs`,
  );
  const db = (j.jobs || []).find((x) => x.name.includes("Supabase"));
  if (!db) {
    console.log("poll", i, "NO_DB");
  } else {
    console.log("poll", i, db.status, db.conclusion);
    for (const st of db.steps || []) {
      if (interesting.test(st.name) || st.conclusion === "failure") {
        console.log(" ", st.number, st.name, st.conclusion || st.status);
      }
    }
    if (db.status === "completed") {
      process.exit(db.conclusion === "success" ? 0 : 1);
    }
  }
  await new Promise((r) => setTimeout(r, 20000));
}
console.log("timeout");
process.exit(2);
