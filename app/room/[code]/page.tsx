type RoomPageProps = {
  params: {
    code: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Room {params.code}</h1>
      <p className="mt-2 text-gray-500">
        Здесь будет список игроков и ссылка на опрос.
      </p>
    </main>
  );
}