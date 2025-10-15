// app/lib/dummyMessages.js
export const threads = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    jobId: "22222222-2222-2222-2222-222222222222",
    title: "Audi A3 delivery",
    counterpart: "Birmingham Motors",
    lastMessage: "Can you share ETA?",
    unread: 2,
    priority: true,
    updatedAt: "2025-09-30T11:10:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    jobId: "22222222-2222-2222-2222-222222222223",
    title: "BMW 1 Series pickup",
    counterpart: "Leeds Direct",
    lastMessage: "Docs uploaded?",
    unread: 0,
    priority: false,
    updatedAt: "2025-09-29T18:40:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    jobId: "22222222-2222-2222-2222-222222222224",
    title: "VW Golf trailer",
    counterpart: "Manchester Prestige",
    lastMessage: "See you at 10am.",
    unread: 1,
    priority: false,
    updatedAt: "2025-09-28T08:15:00Z",
  },
];

export const messagesByThread = {
  "11111111-1111-1111-1111-111111111111": [
    { id: "31111111-1111-1111-1111-111111111111", sender: "them", text: "Hi, can you confirm collection time?", at: "2025-09-30T09:02:00Z" },
    { id: "31111111-1111-1111-1111-111111111112", sender: "me", text: "On my way. ETA ~40 mins.", at: "2025-09-30T09:05:00Z" },
    { id: "31111111-1111-1111-1111-111111111113", sender: "them", text: "Can you share ETA?", at: "2025-09-30T11:10:00Z" },
  ],
  "11111111-1111-1111-1111-111111111112": [
    { id: "31111111-1111-1111-1111-111111111114", sender: "them", text: "Docs uploaded?", at: "2025-09-29T18:40:00Z" },
  ],
  "11111111-1111-1111-1111-111111111113": [
    { id: "31111111-1111-1111-1111-111111111115", sender: "me", text: "See you at 10am.", at: "2025-09-28T08:15:00Z" },
  ],
};