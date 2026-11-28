import test from "node:test";
import assert from "node:assert/strict";
import { currentUefaSquadClub, readUefaSquad, readUefaSquadResponse } from "../lib/core/uefa-squad.ts";

const now = new Date("2026-11-28T00:00:00Z");
const table = (role, name) => `<h2 class="squadlist--role">${role}</h2>
<pk-table><a href="/uefachampionsleague/clubs/players/123--player/" title="${name}">Oyuncu</a></pk-table>`;
const roster = `<h1 class="hideTitle">Fenerbah&#xE7;e SK Squad UEFA Champions League 2026/27</h1>
${table("Goalkeepers", "Tar&#x131;k &#xC7;etin")}
${table("Defenders", "Archie Brown")}
${table("Midfielders", "&#x130;smail Y&#xFC;ksek")}
${table("Forwards", "Vedat Muriqi")}`;

test("current football squad requests leave historical rosters and match lineups distinct", () => {
  for (const query of ["Fenerin güncel kadrosunu say", "Fenerbahçe’nin oyuncuları", "2026-2027 Fenerbahçe kadrosu"]) {
    assert.equal(currentUefaSquadClub(query, now), "fenerbahce", query);
  }
  for (const query of ["2024-2025 Fenerbahçe kadrosu", "Fenerbahçe basketbol kadrosu", "Fenerbahçe maç kadrosu ve ilk 11"]) {
    assert.equal(currentUefaSquadClub(query, now), null, query);
  }
  assert.equal(currentUefaSquadClub("Galatasaray’ın güncel kadrosunu say", now), "galatasaray");
  assert.equal(currentUefaSquadClub("Galatasary güncel kadrosu", now), "galatasaray");
  assert.equal(currentUefaSquadClub("Galatasaray 2024-2025 kadrosu", now), null);
});

test("UEFA roster requires the expected season and decodes Turkish names", () => {
  assert.equal(readUefaSquad(roster, "fenerbahce", now).groups[0].players[0], "Tarık Çetin");
  assert.equal(readUefaSquad(roster.replace("2026/27", "2024/25"), "fenerbahce", now), null);
  assert.equal(readUefaSquad(roster, "galatasaray", now), null);
  assert.equal(readUefaSquad(roster.replace("Fenerbah&#xE7;e SK", "Galatasaray A.&#x15E;."), "galatasaray", now).season, "2026/27");
});

test("current squad answers cite UEFA and handle an outdated result without inventing players", async () => {
  const signal = new AbortController().signal;
  const reply = await readUefaSquadResponse("fenerbahce", signal, async () => new Response(roster), now);
  assert.match(reply, /2026\/27 UEFA Şampiyonlar Ligi kayıtlı kadrosu/);
  assert.match(reply, /Vedat Muriqi/);
  assert.match(reply, /https:\/\/www\.uefa\.com\//);
  const unavailable = await readUefaSquadResponse("fenerbahce", signal,
    async () => new Response(roster.replace("2026/27", "2024/25")), now);
  assert.match(unavailable, /doğrulayamadım/);
  assert.doesNotMatch(unavailable, /Vedat Muriqi/);
});
