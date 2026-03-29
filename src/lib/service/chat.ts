export const getChatKey = (user_id1: string, user_id2: string) => {
  const sortedIds = [user_id1, user_id2].sort();
  const oneToOneKey = `${sortedIds[0]}_${sortedIds[1]}`;
  return oneToOneKey;
};
