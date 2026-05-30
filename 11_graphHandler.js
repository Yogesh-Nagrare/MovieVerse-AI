// =====================================================================
// 11_graphHandler.js — UNIFIED GRAPH QUERY HANDLER
// =====================================================================
// FIXES:
//   - Relationship direction: Director-[:DIRECTED]->Movie (not reverse)
//   - Quota error handling with 65s wait + retry
//   - Better Cypher generation prompt with correct examples
// =====================================================================

import { driver, genai } from "./2_config.js";
import { buildCypher } from "./8_cypherTemplates.js";

const MODEL = "gemini-2.5-flash-lite";

// ── Helper: call Gemini with quota retry ──
async function callGemini(prompt) {
  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return response.text.trim();
  } catch (err) {
    const is429 = err.message?.includes("429") || err.status === 429;
    if (is429) {
      console.warn("   ⚠️  Gemini quota hit. Waiting 65s...");
      await new Promise(r => setTimeout(r, 65000));
      const response = await genai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return response.text.trim();
    }
    throw err;
  }
}

// =====================================================================
// Step 1: LLM creates query plan WITH resolved entity context
// =====================================================================
async function createQueryPlan(query, resolvedEntities) {
  const entityContext = resolvedEntities.entities
    .map((e) => `"${e.searchTerm}" = ${e.label} (exact name in DB: "${e.nodeName}")`)
    .join("\n") || "No entities resolved.";

  const unresolvedContext = resolvedEntities.unresolved.length > 0
    ? `\nNOT FOUND in database: ${resolvedEntities.unresolved.join(", ")}`
    : "";

  const prompt = `You are a query planner for a movie knowledge graph.

RESOLVED ENTITIES (use exact nodeName values in filters):
${entityContext}${unresolvedContext}

GRAPH SCHEMA — IMPORTANT relationship directions:
  (Director)-[:DIRECTED]->(Movie)       ← Director points TO Movie
  (Actor)-[:ACTED_IN]->(Movie)          ← Actor points TO Movie
  (Movie)-[:BELONGS_TO]->(Genre)        ← Movie points TO Genre
  (Movie)-[:EXPLORES]->(Theme)          ← Movie points TO Theme
  (Movie)-[:WON]->(Award)               ← Movie points TO Award

Nodes: Movie(title,year), Director(name), Actor(name), Genre(name), Theme(name), Award(name,category)

STEP TYPES — output a JSON plan using ONLY these:

1. {"type":"traversal","from":"Label","rel":"RELATIONSHIP","to":"Label"}
2. {"type":"filter","field":"Label.property","op":"=","value":"exact value"}
   Operators: =, <>, >, <, >=, <=, CONTAINS, STARTS WITH
3. {"type":"projection","fields":["Label.property"],"distinct":true}
4. {"type":"aggregation","function":"count","field":"Label.property","alias":"total","groupBy":"Label.property"}
5. {"type":"sort","field":"Label.property","direction":"ASC"}
6. {"type":"limit","value":10}
7. {"type":"describe","label":"Label","name":"exact node name from resolved entities"}
8. {"type":"path","fromLabel":"Label","fromName":"name","toLabel":"Label","toName":"name"}

CORRECT EXAMPLES (note relationship directions):

"who directed Movie 0001" (Movie 0001 = Movie):
{"steps":[
  {"type":"traversal","from":"Director","rel":"DIRECTED","to":"Movie"},
  {"type":"filter","field":"Movie.title","op":"=","value":"Movie 0001"},
  {"type":"projection","fields":["Director.name"],"distinct":true}
]}

"action movies with Zendaya" (Action = Genre, Zendaya = Actor):
{"steps":[
  {"type":"traversal","from":"Actor","rel":"ACTED_IN","to":"Movie"},
  {"type":"traversal","from":"Movie","rel":"BELONGS_TO","to":"Genre"},
  {"type":"filter","field":"Actor.name","op":"=","value":"Zendaya"},
  {"type":"filter","field":"Genre.name","op":"=","value":"Action"},
  {"type":"projection","fields":["Movie.title","Movie.year"],"distinct":true}
]}

"tell me about Movie 0315" (Movie 0315 = Movie):
{"steps":[{"type":"describe","label":"Movie","name":"Movie 0315"}]}

"who is James Cameron" (James Cameron = Director):
{"steps":[{"type":"describe","label":"Director","name":"James Cameron"}]}

"how is Zendaya related to James Cameron" (Zendaya = Actor, James Cameron = Director):
{"steps":[{"type":"path","fromLabel":"Actor","fromName":"Zendaya","toLabel":"Director","toName":"James Cameron"}]}

"how many action movies" (Action = Genre):
{"steps":[
  {"type":"traversal","from":"Movie","rel":"BELONGS_TO","to":"Genre"},
  {"type":"filter","field":"Genre.name","op":"=","value":"Action"},
  {"type":"aggregation","function":"count","field":"Movie.title","alias":"total"}
]}

Output ONLY valid JSON. No markdown, no backticks, no explanation.

Query: ${query}`;

  try {
    const raw = (await callGemini(prompt))
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse plan:", err.message?.substring(0, 100));
    throw new Error("Query planning failed. Please rephrase your question.");
  }
}

// =====================================================================
// DESCRIBE: Get ALL relationships around an entity
// =====================================================================
async function executeDescribe(label, name) {
  const session = driver.session({ defaultAccessMode: "READ" });

  try {
    let cypher;
    const params = { name };

    switch (label) {
      case "Movie":
        cypher = `
          MATCH (m:Movie {title: $name})
          OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
          OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
          OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
          OPTIONAL MATCH (m)-[:EXPLORES]->(t:Theme)
          OPTIONAL MATCH (m)-[:WON]->(aw:Award)
          RETURN m.title AS title, m.year AS year,
                 collect(DISTINCT d.name) AS directors,
                 collect(DISTINCT a.name) AS actors,
                 collect(DISTINCT g.name) AS genres,
                 collect(DISTINCT t.name) AS themes,
                 collect(DISTINCT {name: aw.name, category: aw.category}) AS awards`;
        break;
      case "Director":
        cypher = `
          MATCH (d:Director {name: $name})-[:DIRECTED]->(m:Movie)
          OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
          OPTIONAL MATCH (m)-[:EXPLORES]->(t:Theme)
          OPTIONAL MATCH (m)-[:WON]->(aw:Award)
          OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
          RETURN d.name AS name,
                 collect(DISTINCT {title: m.title, year: m.year}) AS movies,
                 collect(DISTINCT g.name) AS genres,
                 collect(DISTINCT t.name) AS themes,
                 collect(DISTINCT a.name) AS collaborators,
                 collect(DISTINCT {name: aw.name, category: aw.category}) AS awards`;
        break;
      case "Actor":
        cypher = `
          MATCH (a:Actor {name: $name})-[:ACTED_IN]->(m:Movie)
          OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
          OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
          OPTIONAL MATCH (m)-[:EXPLORES]->(t:Theme)
          OPTIONAL MATCH (m)-[:WON]->(aw:Award)
          RETURN a.name AS name,
                 collect(DISTINCT {title: m.title, year: m.year}) AS movies,
                 collect(DISTINCT d.name) AS directors,
                 collect(DISTINCT g.name) AS genres,
                 collect(DISTINCT t.name) AS themes,
                 collect(DISTINCT {name: aw.name, category: aw.category}) AS awards`;
        break;
      case "Genre":
        cypher = `
          MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre {name: $name})
          OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
          RETURN g.name AS name,
                 collect(DISTINCT {title: m.title, year: m.year}) AS movies,
                 collect(DISTINCT d.name) AS directors`;
        break;
      case "Theme":
        cypher = `
          MATCH (m:Movie)-[:EXPLORES]->(t:Theme {name: $name})
          OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
          RETURN t.name AS name,
                 collect(DISTINCT {title: m.title, year: m.year}) AS movies,
                 collect(DISTINCT d.name) AS directors`;
        break;
      case "Award":
        cypher = `
          MATCH (m:Movie)-[:WON]->(aw:Award {name: $name})
          OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
          RETURN aw.name AS name,
                 collect(DISTINCT {title: m.title, year: m.year, category: aw.category}) AS movies,
                 collect(DISTINCT d.name) AS directors`;
        break;
      default:
        return [{ error: `Unknown label: ${label}` }];
    }

    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj = {};
      record.keys.forEach((key) => {
        const value = record.get(key);
        obj[key] = typeof value === "object" && value?.toNumber ? value.toNumber() : value;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

// =====================================================================
// PATH: Find shortest path between two entities
// =====================================================================
async function executePath(fromLabel, fromName, toLabel, toName) {
  const session = driver.session({ defaultAccessMode: "READ" });

  try {
    const fromProp = fromLabel === "Movie" ? "title" : "name";
    const toProp = toLabel === "Movie" ? "title" : "name";

    const cypher = `
      MATCH (a:${fromLabel} {${fromProp}: $fromName}),
            (b:${toLabel} {${toProp}: $toName}),
            path = shortestPath((a)-[*..6]-(b))
      RETURN [node IN nodes(path) | {
        labels: labels(node),
        name: coalesce(node.name, node.title),
        year: node.year
      }] AS pathNodes,
      [rel IN relationships(path) | type(rel)] AS pathRels`;

    const result = await session.run(cypher, { fromName, toName });

    if (result.records.length === 0) {
      return [{ error: `No connection found between ${fromName} and ${toName}` }];
    }

    return result.records.map((record) => ({
      pathNodes: record.get("pathNodes"),
      pathRels: record.get("pathRels"),
    }));
  } finally {
    await session.close();
  }
}

// =====================================================================
// Execute template-based Cypher (factual queries)
// =====================================================================
async function executeTemplateCypher(plan) {
  const { cypher, params } = buildCypher(plan);
  console.log(`   🔒 Cypher: ${cypher}`);

  const session = driver.session({ defaultAccessMode: "READ" });

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const obj = {};
      record.keys.forEach((key) => {
        const value = record.get(key);
        obj[key] = typeof value === "object" && value?.toNumber ? value.toNumber() : value;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

// =====================================================================
// MAIN: Handle any graph query
// =====================================================================
async function handleGraphQuery(query, resolvedEntities) {
  console.log("   📋 Creating query plan...");
  const plan = await createQueryPlan(query, resolvedEntities);
  console.log("   📋 Plan:", JSON.stringify(plan, null, 2));

  let records;
  const firstStep = plan.steps[0];

  if (firstStep.type === "describe") {
    // Use resolved nodeName — not the raw plan name
    const resolvedEntity = resolvedEntities.entities.find(
      e => e.label === firstStep.label ||
      e.nodeName.toLowerCase().includes(firstStep.name.toLowerCase()) ||
      firstStep.name.toLowerCase().includes(e.searchTerm.toLowerCase())
    );
    const actualName = resolvedEntity?.nodeName || firstStep.name;
    console.log(`   🗄️  Describing ${firstStep.label}: "${actualName}"...`);
    records = await executeDescribe(firstStep.label, actualName);

  } else if (firstStep.type === "path") {
    const fromResolved = resolvedEntities.entities.find(
      e => e.label === firstStep.fromLabel
    )?.nodeName || firstStep.fromName;
    const toResolved = resolvedEntities.entities.find(
      e => e.label === firstStep.toLabel && e.nodeName !== fromResolved
    )?.nodeName || firstStep.toName;
    console.log(`   🗄️  Finding path: ${fromResolved} → ${toResolved}...`);
    records = await executePath(firstStep.fromLabel, fromResolved, firstStep.toLabel, toResolved);

  } else {
    console.log("   🗄️  Querying Neo4j...");
    records = await executeTemplateCypher(plan);
  }

  console.log(`   🗄️  Got ${records.length} results`);

  if (records.length === 0 || records[0]?.error) {
    return `I couldn't find an answer: ${records[0]?.error || "No results found"}`;
  }

  const responsePrompt = `Given this question and database results, write a clear natural language answer.
Do NOT mention databases, Cypher, JSON, or technical details.
Be informative and include all relevant details.

Question: ${query}

Results:
${JSON.stringify(records.slice(0, 50), null, 2)}
${records.length > 50 ? `\n... and ${records.length - 50} more` : ""}`;

  return await callGemini(responsePrompt);
}

export { handleGraphQuery };