export type Maybe<T> = T | null | undefined;

export const getUUID = () => {
  const date = (+Date.now()).toString(36);
  let random = "";
  for (let i = 0; i < 20; i++) {
    random += Math.floor(Math.random() * 9);
  }
  random = (+random).toString(36);
  return `${date}${random}`;
};
