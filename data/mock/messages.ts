import type { MessageThread, Message } from "@/data/types";

export const mockThreads: MessageThread[] = [
  {
    id: "thread-1",
    subject: "Protein Bar Packaging - Color Proof Review",
    participants: ["Sarah Mitchell", "Alex Rivera"],
    projectId: "proj-1",
    projectName: "Protein Bar Line Launch",
    lastMessageAt: new Date("2026-03-14T14:30:00"),
    unreadCount: 2,
    createdAt: new Date("2026-03-10"),
  },
  {
    id: "thread-2",
    subject: "CBD Tincture - Regulatory Update",
    participants: ["Sarah Mitchell", "Alex Rivera", "Morgan Taylor"],
    projectId: "proj-2",
    projectName: "CBD Tincture Reformulation",
    lastMessageAt: new Date("2026-03-12T09:15:00"),
    unreadCount: 0,
    createdAt: new Date("2026-02-28"),
  },
  {
    id: "thread-3",
    subject: "Invoice #GK-2026-0142 - Payment Confirmation",
    participants: ["Sarah Mitchell", "Morgan Taylor"],
    lastMessageAt: new Date("2026-03-05T16:45:00"),
    unreadCount: 1,
    createdAt: new Date("2026-03-01"),
  },
  {
    id: "thread-4",
    subject: "Superfood Powder - Ingredient Sourcing Options",
    participants: ["Sarah Mitchell", "Alex Rivera"],
    projectId: "proj-3",
    projectName: "Superfood Powder Development",
    lastMessageAt: new Date("2026-03-08T11:00:00"),
    unreadCount: 0,
    createdAt: new Date("2026-03-05"),
  },
];

export const mockMessages: Message[] = [
  // Thread 1: Protein Bar Packaging
  {
    id: "msg-1",
    threadId: "thread-1",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "Hi Sarah, the color proofs for the Dark Chocolate Almond packaging are ready for your review. I've uploaded them to the Documents section. The printer needs approval by March 18th to stay on schedule.",
    attachments: [],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-10T10:00:00"),
  },
  {
    id: "msg-2",
    threadId: "thread-1",
    senderId: "user-1",
    senderName: "Sarah Mitchell",
    content:
      "Thanks Alex! I'll take a look today. Quick question - can we also get a proof for the Peanut Butter Crunch variant? I want to compare them side by side.",
    attachments: [],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-10T11:30:00"),
  },
  {
    id: "msg-3",
    threadId: "thread-1",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "Absolutely! I'll have the PB Crunch proof uploaded by tomorrow morning. We're also finalizing the Mixed Berry design - should have all three ready for a side-by-side comparison by Wednesday.",
    attachments: [],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-10T14:15:00"),
  },
  {
    id: "msg-4",
    threadId: "thread-1",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "All three proofs are now uploaded. Let me know if the colors look accurate on your end. The Pantone matching looks great in person.",
    attachments: [
      {
        id: "att-1",
        name: "All_Flavors_Color_Proof.pdf",
        size: 8388608,
        url: "#",
      },
    ],
    readBy: ["admin-1"],
    createdAt: new Date("2026-03-14T10:00:00"),
  },
  {
    id: "msg-5",
    threadId: "thread-1",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "Just a reminder - we need sign-off by the 18th to keep the production schedule on track. Let me know if you have any questions!",
    attachments: [],
    readBy: ["admin-1"],
    createdAt: new Date("2026-03-14T14:30:00"),
  },

  // Thread 2: CBD Tincture Regulatory
  {
    id: "msg-6",
    threadId: "thread-2",
    senderId: "admin-2",
    senderName: "Morgan Taylor",
    content:
      "Hi Sarah, wanted to give you an update on the regulatory review for the reformulated CBD tincture. We've submitted the updated labels to our compliance team and expect feedback within the next week.",
    attachments: [],
    readBy: ["admin-1", "admin-2", "user-1"],
    createdAt: new Date("2026-02-28T09:00:00"),
  },
  {
    id: "msg-7",
    threadId: "thread-2",
    senderId: "user-1",
    senderName: "Sarah Mitchell",
    content:
      "Great, thanks Morgan. Are there any concerns about the new claim language we added? Specifically the bioavailability improvement percentages.",
    attachments: [],
    readBy: ["admin-1", "admin-2", "user-1"],
    createdAt: new Date("2026-02-28T13:00:00"),
  },
  {
    id: "msg-8",
    threadId: "thread-2",
    senderId: "admin-2",
    senderName: "Morgan Taylor",
    content:
      "Good question. Our compliance team flagged the \"3x better absorption\" claim. We'll need to either provide the supporting clinical data or adjust the language to something like \"enhanced absorption formula.\" I'd recommend the latter to be safe.",
    attachments: [],
    readBy: ["admin-1", "admin-2", "user-1"],
    createdAt: new Date("2026-03-05T10:30:00"),
  },
  {
    id: "msg-9",
    threadId: "thread-2",
    senderId: "user-1",
    senderName: "Sarah Mitchell",
    content:
      "That makes sense. Let's go with \"enhanced absorption formula\" for now. We can revisit the stronger claim once we have the clinical study completed. Please update the labels accordingly.",
    attachments: [],
    readBy: ["admin-1", "admin-2", "user-1"],
    createdAt: new Date("2026-03-12T09:15:00"),
  },

  // Thread 3: Invoice
  {
    id: "msg-10",
    threadId: "thread-3",
    senderId: "admin-2",
    senderName: "Morgan Taylor",
    content:
      "Hi Sarah, Invoice #GK-2026-0142 has been generated for the Q1 production milestone on the Protein Bar project. The invoice is available in your Documents section. Payment terms are Net 30.",
    attachments: [
      {
        id: "att-2",
        name: "Invoice_GK-2026-0142.pdf",
        size: 204800,
        url: "#",
      },
    ],
    readBy: ["admin-2", "user-1"],
    createdAt: new Date("2026-03-01T10:00:00"),
  },
  {
    id: "msg-11",
    threadId: "thread-3",
    senderId: "user-1",
    senderName: "Sarah Mitchell",
    content:
      "Received, thanks. I've forwarded to our AP team. Should be processed within the week.",
    attachments: [],
    readBy: ["admin-2", "user-1"],
    createdAt: new Date("2026-03-01T14:20:00"),
  },
  {
    id: "msg-12",
    threadId: "thread-3",
    senderId: "admin-2",
    senderName: "Morgan Taylor",
    content:
      "Just following up - have you had a chance to process the payment? We show it as still outstanding.",
    attachments: [],
    readBy: ["admin-2"],
    createdAt: new Date("2026-03-05T16:45:00"),
  },

  // Thread 4: Superfood Powder
  {
    id: "msg-13",
    threadId: "thread-4",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "Hi Sarah, I've been researching organic spirulina suppliers for the Superfood Powder project. I have three options with different price points and certifications. I'll send over a comparison sheet later today.",
    attachments: [],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-05T10:00:00"),
  },
  {
    id: "msg-14",
    threadId: "thread-4",
    senderId: "admin-1",
    senderName: "Alex Rivera",
    content:
      "Here's the supplier comparison. My recommendation is Supplier B - they have the best balance of price, quality certifications, and supply reliability.",
    attachments: [
      {
        id: "att-3",
        name: "Spirulina_Supplier_Comparison.xlsx",
        size: 102400,
        url: "#",
      },
    ],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-05T16:00:00"),
  },
  {
    id: "msg-15",
    threadId: "thread-4",
    senderId: "user-1",
    senderName: "Sarah Mitchell",
    content:
      "This is really helpful, thanks Alex. I agree Supplier B looks like the best option. Let's move forward with them. Can you also start sourcing the lion's mane mushroom extract?",
    attachments: [],
    readBy: ["admin-1", "user-1"],
    createdAt: new Date("2026-03-08T11:00:00"),
  },
];
