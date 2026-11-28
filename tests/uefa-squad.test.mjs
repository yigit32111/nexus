import test from "node:test";
import assert from "node:assert/strict";
import { discoverUefaClub, discoverUefaSquad, readUefaSquad } from "../lib/core/uefa-squad.ts";

const now = new Date("2026-11-28T00:00:00Z");
const table = (role, name) => `<h2 class="squadlist--role">${role}</h2>
<pk-table><a href="/uefachampionsleague/clubs/players/123--player/" title="${name}">Oyuncu</a></pk-table>`;
const roster = `<h1 class="hideTitle">Fenerbah&#xE7;e SK Squad UEFA Champions League 2026/27</h1>
${table("Goalkeepers", "Tar&#x131;k &#xC7;etin")}
${table("Defenders", "Archie Brown")}
${table("Midfielders", "&#x130;smail Y&#xFC;ksek")}
${table("Forwards", "Vedat Muriqi")}`;

test("UEFA club discovery works for an unlisted team and refuses an ambiguous pair", () => {
  const clubs = '<a href="/uefachampionsleague/clubs/1--fenerbahce/">Ignored</a>' +
    '<a href="/uefachampionsleague/clubs/52692--fenerbahce/">Fenerbahçe</a>' +
    '<a href="/uefachampionsleague/clubs/9850--juventus/">Juventus</a>';
  assert.equal(discoverUefaClub(clubs, "Fenerin güncel kadrosu", "uefachampionsleague"), "52692--fenerbahce");
  assert.equal(discoverUefaClub(clubs, "Juventus güncel kadrosu", "uefachampionsleague"), "9850--juventus");
  assert.equal(discoverUefaClub(clubs, "Juventus Fenerbahçe kadrosu", "uefachampionsleague"), null);
});

test("UEFA roster requires the expected season and decodes Turkish names", () => {
  assert.equal(readUefaSquad(roster, now).groups[0].players[0], "Tarık Çetin");
  assert.equal(readUefaSquad(roster.replace("2026/27", "2024/25"), now), null);
});

test("current squad answers follow the official directory and reject old rosters", async () => {
  const signal = new AbortController().signal;
  function fixture(squad) {
    return async input => {
      const url = new URL(input);
      if (url.hostname !== "www.uefa.com" || !url.pathname.startsWith("/uefachampionsleague/")) return new Response(null, {status: 404});
      if (url.pathname.endsWith("/squad/")) return new Response(squad);
      return new Response('<a href="/uefachampionsleague/clubs/52692--fenerbahce/">Fenerbahçe</a>');
    };
  }
  const reply = await discoverUefaSquad("Fenerin güncel kadrosu", signal, fixture(roster), now);
  assert.match(reply, /2026\/27 UEFA Şampiyonlar Ligi kayıtlı kadrosu/);
  assert.match(reply, /Vedat Muriqi/);
  assert.match(reply, /https:\/\/www\.uefa\.com\//);
  assert.equal(await discoverUefaSquad("Fenerbahçe kadrosu", signal,
    fixture(roster.replace("2026/27", "2024/25")), now), null);
  assert.equal(await discoverUefaSquad("2024-2025 Fenerbahçe kadrosu", signal,
    async () => assert.fail("historical query must not load the current list"), now), null);
});
