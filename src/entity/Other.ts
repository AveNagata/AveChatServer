import { Field, Int, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { Chat, User } from "./Entities";

@ObjectType()
export class LoginResponse {
	@Field()
	accessToken: string;

	@Field()
	user: User;
}

@ObjectType()
export class UsersInChannel {
	@Field()
	channelName: string;

	@Field(() => [String])
	users: string[];
}

@ObjectType()
export class ChannelUsers {
	@Field()
	user: string;

	@Field()
	role: string;
}

@ObjectType()
@Entity("channels")
export class Channel extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	channelName: string;

	@Field(() => [String])
	@Column("text", { array: true, default: [] })
	users: string[];
}
