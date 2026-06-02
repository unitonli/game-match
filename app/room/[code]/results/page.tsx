import { ResultsContent } from "./results-content";

type ResultsPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { code } = await params;

  return <ResultsContent roomCode={code} />;
}
