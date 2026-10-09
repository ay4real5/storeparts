// Human-readable names for enum values, shared by storefront and admin.
export const orderStatusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid — preparing to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export const returnReasonLabel: Record<string, string> = {
  DOES_NOT_FIT: "Doesn’t fit my vehicle",
  DEFECTIVE: "Defective or damaged",
  WRONG_ITEM_SENT: "Wrong item sent",
  NOT_NEEDED: "No longer needed",
  CORE_RETURN: "Core return",
};

export const returnStatusLabel: Record<string, string> = {
  REQUESTED: "Requested — under review",
  APPROVED: "Approved — ship it back",
  REJECTED: "Not approved",
  RECEIVED: "Received — refund pending",
  REFUNDED: "Refunded",
};
