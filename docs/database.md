# Database Structure

## User

Пользователь системы.

```ts
User {
  id: string
  email?: string
  nickname: string

  avatarUrl?: string

  provider: "google" | "guest"

  createdAt: Date
  updatedAt: Date
}
```

---

## Room

Комната, в которой собираются игроки.

```ts
Room {
  id: string

  code: string

  status:
    | "waiting"
    | "matching"
    | "completed"

  createdBy?: string

  createdAt: Date
  updatedAt: Date
}
```

---

## RoomPlayer

Участник комнаты.

```ts
RoomPlayer {
  id: string

  roomId: string

  userId?: string

  nickname: string

  isOwner: boolean

  completedQuiz: boolean

  joinedAt: Date
}
```

---

## Question

Вопрос опросника.

```ts
Question {
  id: string

  title: string

  description?: string

  category:
    | "format"
    | "genre"
    | "mechanics"
    | "difficulty"
    | "session"
    | "budget"

  order: number

  isActive: boolean
}
```

---

## QuestionOption

Варианты ответа.

```ts
QuestionOption {
  id: string

  questionId: string

  label: string

  value: string

  score: number
}
```

---

## Answer

Ответ конкретного игрока.

```ts
Answer {
  id: string

  roomPlayerId: string

  questionId: string

  optionId: string

  createdAt: Date
}
```

---

## Game

Игра.

Источник данных:
RAWG + собственные теги.

```ts
Game {
  id: string

  rawgId: number

  steamUrl?: string

  title: string

  description?: string

  coverUrl?: string

  releasedAt?: Date

  rating?: number

  minPlayers: number

  maxPlayers: number

  createdAt: Date
  updatedAt: Date
}
```

---

## Tag

Тег игры.

```ts
Tag {
  id: string

  name: string

  slug: string
}
```

Примеры:

```text
coop
pvp
pve
survival
horror
crafting
building
strategy
sandbox
shooter
rpg
grind
hardcore
casual
funny
chill
competitive
```

---

## GameTag

Связь игры и тегов.

```ts
GameTag {
  gameId: string

  tagId: string
}
```

---

## MatchResult

Результат подбора для комнаты.

```ts
MatchResult {
  id: string

  roomId: string

  gameId: string

  score: number

  createdAt: Date
}
```

---

# Future Tables

Не используются в MVP.

---

## UserGameVote

Для будущих Tinder-карточек.

```ts
UserGameVote {
  id: string

  userId: string

  gameId: string

  vote:
    | "like"
    | "dislike"

  createdAt: Date
}
```

---

## UserPreference

Профиль интересов пользователя.

```ts
UserPreference {
  id: string

  userId: string

  tagId: string

  score: number
}
```

---

## MatchHistory

История подборов пользователя.

```ts
MatchHistory {
  id: string

  userId: string

  roomId: string

  createdAt: Date
}
```

---

# MVP Flow

1. Пользователь создает комнату.
2. Получает ссылку.
3. Отправляет друзьям.
4. Все проходят опрос.
5. Сервис рассчитывает совпадения.
6. Показывает топ игр.
7. Игроки переходят в Steam и начинают играть.
