import { prisma } from "@/lib/db/prisma";

// Notification types
export type NotificationType = 
  | "NEW_MESSAGE"
  | "TASK_ASSIGNED"
  | "TASK_DUE"
  | "TASK_COMPLETED"
  | "COURSE_REMINDER"
  | "EVENT_INVITATION"
  | "EVENT_REMINDER"
  | "DOCUMENT_SHARED"
  | "ESSAY_FEEDBACK"
  | "ESSAY_SUBMITTED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_DUE"
  | "SCORE_ADDED"
  | "SCHOOL_APPLICATION"
  | "GENERAL";

// Notification templates
const notificationTemplates: Record<NotificationType, { title: string; icon: string }> = {
  NEW_MESSAGE: { title: "Nouveau message", icon: "💬" },
  TASK_ASSIGNED: { title: "Nouvelle tâche assignée", icon: "📋" },
  TASK_DUE: { title: "Tâche à faire", icon: "⏰" },
  TASK_COMPLETED: { title: "Tâche terminée", icon: "✅" },
  COURSE_REMINDER: { title: "Rappel de cours", icon: "📚" },
  EVENT_INVITATION: { title: "Invitation à un événement", icon: "📅" },
  EVENT_REMINDER: { title: "Rappel d\'événement", icon: "🔔" },
  DOCUMENT_SHARED: { title: "Document partagé", icon: "📄" },
  ESSAY_FEEDBACK: { title: "Feedback sur votre essay", icon: "✍️" },
  ESSAY_SUBMITTED: { title: "Essay soumis", icon: "📝" },
  PAYMENT_RECEIVED: { title: "Paiement reçu", icon: "💰" },
  PAYMENT_DUE: { title: "Paiement en attente", icon: "💳" },
  SCORE_ADDED: { title: "Nouveau score ajouté", icon: "📊" },
  SCHOOL_APPLICATION: { title: "Candidature école", icon: "🎓" },
  GENERAL: { title: "Notification", icon: "📢" },
};

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  title?: string;
  data?: Record<string, unknown>;
  eventInvitationId?: string;
}

// Create a single notification
export async function createNotification({
  userId,
  type,
  message,
  title,
  data,
  eventInvitationId,
}: CreateNotificationParams) {
  try {
    const template = notificationTemplates[type];
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title: title || template.icon + " " + template.title,
        message,
        data: data || null,
        eventInvitationId,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

// Create notifications for multiple users
export async function createNotificationsForUsers(
  userIds: string[],
  type: NotificationType,
  message: string,
  title?: string,
  data?: Record<string, unknown>
) {
  try {
    const template = notificationTemplates[type];
    
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title: title || template.icon + " " + template.title,
        message,
        data: data || null,
      })),
    });

    return notifications;
  } catch (error) {
    console.error("Error creating notifications:", error);
    return null;
  }
}

// Notification helpers for specific events

// New message notification
export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  conversationId: string,
  preview: string
) {
  const truncated = preview.length > 100 ? preview.slice(0, 100) + "..." : preview;
  return createNotification({
    userId: recipientId,
    type: "NEW_MESSAGE",
    message: senderName + ": " + truncated,
    data: { conversationId, senderName },
  });
}

// Task assigned notification
export async function notifyTaskAssigned(
  userId: string,
  taskTitle: string,
  taskId: string,
  assignedBy: string
) {
  return createNotification({
    userId,
    type: "TASK_ASSIGNED",
    message: \'"\' + taskTitle + \'" vous a été assignée par \' + assignedBy,
    data: { taskId, taskTitle, assignedBy },
  });
}

// Task due reminder
export async function notifyTaskDue(
  userId: string,
  taskTitle: string,
  taskId: string,
  dueDate: Date
) {
  const formattedDate = dueDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  
  return createNotification({
    userId,
    type: "TASK_DUE",
    message: \'La tâche "\' + taskTitle + \'" est prévue pour le \' + formattedDate,
    data: { taskId, taskTitle, dueDate: dueDate.toISOString() },
  });
}

// Course reminder
export async function notifyCourseReminder(
  userId: string,
  courseName: string,
  eventId: string,
  startTime: Date,
  location?: string
) {
  const formattedTime = startTime.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = startTime.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  
  return createNotification({
    userId,
    type: "COURSE_REMINDER",
    message: \'Rappel: "\' + courseName + \'" le \' + formattedDate + \' à \' + formattedTime + (location ? " - " + location : ""),
    data: { eventId, courseName, startTime: startTime.toISOString(), location },
  });
}

// Event invitation
export async function notifyEventInvitation(
  userId: string,
  eventTitle: string,
  eventId: string,
  invitationId: string,
  organizer: string,
  startTime: Date
) {
  const formattedDate = startTime.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  return createNotification({
    userId,
    type: "EVENT_INVITATION",
    message: organizer + \' vous invite à "\' + eventTitle + \'" le \' + formattedDate,
    data: { eventId, eventTitle, organizer, startTime: startTime.toISOString() },
    eventInvitationId: invitationId,
  });
}

// Document shared
export async function notifyDocumentShared(
  userId: string,
  documentName: string,
  documentId: string,
  sharedBy: string
) {
  return createNotification({
    userId,
    type: "DOCUMENT_SHARED",
    message: sharedBy + \' a partagé "\' + documentName + \'" avec vous\',
    data: { documentId, documentName, sharedBy },
  });
}

// Essay feedback
export async function notifyEssayFeedback(
  userId: string,
  essayTitle: string,
  essayId: string,
  reviewerName: string
) {
  return createNotification({
    userId,
    type: "ESSAY_FEEDBACK",
    message: reviewerName + \' a laissé un feedback sur votre essay "\' + essayTitle + \'"\',
    data: { essayId, essayTitle, reviewerName },
  });
}

// Essay submitted (for mentors)
export async function notifyEssaySubmitted(
  mentorId: string,
  essayTitle: string,
  essayId: string,
  studentName: string
) {
  return createNotification({
    userId: mentorId,
    type: "ESSAY_SUBMITTED",
    message: studentName + \' a soumis l'essay "\' + essayTitle + \'" pour révision\',
    data: { essayId, essayTitle, studentName },
  });
}

// Payment received
export async function notifyPaymentReceived(
  userId: string,
  amount: number,
  description: string
) {
  return createNotification({
    userId,
    type: "PAYMENT_RECEIVED",
    message: "Paiement de " + amount.toFixed(2) + \'€ reçu pour "\' + description + \'"\',
    data: { amount, description },
  });
}

// Score added
export async function notifyScoreAdded(
  userId: string,
  testType: string,
  score: number | string
) {
  return createNotification({
    userId,
    type: "SCORE_ADDED",
    message: "Votre score " + testType + " de " + score + " a été enregistré",
    data: { testType, score },
  });
}
