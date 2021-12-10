import { verify } from "jsonwebtoken";
import { Middleware } from "type-graphql/dist/interfaces/Middleware";
import { MyContext } from "./interfaces/interfaces";

// Middleware to check for token from client header to accept/reject user routes
export const isAuth: Middleware<MyContext> = ({ context }, next) => {
	const authorization = context.req.headers["authorization"];

	if (!authorization) {
		throw new Error("Not authenticated");
	}

	try {
		const token = authorization.split(" ")[1];
		const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
		context.payload = payload as any;
	} catch (err) {
		console.log(err);
		throw new Error("Not authenticated");
	}
	return next();
};
