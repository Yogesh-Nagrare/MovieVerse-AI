import { resolveQueryEntities } from "../../10_entityResolver.js";
import { classifyQuery } from "../../12_queryClassifier.js";
import { handleGraphQuery } from "../../11_graphHandler.js";
import { handleSimilarityQuery } from "../../14_similarityHandler.js";

export async function processQuery(query) {

  const resolved = await resolveQueryEntities(query);

  const classification =
    await classifyQuery(query, resolved);

  let answer;

  if (classification.type === "similarity") {
    answer =
      await handleSimilarityQuery(query, resolved);
  } else {
    answer =
      await handleGraphQuery(query, resolved);
  }

  return {
    answer,
    classification,
    resolved
  };
}