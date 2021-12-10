"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareHashPassword = exports.hashThenInsertUser = void 0;
const bcryptjs_1 = require("bcryptjs");
const Entities_1 = require("./entity/Entities");
const hashThenInsertUser = async (username, password) => {
    const hashedPassword = await (0, bcryptjs_1.hash)(password, 12);
    const dateObj = new Date();
    const month = dateObj.getUTCMonth() + 1;
    const day = dateObj.getUTCDate() - 1;
    const year = dateObj.getUTCFullYear();
    const date = month + "/" + day + "/" + year;
    try {
        await Entities_1.User.insert({
            username,
            password: hashedPassword,
            dateCreated: date,
        });
    }
    catch (err) {
        console.log(err);
        return false;
    }
    return true;
};
exports.hashThenInsertUser = hashThenInsertUser;
const compareHashPassword = async (user, password) => {
    const valid = await (0, bcryptjs_1.compare)(password, user.password);
    if (!valid) {
        return false;
    }
    return true;
};
exports.compareHashPassword = compareHashPassword;
//# sourceMappingURL=hash.js.map