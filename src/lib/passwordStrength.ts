// Real password-strength estimation via zxcvbn (the Dropbox research
// library), loaded lazily so its dictionaries never weigh down the main
// bundle — only auth pages that actually score a password fetch it.

export type StrengthResult = {
  /** 0 (guessable instantly) … 4 (very strong). */
  score: 0 | 1 | 2 | 3 | 4;
  warning: string;
  suggestion: string;
};

type Scorer = (password: string, userInputs?: string[]) => StrengthResult;

let scorer: Promise<Scorer> | null = null;

export function loadStrength(): Promise<Scorer> {
  if (!scorer) {
    scorer = (async () => {
      const [{ ZxcvbnFactory }, common, en] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-en"),
      ]);
      const engine = new ZxcvbnFactory({
        translations: en.translations,
        graphs: common.adjacencyGraphs,
        dictionary: { ...common.dictionary, ...en.dictionary },
      });
      return (password: string, userInputs: string[] = []): StrengthResult => {
        const r = engine.check(password, userInputs);
        return {
          score: r.score,
          warning: r.feedback.warning || "",
          suggestion: r.feedback.suggestions?.[0] || "",
        };
      };
    })();
  }
  return scorer;
}
