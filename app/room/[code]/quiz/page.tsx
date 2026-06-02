type QuizPageProps = {
  params: {
    code: string;
  };
};

export default function QuizPage({ params }: QuizPageProps) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Quiz</h1>
      <p className="mt-2 text-gray-500">
        Опрос для комнаты {params.code}.
      </p>
    </main>
  );
}