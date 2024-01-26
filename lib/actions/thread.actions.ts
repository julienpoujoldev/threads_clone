"use server";

import { revalidatePath } from "next/cache";
import Thread from "../Models/thread.model";
import User from "../Models/users.model";
import { connectToDB } from "../mongoose";
import Community from "../Models/community.model";
import mongoose from "mongoose";

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

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdThread = await Thread.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { threads: createdThread._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
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
      path: "community",
      model: Community,
    })
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
    const post = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "name _id id image",
      })
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
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

export async function likedByUserId(threadId: string, currentUserId: string) {
  try {
    console.log("🚀 ~ currentUserId:", currentUserId);
    connectToDB();

    const thread = await Thread.findById(threadId);

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Get the user object from the DB that matches the currentUserId
    const user = await User.findOne({ id: currentUserId });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user already liked the thread
    const userIndex = thread.likedBy.indexOf(user._id);
    if (userIndex !== -1) {
      // If the user already liked the thread, remove their ID from the likedBy array
      thread.likedBy.splice(userIndex, 1);
      console.log("User's like removed from the thread.");
    } else {
      // If the user hasn't liked the thread, add their ID to the likedBy array
      console.log("🚀 ~ likedByUserId ~ user._id:", user._id);
      thread.likedBy.push(user._id);
      console.log("User successfully liked the thread.");
    }

    // Save the updated thread document
    await thread.save();
  } catch (error: any) {
    console.error("Error liking thread:", error.message);
    throw error;
  }
}

export async function isThreadLikedByCurrentUser(
  threadId: string,
  currentUserId: string
): Promise<boolean> {
  try {
    connectToDB();
    const thread = await Thread.findById(threadId);

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Check if the user already liked the thread
    if (thread.likedBy.length === 0) {
      // If likedBy array is empty, user has not liked the thread
      return false;
    }

    // Get the user object from the DB that matches the currentUserId
    const user = await User.findOne({ id: currentUserId });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user already liked the thread
    const userIndex = thread.likedBy.findIndex(
      (userId: any) => userId.toString() === user._id.toString()
    );
    if (userIndex === -1) {
      // If user's ID is not found in likedBy array, user has not liked the thread
      return false;
    } else {
      // If user's ID is found in likedBy array, user has liked the thread
      return true;
    }
  } catch (error: any) {
    console.error(
      "Error getting info about if the user already liked the post:",
      error.message
    );
    throw error;
  }
}

export async function getLikes(threadId: string) {
  try {
    connectToDB();

    const thread = await Thread.findById(threadId);

    if (!thread) {
      throw new Error("Thread not found");
    }

    return thread.likedBy;
  } catch (error: any) {
    throw new Error(`Failed to get likes: ${error.message}`);
  }
}
