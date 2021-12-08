import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from "type-graphql";
import { hashThenInsertUser, compareHashPassword } from "./hash";
import { User } from "./entity/Entities";
import { Channel, LoginResponse } from "./entity/Other";
import { MyContext } from "./interfaces/interfaces";
import {
	createAccessToken,
	createRefreshToken,
	sendRefreshToken,
} from "./AccessToken";
import { isAuth } from "./isAuth";
import { verify } from "jsonwebtoken";

@Resolver()
export class UserResolver {
	@Query(() => User, { nullable: true })
	me(@Ctx() context: MyContext) {
		const authorization = context.req.headers["authorization"];

		if (!authorization) {
			return null;
		}

		try {
			const token = authorization.split(" ")[1];
			const payload: any = verify(
				token,
				process.env.ACCESS_TOKEN_SECRET!
			);
			return User.findOne(payload.userId);
		} catch (err) {
			console.log(err);
			return null;
		}
	}

	@Query(() => [User])
	users() {
		return User.find();
	}

	@Mutation(() => User, { nullable: true })
	async addUserToChannel(
		@Arg("username") username: string,
		@Arg("channelName") channelName: string
	) {
		const user = await User.findOne({ where: { username } });
		const channelFound = await Channel.findOne({ where: { channelName } });
		if (!user) {
			return null;
		}
		if (!user.channels.find((x) => x === channelName) && channelFound) {
			user.channels.push(channelName);
			try {
				User.update(user.id, user);
			} catch (err) {
				console.log(err);
				return null;
			}
		}
		return user;
	}

	@Mutation(() => User, { nullable: true })
	async removeUserFromChannel(
		@Arg("username") username: string,
		@Arg("channelName") channelName: string
	) {
		const user = await User.findOne({ where: { username } });
		if (!user) {
			return null;
		}
		if (user.channels.find((x) => x === channelName)) {
			const index = user.channels.indexOf(channelName);
			if (index > -1) {
				user.channels.splice(index, 1);
			}
			User.update(user.id, user);
		} else {
			return null;
		}

		return user;
	}

	@Mutation(() => User, { nullable: true })
	async removeUserFromAllChannels(@Arg("username") username: string) {
		const user = await User.findOne({ where: { username } });
		if (!user) {
			return null;
		}
		user.channels = [];
		User.update(user.id, user);

		return user;
	}

	@Mutation(() => Boolean)
	async remove(@Arg("username") username: string) {
		const user = await User.findOne({ where: { username } });
		if (!user) {
			return false;
		}
		const removed = User.remove(user);
		if (!removed) {
			return false;
		}
		return true;
	}

	@Mutation(() => Boolean)
	async logout(@Ctx() { res }: MyContext) {
		sendRefreshToken(res, "");
		return true;
	}

	@Mutation(() => LoginResponse)
	async login(
		@Arg("username") username: string,
		@Arg("password") password: string,
		@Ctx() { res }: MyContext
	) {
		const user = await User.findOne({ where: { username } });
		if (!user) {
			throw new Error("Cannot Find User");
		}

		if (!(await compareHashPassword(user, password))) {
			throw new Error("Invalid Password");
		}

		sendRefreshToken(res, createRefreshToken(user));

		return {
			accessToken: createAccessToken(user),
			user,
		};
	}

	@Mutation(() => Boolean)
	async register(
		@Arg("username") username: string,
		@Arg("password") password: string
	) {
		const user = await User.findOne({ where: { username } });

		if (user) {
			return false;
		}

		if (!(await hashThenInsertUser(username, password))) {
			return false;
		}

		return true;
	}
}
