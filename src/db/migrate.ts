import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from "./index";

const main = async () => {
	try {
		await migrate(db, { migrationsFolder: "drizzle" });
		console.log("Migration completed");
	} catch (error) {
		console.error("Error during migration:", error);
		process.exit(1);
	}
};

main();
