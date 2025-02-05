import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import path from "path";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post, User],
  dbName: "postgres",
  user: "postgres",
  password: "postgres",
  type: "postgresql",
  debug: !__prod__,
  port: 5433,
} as Parameters<typeof MikroORM.init>[0];
