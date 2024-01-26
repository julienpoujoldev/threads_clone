"use server";

import { revalidatePath } from "next/cache";
import User from "../Models/users.model";
import { connectToDB } from "../mongoose";
import Thread from "../Models/thread.model";
import { getJsPageSizeInKb } from "next/dist/build/utils";
import { FilterQuery, SortOrder } from "mongoose";

interface Params {
  userId: string;
  name: string;
  username: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Params): Promise<void> {
  try {
    connectToDB();

    await User.findOneAndUpdate(
      { id: userId },
      { username: username.toLowerCase(), name, bio, image, onboarded: true },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    console.log(error);
  }
}

export async function fetchUser(userId: string) {
  try {
    connectToDB();
    return await User.findOne({ id: userId });
    // .populate({
    //   path: "communities",
    //   model: Community,
    // });
  } catch (e: any) {
    throw new Error(`Failed to fetch user: ${e.message}`);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    connectToDB();

    //TODO community
    const threads = await User.findOne({ id: userId }).populate({
      path: "threads",
      model: Thread,
      populate: {
        path: "children",
        model: Thread,
        populate: {
          path: "author",
          model: User,
          select: "name image id",
        },
      },
    });

    return threads;
  } catch (e: any) {
    throw new Error(`Failed to fetch user posts: ${e.message}`);
  }
}

export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    connectToDB();

    const skipAmount = (pageNumber - 1) * pageSize;

    const regex = new RegExp(searchString, "i");

    const query: FilterQuery<typeof User> = { id: { $ne: userId } };

    if (searchString.trim() !== "") {
      query.$or = [{ username: { $regex: regex }, name: { $regex: regex } }];
    }

    const userQuery = User.find(query)
      .sort({ sortBy })
      .skip(skipAmount)
      .limit(pageSize);

    const totalUsersCount = await User.countDocuments(userQuery);

    const users = await userQuery.exec();

    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (e: any) {
    throw new Error(`Failed to fetch users: ${e.message}`);
  }
}

// export async function getActivity(userId: string) {
//   try {
//     connectToDB();

//     //find threats created by user
//     const userThreads = await Thread.find({ author: userId });

//     // collect all child threads from "children" field
//     const childThreadsIds = userThreads.reduce((acc, userThread) => {
//       return acc.concat(userThread.children);
//     }, []);

//     const replies = await Thread.find({
//       _id: { $in: childThreadsIds },
//       author: { $ne: userId },
//     }).populate({ path: "author", model: User, select: "name userId" });

//     return replies;
//   } catch (e: any) {
//     throw new Error(`Failed to get notifications: ${e.message}`);
//   }
// }

export async function getActivity(userId: string) {
  try {
    connectToDB();

    // Find all threads created by the user
    const userThreads = await Thread.find({ author: userId });

    // Collect all the child thread ids (replies) from the 'children' field of each user thread
    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);

    // Find and return the child threads (replies) excluding the ones created by the same user
    const replies = await Thread.find({
      _id: { $in: childThreadIds },
      author: { $ne: userId }, // Exclude threads authored by the same user
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return replies;
  } catch (error) {
    console.error("Error fetching replies: ", error);
    throw error;
  }
}
