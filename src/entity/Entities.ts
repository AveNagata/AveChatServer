import { Field, Int, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

// Object Type that extends Base Entity so that it can use the Active Record to access the entity in the database
@ObjectType()
@Entity("users")
export class User extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	username: string;

	@Column()
	password: string;

	@Field()
	@Column({ default: "" })
	dateCreated: string;

	@Field(() => [String])
	@Column("text", { array: true, default: [] })
	channels: string[];

	@Column("int", { default: 0 })
	tokenVersion: number;
}

@ObjectType()
@Entity("chat")
export class Chat extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	message: string;

	@Field()
	@Column()
	user: string;

	@Field()
	@Column()
	channelName: string;

	/* @Field()
	@Column({ default: "" })
	timeStamp: string; */
}
