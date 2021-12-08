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
exports.ChatResolver = void 0;
const type_graphql_1 = require("type-graphql");
const Entities_1 = require("./entity/Entities");
const Other_1 = require("./entity/Other");
let chats = [];
const allChannels = [];
let ChatResolver = class ChatResolver {
    async createChannel(channelName) {
        const channelFound = await Other_1.Channel.findOne({ where: { channelName } });
        if (!channelFound) {
            console.log(channelName);
            Other_1.Channel.insert({
                channelName,
            });
            allChannels.push(channelName);
            return true;
        }
        return false;
    }
    getChannels() {
        return Other_1.Channel.find();
    }
    async getChannelByName(channelName) {
        const channelFound = await Other_1.Channel.findOne({ where: { channelName } });
        if (channelFound) {
            return channelFound;
        }
        return null;
    }
    async getChats(channelName) {
        const channelChats = await Entities_1.Chat.find({ where: { channelName } });
        return channelChats;
    }
    async deleteChatsFromChannel(channelName) {
        const channelFound = await Other_1.Channel.findOne({ where: { channelName } });
        if (channelFound) {
            const channelChats = await Entities_1.Chat.find({ where: { channelName } });
            try {
                Entities_1.Chat.remove(channelChats);
            }
            catch (err) {
                console.log(err);
                return false;
            }
            return true;
        }
        else {
            return false;
        }
    }
    async deleteChannel(channelName) {
        const channelFound = await Other_1.Channel.findOne({ where: { channelName } });
        if (channelFound) {
            try {
                Other_1.Channel.remove(channelFound);
                const channelChats = await Entities_1.Chat.find({
                    where: { channelName },
                });
                try {
                    Entities_1.Chat.remove(channelChats);
                }
                catch (err) {
                    console.log(err);
                    return false;
                }
                return true;
            }
            catch (err) {
                console.log(err);
                return false;
            }
        }
        else {
            return false;
        }
    }
    async createChat(pubsub, user, message, channelName) {
        const channelFound = await Other_1.Channel.findOne({ where: { channelName } });
        if (channelFound) {
            const chat = { user, message, channelName };
            try {
                await Entities_1.Chat.insert(chat);
            }
            catch (err) {
                console.log(err);
                return false;
            }
            const payload = chat;
            await pubsub.publish(channelFound.channelName, payload);
            return chat;
        }
        return null;
    }
    messageSent(channel, { id, user, message, channelName }) {
        console.log(user, "has joined", channel);
        return { id, user, message, channelName };
    }
};
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "createChannel", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Other_1.Channel]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "getChannels", null);
__decorate([
    (0, type_graphql_1.Query)(() => Other_1.Channel, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getChannelByName", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Entities_1.Chat]),
    __param(0, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getChats", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "deleteChatsFromChannel", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "deleteChannel", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Entities_1.Chat, { nullable: true }),
    __param(0, (0, type_graphql_1.PubSub)()),
    __param(1, (0, type_graphql_1.Arg)("user")),
    __param(2, (0, type_graphql_1.Arg)("message")),
    __param(3, (0, type_graphql_1.Arg)("channelName")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [type_graphql_1.PubSubEngine, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "createChat", null);
__decorate([
    (0, type_graphql_1.Subscription)({ topics: ({ args }) => args.channel }),
    __param(0, (0, type_graphql_1.Arg)("channel")),
    __param(1, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Entities_1.Chat]),
    __metadata("design:returntype", Entities_1.Chat)
], ChatResolver.prototype, "messageSent", null);
ChatResolver = __decorate([
    (0, type_graphql_1.Resolver)()
], ChatResolver);
exports.ChatResolver = ChatResolver;
//# sourceMappingURL=ChatResolver.js.map