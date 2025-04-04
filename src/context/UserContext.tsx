
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User } from "../types/user";
import { Event } from "../types/event";
import { currentUser as initialUser, mockEvents, getAllFriends } from "../data/mockData";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

interface UserContextType {
  user: User;
  events: Event[];
  suggestedEvents: Event[];
  suggestedFriends: User[];
  attendEvent: (eventId: string) => void;
  shareEvent: (eventId: string) => void;
  isAttending: (eventId: string) => boolean;
  hasShared: (eventId: string) => boolean;
  addFriend: (friendId: string) => void;
  isFriend: (friendId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser: authUser } = useAuth();
  const [user, setUser] = useState<User>(initialUser);
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [allUsers, setAllUsers] = useState<User[]>(getAllFriends());
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<User[]>([]);

  useEffect(() => {
    if (authUser) {
      // Update user with auth user data
      setUser(prev => ({
        ...prev,
        ...authUser
      }));
    }
  }, [authUser]);

  // Update suggested events and friends when user or interests change
  useEffect(() => {
    if (user.interests && user.interests.length > 0) {
      // Match events based on tags that match user interests
      const matchedEvents = events.filter(event => 
        event.tags.some(tag => user.interests.includes(tag))
      );
      setSuggestedEvents(matchedEvents);
      
      // Match potential friends based on shared interests
      const potentialFriends = allUsers.filter(otherUser => {
        // Skip current user
        if (otherUser.id === user.id) return false;
        // Skip existing friends
        if (user.friends.some(friend => friend.id === otherUser.id)) return false;
        
        // Check for shared interests
        return otherUser.interests && user.interests.some(interest => 
          otherUser.interests?.includes(interest)
        );
      });
      
      setSuggestedFriends(potentialFriends);
    }
  }, [user, user.interests, events, allUsers]);

  const attendEvent = (eventId: string) => {
    if (user.attendedEvents.includes(eventId)) {
      toast.info("You've already marked this event as attending.");
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newPoints = user.points + event.pointsForAttending;
    
    setUser({
      ...user,
      points: newPoints,
      attendedEvents: [...user.attendedEvents, eventId]
    });

    toast.success(`Earned ${event.pointsForAttending} points for attending!`);
  };

  const shareEvent = (eventId: string) => {
    if (user.sharedEvents.includes(eventId)) {
      toast.info("You've already shared this event.");
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newPoints = user.points + event.pointsForSharing;
    
    setUser({
      ...user,
      points: newPoints,
      sharedEvents: [...user.sharedEvents, eventId]
    });

    toast.success(`Earned ${event.pointsForSharing} points for sharing!`);
  };

  const addFriend = (friendId: string) => {
    if (user.friends.some(friend => friend.id === friendId)) {
      toast.info("You're already friends with this person.");
      return;
    }

    const friendToAdd = allUsers.find(u => u.id === friendId);
    if (!friendToAdd) return;

    const newFriend = {
      id: friendToAdd.id,
      name: friendToAdd.name,
      avatar: friendToAdd.avatar,
      points: friendToAdd.points,
      interests: friendToAdd.interests,
    };

    setUser({
      ...user,
      friends: [...user.friends, newFriend]
    });

    toast.success(`You are now friends with ${friendToAdd.name}!`);
  };

  const isAttending = (eventId: string) => {
    return user.attendedEvents.includes(eventId);
  };

  const hasShared = (eventId: string) => {
    return user.sharedEvents.includes(eventId);
  };

  const isFriend = (friendId: string) => {
    return user.friends.some(friend => friend.id === friendId);
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        events, 
        suggestedEvents,
        suggestedFriends,
        attendEvent, 
        shareEvent, 
        isAttending, 
        hasShared,
        addFriend,
        isFriend 
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
