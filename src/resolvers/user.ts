import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
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
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UserNamePasswordInput) options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "usename must have more than 2 caracters!",
          },
        ],
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
        };
      }

      console.log(err.message);
    }
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UserNamePasswordInput,
    @Ctx() { em, request }: MyContext
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
      };
    }

    request.session!.userId = user.id;

    return {
      user,
    };
  }
}
