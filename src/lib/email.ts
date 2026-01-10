/**
 * Email placeholder module
 * TODO: Replace with actual email service (Resend, SendGrid, etc.)
 */

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  role: string;
  professorType?: string;
  invitationLink: string;
  expiresAt: Date;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<boolean> {
  const { to, inviterName, role, professorType, invitationLink, expiresAt } = params;

  // Format role for display
  const roleDisplay =
    role === "MENTOR"
      ? "Mentor"
      : role === "PROFESSOR"
        ? `Professeur ${professorType === "QUANT" ? "Quantitatif" : "Verbal"}`
        : "Chef Executif";

  // TODO: Implement actual email sending
  console.log("=== EMAIL INVITATION (PLACEHOLDER) ===");
  console.log(`To: ${to}`);
  console.log(`Subject: Invitation a rejoindre PerformUp en tant que ${roleDisplay}`);
  console.log(`---`);
  console.log(`Bonjour,`);
  console.log(``);
  console.log(`${inviterName} vous invite a rejoindre la plateforme PerformUp en tant que ${roleDisplay}.`);
  console.log(``);
  console.log(`Cliquez sur le lien suivant pour accepter l'invitation et creer votre compte:`);
  console.log(`${invitationLink}`);
  console.log(``);
  console.log(`Ce lien expire le ${expiresAt.toLocaleDateString("fr-FR")} a ${expiresAt.toLocaleTimeString("fr-FR")}.`);
  console.log(``);
  console.log(`L'equipe PerformUp`);
  console.log("=== FIN EMAIL ===");

  return true;
}

interface SendPasswordResetEmailParams {
  to: string;
  resetLink: string;
  expiresAt: Date;
}

export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<boolean> {
  const { to, resetLink, expiresAt } = params;

  console.log("=== EMAIL RESET PASSWORD (PLACEHOLDER) ===");
  console.log(`To: ${to}`);
  console.log(`Subject: Reinitialisation de votre mot de passe PerformUp`);
  console.log(`---`);
  console.log(`Bonjour,`);
  console.log(``);
  console.log(`Vous avez demande a reinitialiser votre mot de passe.`);
  console.log(``);
  console.log(`Cliquez sur le lien suivant pour definir un nouveau mot de passe:`);
  console.log(`${resetLink}`);
  console.log(``);
  console.log(`Ce lien expire le ${expiresAt.toLocaleDateString("fr-FR")} a ${expiresAt.toLocaleTimeString("fr-FR")}.`);
  console.log(``);
  console.log(`Si vous n'avez pas demande cette reinitialisation, ignorez cet email.`);
  console.log(``);
  console.log(`L'equipe PerformUp`);
  console.log("=== FIN EMAIL ===");

  return true;
}

interface SendWelcomeEmailParams {
  to: string;
  firstName: string;
  role: string;
  loginLink: string;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<boolean> {
  const { to, firstName, role, loginLink } = params;

  const roleDisplay =
    role === "MENTOR"
      ? "mentor"
      : role === "PROFESSOR"
        ? "professeur"
        : role === "EXECUTIVE_CHEF"
          ? "chef executif"
          : "utilisateur";

  console.log("=== EMAIL BIENVENUE (PLACEHOLDER) ===");
  console.log(`To: ${to}`);
  console.log(`Subject: Bienvenue sur PerformUp!`);
  console.log(`---`);
  console.log(`Bonjour ${firstName},`);
  console.log(``);
  console.log(`Votre compte ${roleDisplay} a ete cree avec succes!`);
  console.log(``);
  console.log(`Connectez-vous a votre espace:`);
  console.log(`${loginLink}`);
  console.log(``);
  console.log(`A bientot sur PerformUp!`);
  console.log(``);
  console.log(`L'equipe PerformUp`);
  console.log("=== FIN EMAIL ===");

  return true;
}
