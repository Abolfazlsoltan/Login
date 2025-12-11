const jwt = require("jsonwebtoken");

const ACCESS_SECRET = "ACCESS_SECRET_ABC123";

module.exports = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "توکن نیست" });

    const token = header.split(" ")[1];

    try {
        const data = jwt.verify(token, ACCESS_SECRET);
        req.user = data;
        next();
    } catch {
        res.status(401).json({ error: "توکن نامعتبر" });
    }
};
