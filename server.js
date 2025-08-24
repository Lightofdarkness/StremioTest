const express = require("express")
const addonInterface = require("./index")
const app = express()

app.get("/manifest.json", (req, res) => {
  res.send(addonInterface.manifest)
})

app.get("/:resource/:type/:id.json", (req, res) => {
  addonInterface.get(req.params)
    .then(resp => res.send(resp))
    .catch(e => res.status(500).send(e.toString()))
})

const PORT = process.env.PORT || 7000
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Addon actif sur http://0.0.0.0:${PORT}/manifest.json`)
)
