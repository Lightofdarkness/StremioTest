const { addonBuilder } = require("stremio-addon-sdk")
const fetch = require("node-fetch")

// ⚙️ CONFIGURATION
const TMDB_KEY = "TA_CLE_TMDB"
const MDBLISTS = [
  {
    id: "films-action",
    name: "Films Action",
    url: "https://mdblist.com/lists/TON_USER/films-action/json",
    type: "movie"
  },
  {
    id: "series-populaires",
    name: "Séries Populaires",
    url: "https://mdblist.com/lists/TON_USER/series-populaires/json",
    type: "series"
  }
]

// --- BUILDER ---
const builder = new addonBuilder({
  id: "org.florian.mdblist",
  version: "1.0.0",
  name: "MDBList FR",
  description: "Intègre des listes MDBList avec métadonnées TMDB en français",
  catalogs: MDBLISTS.map(l => ({
    type: l.type,
    id: l.id,
    name: l.name
  })),
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
})

// --- HANDLERS ---
// Catalogs
builder.defineCatalogHandler(async ({ type, id }) => {
  let listConf = MDBLISTS.find(l => l.id === id)
  if (!listConf) return { metas: [] }

  let res = await fetch(listConf.url)
  let list = await res.json()

  let metas = await Promise.all(list.map(async (item) => {
    // On déduit l’ID TMDB
    let tmdbId = item.tmdb_id || null
    if (!tmdbId && item.imdb_id) {
      // fallback imdb -> tmdb
      let findRes = await fetch(
        `https://api.themoviedb.org/3/find/${item.imdb_id}?api_key=${TMDB_KEY}&language=fr-FR&external_source=imdb_id`
      )
      let find = await findRes.json()
      tmdbId = (type === "movie" ? find.movie_results?.[0]?.id : find.tv_results?.[0]?.id) || null
    }

    if (!tmdbId) return null

    let tmdbRes = await fetch(
      `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=fr-FR`
    )
    let tmdb = await tmdbRes.json()

    return {
      id: `${type}:${tmdb.id}`,
      type,
      name: tmdb.title || tmdb.name,
      poster: tmdb.poster_path ? "https://image.tmdb.org/t/p/w500" + tmdb.poster_path : null,
      description: tmdb.overview,
      year: (tmdb.release_date || tmdb.first_air_date || "").split("-")[0]
    }
  }))

  return { metas: metas.filter(Boolean) }
})

// Meta
builder.defineMetaHandler(async ({ type, id }) => {
  let tmdbId = id.split(":")[1]
  let res = await fetch(
    `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=fr-FR`
  )
  let data = await res.json()

  return {
    meta: {
      id,
      type,
      name: data.title || data.name,
      poster: data.poster_path ? "https://image.tmdb.org/t/p/w500" + data.poster_path : null,
      description: data.overview,
      year: (data.release_date || data.first_air_date || "").split("-")[0],
      genres: data.genres?.map(g => g.name),
      runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null)
    }
  }
})

// --- EXPORT ---
module.exports = builder.getInterface()
