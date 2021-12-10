"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = void 0;
const type_graphql_1 = require("type-graphql");
const hash_1 = require("./hash");
const Entities_1 = require("./entity/Entities");
const Other_1 = require("./entity/Other");
const AccessToken_1 = require("./AccessToken");
const jsonwebtoken_1 = require("jsonwebtoken");
let UserResolver = class UserResolver {
    me(context) {
        const authorization = context.req.headers["authorization"];
        if (!authorization) {
            return null;
        }
        try {
            const token = authorization.split(" ")[1];
            const payload = (0, jsonwebtoken_1.verify)(token, process.env.ACCESS_TOKEN_SECRET);
            return Entities_1.User.findOne(payload.userId);
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }
    users() {
        return Entities_1.User.find();
    }
    async remove(username) {
        const user = await Entities_1.User.findOne({ where: { username } });
        if (!user) {
            return false;
        }
        const removed = Entities_1.User.remove(user);
        if (!removed) {
            return false;
        }
        return true;
    }
    async logout({ res }) {
        (0, AccessToken_1.sendRefreshToken)(res, "");
        return true;
    }
    async login(username, password, { res }) {
        const user = await Entities_1.User.findOne({ where: { username } });
        if (!user) {
            throw new Error("Cannot Find User");
        }
        if (!(await (0, hash_1.compareHashPassword)(user, password))) {
            throw new Error("Invalid Password");
        }
        (0, AccessToken_1.sendRefreshToken)(res, (0, AccessToken_1.createRefreshToken)(user));
        return {
            accessToken: (0, AccessToken_1.createAccessToken)(user),
            user,
        };
    }
    async register(username, password) {
        const user = await Entities_1.User.findOne({ where: { username } });
        if (user) {
            return false;
        }
        if (!(await (0, hash_1.hashThenInsertUser)(username, password))) {
            return false;
        }
        return true;
    }
};
__decorate([
    (0, type_graphql_1.Query)(() => Entities_1.User, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "me", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Entities_1.User]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "users", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("username")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "remove", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "logout", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Other_1.LoginResponse),
    __param(0, (0, type_graphql_1.Arg)("username")),
    __param(1, (0, type_graphql_1.Arg)("password")),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("username")),
    __param(1, (0, type_graphql_1.Arg)("password")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
UserResolver = __decorate([
    (0, type_graphql_1.Resolver)()
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=UserResolver.js.map