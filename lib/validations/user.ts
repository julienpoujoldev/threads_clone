import * as z from "zod";

export const UserValidation = z.object({
  profile_photo: z.string().url().min(1),
  name: z
    .string()
    .min(3, { message: "Name should be at least 3 characters" })
    .max(30, { message: "Name should not exceeds 30 characters" }),
  username: z
    .string()
    .min(3, { message: "Username should be at least 3 characters" })
    .max(30, { message: "Username should not exceeds 30 characters" }),
  bio: z
    .string()
    .max(1000, { message: "Bio should not exceeds 1000 characters" }),
});
