const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const LINE_CLIENT_ID = process.env.LINE_CLIENT_ID;
const LINE_REDIRECT_URI = process.env.LINE_REDIRECT_URI;
const LINE_CLIENT_SECRET = process.env.LINE_CLIENT_SECRET;

// Firebase Admin SDKの初期化
const serviceAccount = require("./sandbox-project-3e3a1-firebase-adminsdk-fndgt-47448c520b.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
const port = 3000;

app.get("/auth/line", (req, res) => {
  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${LINE_REDIRECT_URI}&state=12345&scope=profile%20openid`;
  res.redirect(lineAuthUrl);
});

app.get("/auth/line/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // LINEトークンを取得
    const tokenResponse = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // LINEユーザー情報を取得
    const profileResponse = await axios.get("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const lineUserId = profileResponse.data.userId;

    // Firebaseカスタムトークンを作成
    const customToken = await admin.auth().createCustomToken(lineUserId);

    res.send({ firebaseToken: customToken });
  } catch (error) {
    console.error("Error during LINE login:", error);
    res.status(500).send("Authentication failed");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
