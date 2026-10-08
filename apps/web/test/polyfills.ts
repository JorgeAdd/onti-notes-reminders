// Loaded before React so it sees the constructor.
// jsdom has no AnimationEvent; without it React listens for a prefixed name and animationend is lost.
globalThis.AnimationEvent ??=
  class AnimationEvent extends Event {} as typeof globalThis.AnimationEvent
