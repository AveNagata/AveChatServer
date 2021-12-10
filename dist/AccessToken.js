"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRefreshToken = exports.createRefreshToken = exports.createAccessToken = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const createAccessToken = (user) => {
    return (0, jsonwebtoken_1.sign)({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
        algorithm: "HS512",
    });
};
exports.createAccessToken = createAccessToken;
const createRefreshToken = (user) => {
    return (0, jsonwebtoken_1.sign)({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
        algorithm: "HS512",
    });
};
exports.createRefreshToken = createRefreshToken;
const sendRefreshToken = (res, token) => {
    res.cookie("jid", token, {
        httpOnly: true,
    });
};
exports.sendRefreshToken = sendRefreshToken;
//# sourceMappingURL=AccessToken.js.map