const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const usersPath = "./data/users.json";
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_ACCESS_SECRET = "ACCESS_SECRET_ABC123";
const JWT_REFRESH_SECRET = "REFRESH_SECRET_XYZ789";

// read & write users
const loadUsers = () => JSON.parse(fs.readFileSync(usersPath, "utf8"));
const saveUsers = (data) => fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));

// access token
const createAccess = (email) =>
    jwt.sign({ email }, JWT_ACCESS_SECRET, { expiresIn: "15m" });

// refresh token
const createRefresh = (email) =>
    jwt.sign({ email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    const users = loadUsers();
    if (users[email]) return res.status(400).json({ error: "ایمیل تکراری!" });

    const hash = await bcrypt.hash(password, 10);

    users[email] = {
        name,
        email,
        passwordHash: hash,
        provider: "local",
        refreshHash: null
    };

    saveUsers(users);

    res.json({ message: "ثبت‌نام موفق" });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    const users = loadUsers();
    const user = users[email];

    if (!user) return res.status(400).json({ error: "کاربر نیست" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "رمز اشتباه" });

    const access = createAccess(email);
    const refresh = createRefresh(email);

    user.refreshHash = await bcrypt.hash(refresh, 10);
    saveUsers(users);

    res.cookie("refreshToken", refresh, {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });

    res.json({ access });
};

// ------------------- GOOGLE LOGIN --------------------
exports.google = async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "No token" });

    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    const users = loadUsers();
    let user = users[email];

    if (!user) {
        users[email] = {
            name,
            email,
            passwordHash: null,
            provider: "google",
            refreshHash: null
        };
        saveUsers(users);
    }

    const access = createAccess(email);
    const refresh = createRefresh(email);

    users[email].refreshHash = await bcrypt.hash(refresh, 10);
    saveUsers(users);

    res.cookie("refreshToken", refresh, {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });

    res.json({ access, user: users[email] });
};

// ------------------- REFRESH TOKEN --------------------
exports.refresh = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    try {
        const data = jwt.verify(token, JWT_REFRESH_SECRET);
        const email = data.email;

        const users = loadUsers();
        const user = users[email];
        if (!user) return res.status(401).json({ error: "User not found" });

        const ok = await bcrypt.compare(token, user.refreshHash);
        if (!ok) return res.status(403).json({ error: "Invalid refresh" });

        const newAccess = createAccess(email);
        const newRefresh = createRefresh(email);

        user.refreshHash = await bcrypt.hash(newRefresh, 10);
        saveUsers(users);

        res.cookie("refreshToken", newRefresh, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });

        res.json({ access: newAccess });

    } catch {
        res.status(403).json({ error: "Refresh expired" });
    }
};
