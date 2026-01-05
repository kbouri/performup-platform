import { PageHeader } from "@/components/layout";
import { OnboardingWizard } from "@/components/students/onboarding-wizard";

export default function NewStudentPage() {
  return (
    <>
      <PageHeader
        title="Nouvel étudiant"
        description="Créez un nouveau profil étudiant en quelques étapes"
        breadcrumbs={[
          { label: "Étudiants", href: "/students" },
          { label: "Nouveau" },
        ]}
      />

      <OnboardingWizard />
    </>
  );
}

