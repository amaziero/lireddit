import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";

import argon2 from "argon2";

// InputTyppe is use to specify argumnents
@InputType()
class UserNamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

// ObjectType is used to return from mutations
// In this case we are specifying what could be returned from our login Mutation
// Both the Error if that's the case, and the User
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors: FieldError[];

  @Field(() => User, { nullable: true })
  user: User | null;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    // if you are not login, thus, if no valid ligged in cooki is on storange
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UserNamePasswordInput) options: UserNamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "usename must have more than 2 caracters!",
          },
        ],
        user: null,
      };
    }

    if (options.password.length <= 8) {
      return {
        errors: [
          {
            field: "password",
            message: "password must have more than 8 caracters!",
          },
        ],
        user: null,
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (err) {
      if (err.code === "23505" || err.detail.includes("already exists")) {
        return {
          errors: [
            {
              field: "username",
              message: "This Username is already been taken",
            },
          ],
          user: null,
        };
      }

      console.log(err.message);
    }

    // this is going to let the user logged in after registering on the
    // aplication
    req.session.userId = user.id;
    return {
      errors: [],
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UserNamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });

    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "that username dosen't exist",
          },
        ],
        user: null,
      };
    }

    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "something is wrong with your password, try again!",
          },
        ],
        user: null,
      };
    }

    req.session.userId = user.id;

    return { errors: [], user };
  }
}
