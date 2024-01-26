"use client";

import {
  likedByUserId,
  getLikes,
  isThreadLikedByCurrentUser,
} from "@/lib/actions/thread.actions";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

interface Props {
  threadId: string;
  currentUserId: string;
}

const LikeButton: React.FC<Props> = ({ threadId, currentUserId }) => {
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] =
    useState<boolean>(false);

  const [nbLikes, setNbLikes] = useState<number>(0);

  const handleLike = async (threadId: string, currentUserId: string) => {
    await likedByUserId(threadId, currentUserId);
    setIsLikedByCurrentUser(!isLikedByCurrentUser);
  };

  useEffect(() => {
    const fetchData = async () => {
      const likes = await getLikes(threadId);

      setNbLikes(likes.length);

      const isCurrentUserLiked = await isThreadLikedByCurrentUser(
        threadId,
        currentUserId
      );

      setIsLikedByCurrentUser(isCurrentUserLiked);
    };
    fetchData();
  }, [isLikedByCurrentUser]);

  return (
    <>
      <Button
        onClick={() => handleLike(threadId, currentUserId)}
        className="!bg-transparent"
      >
        {isLikedByCurrentUser ? (
          <>
            <Image
              src="/assets/heart-filled.svg"
              alt="heart"
              width={24}
              height={24}
              className="cursor-pointer object-contain"
            ></Image>
          </>
        ) : (
          <Image
            src="/assets/heart-gray.svg"
            alt="heart"
            width={24}
            height={24}
            className="cursor-pointer object-contain"
          ></Image>
        )}
        {nbLikes !== 0 && <div className="text-gray-1 ml-1">{nbLikes}</div>}
      </Button>
    </>
  );
};

export default LikeButton;
