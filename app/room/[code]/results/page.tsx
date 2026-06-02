type ResultsPageProps = {
  params: {
    code: string;
  };
};

export default function ResultsPage({ params }: ResultsPageProps) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Results</h1>
      <p className="mt-2 text-gray-500">
        Результаты подбора для комнаты {params.code}.
      </p>
    </main>
  );
}