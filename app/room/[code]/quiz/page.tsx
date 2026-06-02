import { QuizForm } from "./quiz-form";

type QuizPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const { code } = await params;

  return <QuizForm roomCode={code} />;
}
