# Free life profile data

`build_profiles.py RAW_FOLDER` rebuilds `artifacts/no-rules/data/life-profiles.json`.
Install the exact Babel version recorded in `sources.languagesCurrencies` into an
isolated environment; its territory language/currency data is derived from CLDR.
The raw folder must contain `SE.PRM.AGES.json`, `SE.PRM.DURS.json`, `SE.SEC.DURS.json`
from the three URLs recorded in the resulting file. Original response hashes are
recorded for audit. No credentials, paid service or generative API is involved.

The snapshot uses latest non-null 2010–2025 school structure values. It does not
supply historical school reforms, national year-start dates, a curriculum, actual
institutions, tuition, salary tables or FX rates. Those remain explicitly modelled
parameters; no missing value is silently presented as country data.

`biography-report.ts` runs actual production generation/simulation and produces a
reviewable timeline for a seeded Angolan birth in Chongoroi. It does not inject
prewritten outcomes. See the test README for the command.
