export enum RoomRole {
  Host = 'host',
  Player = 'player',
}

export enum Verdict {
  Yes = 'yes',
  No = 'no',
  Both = 'both',
  Irrelevant = 'irrelevant',
}

export enum QuestionQuality {
  None = 'none',
  Helpful = 'helpful',
  Key = 'key',
  Breakthrough = 'breakthrough',
}

export enum TruthGuess {
  None = 'none',
  Clue = 'clue',
  Motive = 'motive',
  Full = 'full',
}
