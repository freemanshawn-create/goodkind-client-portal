import type { User } from "@/data/types";

export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "amanda@goodkindco.com",
    name: "Amanda Klohmann",
    company: "Dr. Squatch",
    brands: ["Dr. Squatch"],
    role: "client",
    createdAt: new Date("2024-06-15"),
  },
  {
    id: "user-2",
    email: "james@peaknutrition.com",
    name: "James Chen",
    company: "Jukebox",
    brands: ["Jukebox"],
    role: "client",
    createdAt: new Date("2024-08-01"),
  },
  {
    id: "admin-1",
    email: "alex@goodkindco.com",
    name: "Alex Rivera",
    company: "Goodkind Co",
    role: "admin",
    createdAt: new Date("2023-01-10"),
  },
  {
    id: "admin-2",
    email: "morgan@goodkindco.com",
    name: "Morgan Taylor",
    company: "Goodkind Co",
    role: "admin",
    createdAt: new Date("2023-03-22"),
  },
];

export const currentUser = mockUsers[0];
