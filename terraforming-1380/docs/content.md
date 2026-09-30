# Terraforming Contractor #1380 — Content

| | |
| --- | --- |
| **Status** | Draft v0.1 |
| **Last updated** | 2026-09-29 |
| **Purpose** | Every line the player reads, and every classification, in one place. Easy to edit, easy to review for tone. |
| **Rule** | Each entry has a **key**. The game loads text by key from `src/content/*.json`. Changing the wording here and in the JSON should never need a code change. |

**Voice guide.** The company is calm, warm, and businesslike, and describes destruction as optimization. It never raises its voice and never apologizes. The predecessor (#1379) is terse and flat. The unknown is minimal: fewer words each time it speaks.

---

## 1. Opening

`intro.title`
```text
ARES-9
21 OCTOBER 2079

CENTENNIAL TERRAFORMING INITIATIVE

Current Operator:
TERRAFORMING CONTRACTOR #1380
```

`intro.directive`
```text
MAKE ARES-9 VALUABLE.
```

`intro.billionaire`
> "Humanity has officially become multiplanetary."

---

## 2. Base systems (labels)

| Key | Label |
| --- | --- |
| `base.extraction` | Extraction Terminal |
| `base.bioscan` | Bioscan Lab |
| `base.terraform` | Terraform Console |
| `base.echo` | Deep Echo Array |
| `base.name` | Silent Shore Terraforming Facility |

---

## 3. Company vocabulary

Use the right-hand phrase for anything the company says.

| Reality | Key | Company phrase |
| --- | --- | --- |
| Life | `vocab.life` | Non-commercial biomass |
| Ruins | `vocab.ruins` | Obsolete settlement material |
| Ecological damage | `vocab.damage` | Site preparation |
| Mass dug away | `vocab.mass` | Exported resources |
| Signal exposure | `vocab.exposure` | Historical reach |
| Planet destroyed | `vocab.destroyed` | Asset connection lost |

---

## 4. Notices

Templates use `{placeholders}`.

`notice.dev_readiness`
```text
Development Readiness {delta}%
Native biomass {biomassDelta}%
```
Example: `Development Readiness +12% / Native biomass −31%`

`notice.ownership`
```text
Congratulations!
You now own {percent}% of Ares-9.
```
Example value: `0.00004`

`notice.sponsor`
```text
This sunset is sponsored by
MULTIPLANETARY FUTURES™
```

`notice.canister_full`
```text
Canister at capacity.
Surplus material has been exported.
```

`notice.canister_empty`
```text
Insufficient material.
Please continue site preparation nearby.
```

`notice.trapped`
```text
Operator position: unreachable.
Emergency Extraction is available.
Fee applies.
```

`notice.energy_low`
```text
Remaining budget is limited.
Please finalize your contribution.
```

`notice.biomass_hit`
```text
Non-commercial biomass affected: {percent}%
```

`notice.corporate_value`
```text
CORPORATE VALUE: {value}
PLANET REMAINING: {percent}%
```

`notice.first_broadcast`
```text
FIRST TRANSMISSION FROM ARES-9

Historical Significance: +30
Corporate Value: +$900M
Shareholder Confidence: +18%
```

---

## 5. Archive: #1379

`archive.1379.recovered`
```text
ARCHIVE RECOVERED

PREVIOUS OPERATOR: #1379
STATUS: TERMINATED

Final message:
DO NOT ECHO.
ATTENTION IS IRREVERSIBLE.
```

`archive.1379.company_reply`
```text
NOTICE:
Operator #1379 was dismissed for
failure to meet communication targets.
```

`archive.local_restored` (Silent ending, optional)
```text
LOCAL ARCHIVE RESTORED

Thank you for keeping quiet.
```

---

## 6. Audit

`audit.header`
```text
CONTRACT PERIOD COMPLETE
```

`audit.lines` (shown in sequence)
```text
Scanning planetary geometry...
Calculating remaining mass...
Auditing unregistered life...
Searching for unauthorized transmissions...
Estimating shareholder value...
Checking cosmic observers...
```

`audit.result` (template)
```text
PLANET REMAINING: {remaining}%
MARKET VALUE: {value}
BIOSPHERE: {biosphereBand}
HISTORICAL SIGNIFICANCE: {historyBand}
SHAPE: {shapeWords}

YOU CREATED:
{classificationName}
```

`audit.example`
```text
PLANET REMAINING: 18.2%
MARKET VALUE: $4.1 TRILLION
BIOSPHERE: ENDANGERED
HISTORICAL SIGNIFICANCE: ICONIC
SHAPE: SPINY / IRREGULAR

YOU CREATED:
A TREASURE-STUFFED HEDGEHOG
```

`audit.fate` (one of)
```text
UNNOTICED
RECENTLY NOTICED
BEING OBSERVED
NO LONGER EXISTS
```

Band words for biosphere / history (to be tuned): biosphere `THRIVING · STABLE · ENDANGERED · NEGLIGIBLE`; history `UNRECORDED · NOTABLE · ICONIC · LEGENDARY`.

---

## 7. Ending text

`ending.heard`
```text
UNKNOWN INBOUND OBJECT

Distance: calculating...
Velocity: calculating...
Arrival: calculating...
```
then, faint:
> **We heard you, 1380.**

Hard cut to black.

`ending.observed`
Same as `ending.heard`, but the values read `undefined` or `--`, the interference grows, and the message repeats once, more broken.

`ending.erased.a`
```text
PLANETARY CONNECTION LOST

ASSET VALUE: $0
HISTORICAL SIGNIFICANCE: 100%

Contractor #1380 successfully entered history.
```

`ending.erased.b` (cut-off variant)
```text
YOU CREATED:
THE UNIVERSE'S LOUDEST GREEN PINEA—

[PLANETARY ASSET NOT FOUND]

Last known classification:
A BRIEFLY FAMOUS GREEN PINEAPPLE

2079–2079
```

---

## 8. Classifications

`MVP` = in the first version (6). Conditions below are **design-level intent**; the exact numbers are in `content/classifications.json` and `tuning.md`.

### 8.1 Main outcomes

| MVP | Key | Name | Rough conditions | Meaning |
| :-: | --- | --- | --- | --- |
| ✔ | `concrete_paper` | A Reinforced-Concrete Sheet of Paper | Extremely flat, lots of construction, stable, very low mass | Planned so safely it barely counts as a planet |
| ✔ | `chip_crumbs` | A Historically Significant Pile of Chip Crumbs | Heavy fragmentation, high Historical Significance | Destruction packaged as progress |
| ✔ | `green_pineapple` | A Biodiverse Green Pineapple | High Biosphere, spiky surface | Full of life, not safe to approach |
| ✔ | `treasure_hedgehog` | A Treasure-Stuffed Hedgehog | High mineral value, many mines and spikes | Very rich, very hard to approach |
| ✔ | `tax_haven_doughnut` | A Luxury Tax-Haven Doughnut | Ring shape with a through-hole, high Capital and facilities | Corporate optimization turned into geometry |
| ✔ | `soap_bubble` | A Very Expensive Soap Bubble | Hollow thin shell, high valuation, low Stability | A commercial myth that pops at a touch |
|  | `gilded_colander` | A Gilded Colander | High Capital, many voids | The valuable parts have all been taken |
|  | `moldy_meatball` | A Moldy Meatball | Near-spherical, high Biosphere, low Stability | Alive, but can't be kept |
|  | `expensive_parking_lot` | An Expensive Parking Lot | Flat, connected, stable; high Development Readiness, low Biosphere | Convenient for further development, no living world |
|  | `breathing_swiss_cheese` | A Breathing Swiss Cheese | Many tunnels, high Biosphere | A damaged planet whose interior still holds an ecosystem |
|  | `ghost_mooncake` | A Ghost-Filled Mooncake | Intact shell, high Planetary Memory | Looks ordinary, full of buried history |
|  | `corporate_wedding_cake` | A Corporate Wedding Cake | Many regular tiered platforms, high Development Readiness and Capital | Space and class planned together |
|  | `pyramid_scheme` | An Interstellar Pyramid Scheme | Pyramid form, high corporate value and monuments | Geometry and business meaning collide |
|  | `misplaced_baguette` | A Baguette in the Wrong Galaxy | Extremely elongated, no clear function | Creativity escaping every plan metric |
|  | `screaming_urchin` | A Screaming Sea Urchin | Many spikes, frequent broadcasting | The whole planet demanding the universe's attention |
|  | `thirty_seven_planets` | 37 Small Planets Pretending to Be One | Splits into many pieces of similar size | Fragments marketed as a single asset |

### 8.2 Rare outcomes

| Key | Name | Condition |
| --- | --- | --- |
| `museum_nobody_visits` | A Museum Nobody Can Visit | Very high Planetary Memory, very low Development Readiness |
| `pineapple_with_mortgage` | A Pineapple With a Mortgage | High Biosphere and Development Readiness, but negative Capital |
| `expensive_hole` | A Very Expensive Hole | Extremely high Capital, almost no mass left |
| `valuable_basketball` | Humanity's Most Valuable Basketball | Very small, near-spherical, very profitable |
| `underfunded_rock` | An Underfunded Rock | All metrics low |
| `corporate_meatball` | The Universe's First Corporate Meatball | Near-spherical, many corporate facilities, high Historical Significance |

### 8.3 Fate lines (optional flavor after the name)

To be written. Suggested shape: one short sentence per fate, in company voice for *UNNOTICED*, in a dry system voice for *RECENTLY NOTICED*, and unfinished for *BEING OBSERVED*.

---

## 9. Tools and modules (short descriptions for the backpack)

| Key | Name | One-line description |
| --- | --- | --- |
| `tool.detector` | Detector | Inspect a small patch for hidden signals. |
| `mod.deepScanner` | Deep Scanner | Reads deeper, and farther, than is wise. |
| `mod.wideDrill` | Wide Drill | Removes more planet per swing. |
| `mod.bioSeeder` | Bio Seeder | Keeps what you find alive. For a price. |
| `mod.stabilizer` | Structural Stabilizer | Holds weak places together. Expensive. |

---

## 10. Unwritten (to fill as the game grows)

- Extraction Terminal dialogue and sale confirmations
- Bioscan Lab results for each life cluster type
- Additional archive fragments (Stretch)
- Fate lines (8.3)
- Tooltips and onboarding prompts
- Localization: decide English-only or bilingual UI (design OQ-05)

---

## Change log

| Date | Change |
| --- | --- |
| 2026-09-29 | First English content sheet, from the Chinese GDD v0.5. Wording of notices and fate bands is new and open to rewrite. |
| 2026-09-30 | D-018: added the Detector's short tool description. |
