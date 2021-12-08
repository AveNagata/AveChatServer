import { compare, hash as hashPassword } from "bcryptjs";
import { User } from "./entity/Entities";

// Function creates a hashed password based on user input, establishes a date and returns true if successful
export const hashThenInsertUser = async (
	username: string,
	password: string
) => {
	const hashedPassword = await hashPassword(password, 12);
	const dateObj = new Date();
	const month = dateObj.getUTCMonth() + 1;
	const day = dateObj.getUTCDate() - 1;
	const year = dateObj.getUTCFullYear();
	const date = month + "/" + day + "/" + year;
	try {
		await User.insert({
			username,
			password: hashedPassword,
			dateCreated: date,
		});
	} catch (err) {
		console.log(err);
		return false;
	}
	return true;
};

// Function compares input password with stores hashed password
export const compareHashPassword = async (user: User, password: string) => {
	const valid = await compare(password, user.password);

	if (!valid) {
		return false;
	}

	return true;
};
