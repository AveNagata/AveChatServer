import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	Subscription,
	UseMiddleware,
	PubSub,
	PubSubEngine,
	Root,
} from "type-graphql";
import { Chat, User } from "./entity/Entities";
import { Channel, UsersInChannel } from "./entity/Other";

let chats: Chat[] = [];
const allChannels: string[] = [];

@Resolver()
export class ChatResolver {
	@Mutation(() => Boolean)
	async createChannel(@Arg("channelName") channelName: string) {
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (!channelFound) {
			Channel.insert({
				channelName,
			});
			allChannels.push(channelName);
			return true;
		}
		return false;
	}

	@Query(() => [Channel])
	getChannels() {
		return Channel.find();
	}

	@Query(() => Channel, { nullable: true })
	async getChannelByName(@Arg("channelName") channelName: string) {
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (channelFound) {
			return channelFound;
		}
		return null;
	}

	@Query(() => [Chat])
	async getChats(@Arg("channelName") channelName: string) {
		const channelChats = await Chat.find({ where: { channelName } });
		return channelChats;
	}

	@Mutation(() => Boolean)
	async deleteChatsFromChannel(@Arg("channelName") channelName: string) {
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (channelFound) {
			const channelChats = await Chat.find({ where: { channelName } });
			try {
				Chat.remove(channelChats);
			} catch (err) {
				console.log(err);
				return false;
			}
			return true;
		} else {
			return false;
		}
	}

	@Mutation(() => Boolean)
	async deleteChannel(@Arg("channelName") channelName: string) {
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (channelFound) {
			try {
				Channel.remove(channelFound);
				const channelChats = await Chat.find({
					where: { channelName },
				});
				try {
					Chat.remove(channelChats);
				} catch (err) {
					console.log(err);
					return false;
				}
				return true;
			} catch (err) {
				console.log(err);
				return false;
			}
		} else {
			return false;
		}
	}

	@Mutation(() => Boolean)
	async deleteAllChannels() {
		const channels = await Channel.find();
		if (channels) {
			try {
				for (let i = 0; i < channels.length; i++) {
					Channel.remove(channels[i]);
					let channelName = channels[i].channelName;
					const channelChats = await Chat.find({
						where: { channelName },
					});
					Chat.remove(channelChats);
				}
				return true;
			} catch (err) {
				console.log(err);
				return false;
			}
		} else {
			return false;
		}
	}

	@Mutation(() => Chat, { nullable: true })
	async createChat(
		@PubSub() pubsub: PubSubEngine,
		@Arg("user") user: string,
		@Arg("message") message: string,
		@Arg("channelName") channelName: string
	) {
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (channelFound) {
			const chat = { user, message, channelName };
			try {
				await Chat.insert(chat);
			} catch (err) {
				console.log(err);
				return false;
			}
			const payload = chat;
			await pubsub.publish(channelFound.channelName, payload);
			return chat;
		}
		return null;
	}

	@Mutation(() => UsersInChannel, { nullable: true })
	async addToChannelUserList(
		@Arg("username") username: string,
		@Arg("channelName") channelName: string,
		@Arg("channelRole") channelRole: string
	) {
		const user = await User.findOne({ where: { username } });
		const channel = await Channel.findOne({ where: { channelName } });
		if (user && channel) {
			if (
				channel.users.find((x) => JSON.parse(x).name === user.username)
			) {
				return null;
			}
			channel.users.push(
				JSON.stringify({ name: user.username, role: channelRole })
			);
			await Channel.update(channel.id, channel);
			return { channelName, users: channel.users };
		}
		return null;
	}

	@Query(() => UsersInChannel, { nullable: true })
	async getChannelUsers(
		@PubSub() pubsub: PubSubEngine,
		@Arg("channelName") channelName: string
	) {
		const channel = await Channel.findOne({ where: { channelName } });
		if (!channel) {
			return null;
		}
		let userTopic = channelName + "-users";
		await pubsub.publish(userTopic, {
			channelName,
			users: channel.users,
		});
		return { channelName: channelName, users: channel.users };
	}

	@Subscription({ topics: ({ args }) => args.channel })
	messageSent(
		@Arg("channel") _channel: string,
		@Root() { id, user, message, channelName }: Chat
	): Chat {
		return { id, user, message, channelName } as any;
	}

	@Subscription(() => UsersInChannel, { topics: ({ args }) => args.channel })
	usersInChannel(
		@Arg("channel") _channel: string,
		@Root() channelUsers: UsersInChannel
	): UsersInChannel {
		return channelUsers;
	}
}
