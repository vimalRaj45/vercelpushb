import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";
import webpush from "web-push";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ⚡ NeonDB PostgreSQL connection
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_ZS1hyJvEkRL9@ep-holy-pond-adhxy251-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

// 🔑 VAPID keys and email
const publicVapidKey =
  "BPrZcFrQ6-F-5Rc34982D_-qrpIXiHLoYL3piFJcdh5ub5yrqFWicEZ2a2vyuxYeKy8VZl_KiD3vMOiFLmTtAnE";
const privateVapidKey =
  "N2Gq5IqGWH2mRC419hfwCD-F7eMkVuf2PkUW2NlhvS8";

webpush.setVapidDetails(
  "mailto:vimalraj5207@gmail.com", // your email
  publicVapidKey,
  privateVapidKey
);

// 📌 Subscribe endpoint
app.post("/subscribe", async (req, res) => {
  const subscription = req.body;
  try {
    await pool.query("INSERT INTO subscriptions (sub) VALUES ($1)", [
      JSON.stringify(subscription),
    ]);
    res.status(201).json({ message: "Subscription saved" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/send", async (req, res) => {
  const { title, message } = req.body;
  try {
    const result = await pool.query("SELECT sub FROM subscriptions");
    result.rows.forEach(({ sub }) => {
      const subscription = JSON.parse(sub);
      webpush
        .sendNotification(subscription, JSON.stringify({ title, message }))
        .catch((err) => console.error("Push error:", err));
    });

    await pool.query(
      "INSERT INTO notifications (title, message) VALUES ($1, $2)",
      [title, message]
    );

    res.json({ message: "Notifications sent and saved." });
  } catch (err) {
    console.error("Send Error:", err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});



app.get("/notifications", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notifications ORDER BY sent_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});



app.listen(5000, () => {
  console.log("🚀 Backend running at http://localhost:5000");
  console.log("🔑 Public VAPID Key:", publicVapidKey);
});
