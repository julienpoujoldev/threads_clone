import * as z from "zod";

export const ThreadValidation = z.object({
  thread: z
    .string()
    .min(3, { message: "Post should be at least 3 characters" })
    .max(1000, { message: "Post should not exceeds 1000 characters" }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  thread: z
    .string()
    .min(1, { message: "Post should be at least 1 character" })
    .max(1000, { message: "Post should not exceeds 1000 characters" }),
});
