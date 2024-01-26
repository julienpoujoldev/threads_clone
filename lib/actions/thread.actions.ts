"use server";

import { revalidatePath } from "next/cache";
import Thread from "../Models/thread.model";
import User from "../Models/users.model";
import { connectToDB } from "../mongoose";

interface Params {
  text: string;
  author: string;
  communityId: string;
  path: string;
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    connectToDB();

    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });

    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (e: any) {
    throw new Error(`error creating thread, ${e.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  //calculate the number of posts to skip
  const skipAmount = (pageNumber - 1) * pageSize;

  //fetch the posts that have no parents (top-level thread = exclude thread comments)
  const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({ path: "author", model: User })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: User,
        select: "_id name image parentId",
      },
    });

  const totalPostCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  });

  const posts = await postsQuery.exec();

  const isNext = totalPostCount > skipAmount + posts.length;

  return { posts, isNext };
}

export async function fetchPostById(id: string) {
  connectToDB();

  try {
    //TODO populate community
    const post = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "name _id id image",
      })
      .populate({
        path: "children",
        populate: [
          { path: "author", model: User, select: "name _id id image" },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "name _id id parentId image",
            },
          },
        ],
      })
      .exec();

    return post;
  } catch (e: any) {
    throw new Error("This post ID do not exists !", e.message);
  }
}

export async function addCommentToPost(
  postId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original thread by its ID
    const originalThread = await Thread.findById(postId);
    console.log("🚀 ~ originalThread:", originalThread.children);

    if (!originalThread) {
      throw new Error("Thread not found");
    }

    // Create the new comment thread
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: postId, // Set the parentId to the original thread's ID
    });

    // Save the comment thread to the database
    const savedCommentThread = await commentThread.save();
    // console.log("🚀 ~ savedCommentThread:", savedCommentThread);
    //  console.log("🚀 ~ originalThread.children:", originalThread.children);

    // Add the comment thread's ID to the original thread's children array
    originalThread.children.push(savedCommentThread._id);

    // Save the updated original thread to the database
    await originalThread.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}
