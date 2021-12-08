"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const UserResolver_1 = require("./UserResolver");
const jsonwebtoken_1 = require("jsonwebtoken");
const Entities_1 = require("./entity/Entities");
const AccessToken_1 = require("./AccessToken");
const http_1 = require("http");
const graphql_1 = require("graphql");
const subscriptions_transport_ws_1 = require("subscriptions-transport-ws");
const ChatResolver_1 = require("./ChatResolver");
(async () => {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    app.use((0, cors_1.default)({
        origin: "*",
        credentials: true,
    }));
    app.use((0, cookie_parser_1.default)());
    app.post("/refresh_token", async (req, res) => {
        const token = req.cookies.jid;
        if (!token) {
            return res.send({ ok: false, accessToken: "" });
        }
        let payload = null;
        try {
            payload = (0, jsonwebtoken_1.verify)(token, process.env.REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            console.log(err);
            return res.send({ ok: false, accessToken: "" });
        }
        const user = await Entities_1.User.findOne({ id: payload.userId });
        if (!user) {
            return res.send({ ok: false, accessToken: "" });
        }
        (0, AccessToken_1.sendRefreshToken)(res, (0, AccessToken_1.createRefreshToken)(user));
        return res.send({ ok: true, accessToken: (0, AccessToken_1.createAccessToken)(user) });
    });
    await (0, typeorm_1.createConnection)();
    const schema = await (0, type_graphql_1.buildSchema)({
        resolvers: [UserResolver_1.UserResolver, ChatResolver_1.ChatResolver],
    });
    const server = new apollo_server_express_1.ApolloServer({
        schema,
        context: ({ req, res }) => ({ req, res }),
        plugins: [
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            subscriptionServer.close();
                        },
                    };
                },
            },
        ],
        introspection: true,
    });
    const subscriptionServer = subscriptions_transport_ws_1.SubscriptionServer.create({
        schema,
        execute: graphql_1.execute,
        subscribe: graphql_1.subscribe,
    }, {
        server: httpServer,
    });
    const PORT = process.env.PORT || 4000;
    await server.start();
    server.applyMiddleware({ app, cors: false, path: "/" });
    httpServer.listen(PORT, () => {
        console.log("Express server has started");
    });
})();
//# sourceMappingURL=index.js.map