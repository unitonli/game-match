export type QuestionType = "single-select" | "multi-select";

export type QuestionOption = {
  value: string;
  label: string;
};

export type Question = {
  id: string;
  key: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
};
