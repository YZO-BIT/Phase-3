import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2];
if (!password || password.length < 12 || password.length > 256) {
  process.stderr.write("Usage: npm run admin:password -- <password of 12–256 characters>\n");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = await promisify(scrypt)(password, salt, 64);
process.stdout.write(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash.toString("hex")}\n`);
