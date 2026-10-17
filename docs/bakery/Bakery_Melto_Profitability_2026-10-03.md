# Melto bakery: recipe profitability and problems

**Review date: 3 October 2026 · Currency: CFA, treated as XAF for this Cameroon bakery**

## Decision brief

The current workbook contains **41 populated recipe sheets and one ingredient-price sheet**. This review rebuilds **182 selling offers and formula-implied prices** from **376 costing lines**, including the unnamed `Sheet3`. Every recipe receives a cost calculation, selling-format comparison and specific problem note. One main formula per sheet is used; alternate batch columns that change ingredient ratios are not silently combined.

**These are theoretical ingredient returns, not verified net profits.** No measured saleable-yield records, product sales mix, batch labour, fuel consumption, packaging invoices or allocated overhead were supplied. Six recipes also have missing ingredient costs. Positive results show the money remaining to cover those costs; they do not establish that the bakery earns a net profit.

The primary offer is the first price/weight pair in each sheet, not an invented best-selling format. All calculations below sell whole pieces from one batch, without mixing alternative formats. Source prices and weights have not been confirmed against current supplier invoices.

| Immediate finding | Calculation | Action |
|---|---|---|
| Samosa, manual 86 g / 100 CFA | 60 pieces; 6,402.72 CFA known ingredients; **−402.72 CFA per batch (−6.7%)**, before frying oil and operations | Stop treating this price/weight pair as profitable. Confirm recipe, portion and costs before repricing. |
| Samosa, 700 g / 1,000 CFA | 7 pieces; only **597.28 CFA per batch (8.5%)** remains | Missing oil, labour and packaging can consume this entire balance. |
| Fish Pie, wholesale 12 × 85 g for 1,000 CFA | Five complete packs; **813.35 CFA per batch (16.3%)** before cabbage and operations | Price cabbage and cooking loss, then review the wholesale offer. |
| Banh Mi, 500 g / 200 CFA | 21 pieces; **969.53 CFA per batch (23.1%)** remains | Evaluate this separately from the much stronger 90 g / 100 CFA offer. |
| Croissant new, layering butter | 600 g was charged at **72 CFA**; master butter rate gives **757.89 CFA** | Correct the ingredient reference. Batch cost increases by **685.89 CFA** to 3,639.55 CFA, subject to butter specification. |
| gateau | Known ingredients are **16,354.77 CFA**, with frying oil unresolved | Do not repeat the old 29% margin or call the new partial-cost margin a profit. First resolve the oil unit and actual use. |

## What the calculations mean

1. **Ingredient rate** = master pack price ÷ master pack weight. The workbook weights are treated as grams, consistent with the accompanying recipe book. Confirm edible egg weight, oil mass versus litres, fish trim and vegetable trim before approving final costs.

2. **Known batch ingredient cost** = sum of quantity × matched rate. Missing quantities or prices stay missing. They are excluded only from the clearly labelled known-cost subtotal and block the operating-profit result.

3. **Nominal dough/mix mass** = sum of recipe quantities, excluding separate fryer-oil charges. This is a costing basis, not a measured finished yield. The base view assumes the listed portion weights use this same mass basis. If they are finished weights, substitute measured cooled output in the editable usable-mass factor.

4. **Whole pieces** = floor(usable mass ÷ portion mass). Wholesale production is rounded down to complete 12-piece packs. Remainders are not sold or credited. All batch ingredient cost is charged to those saleable pieces. No salvage value is assumed.

5. **Revenue** = whole pieces sold × price. **Ingredient surplus** = revenue − known ingredient cost. **Ingredient margin** = ingredient surplus ÷ revenue. **Remainder per piece** = selling price − known ingredient cost per sold piece. This is not a markup percentage or an after-overhead profit.

6. The editable model uses 100% nominal mass yield and 100% sell-through initially. Its operating-profit calculation becomes available only after missing ingredient costs and all five operating inputs are entered: packaging per produced piece, batch labour, batch energy, other batch variable costs and allocated fixed costs. An explicit zero is permitted; a blank stays unknown. Operating profit remains before financing and income tax and depends on the chosen yield assumptions.

**Milk assumption:** recipes explicitly labelled condensed milk retain their existing link to the generic master milk price of 1,170 CFA/1,000 g, provisionally. This does not establish that generic milk and condensed milk are interchangeable. The `choko bread` 25 kg milk-pack reference is provisionally treated as milk powder. The specific milk used in `cake marbre` also needs confirmation. No answer confirming these identities was available when this version was prepared.

**Frying-oil assumption:** full listed gram charges are provisionally expensed for Donuts, Best Chinchin, Okinawa, Kouatchoua gato and Universal bread, but excluded from dough weight. This is a purchase/charge convention, not a measured absorption or consumption rate. Record opening oil, additions, reusable closing oil and discarded oil to establish batch consumption. The `gateau` quantity 10 and `Chinchin` quantity 2 have unresolved units and are not silently converted.

**Recipe basis:** the principal quantity column is D except Banh Mi, Beignet soufle and Croissant new, which use F. Baguette AI uses D (18 kg flour). These selections are stated beside every recipe. Large-scale columns with differing ingredient ratios require separate approval and a new calculation before use.

## Recipe comparison: first listed main offer

A dagger (†) identifies a partial ingredient cost. Its margin and surplus are overstated by the unpriced ingredients at the stated yield. All other margins remain provisional and exclude operating costs. The table is in workbook order, not a production-volume ranking.

| Recipe | Offer: g / CFA | Known batch cost CFA | Ingredients / piece CFA | Remainder / piece CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| baguette | 90 / 100 | 3,378.85 | 31.00 | 69.00 | 69.0% |
| Baguette AI | 85 / 100 | 8,109.14 | 22.59 | 77.41 | 77.4% |
| Banh Mi | 90 / 100 | 3,230.47 | 27.61 | 72.39 | 72.4% |
| cake marbre | 60 / 150 | 3,303.42 | 37.97 | 112.03 | 74.7% |
| gateau † | 81 / 100 | 16,354.77 | 33.24 | 66.76 | 66.8% |
| buns new look | 160 / 200 | 12,433.85 | 80.74 | 119.26 | 59.6% |
| Donuts | 40 / 50 | 14,597.74 | 26.02 | 23.98 | 48.0% |
| Fish Pie † | 85 / 100 | 4,186.65 | 62.49 | 37.51 | 37.5% |
| Galette | 79 / 100 | 10,788.44 | 50.18 | 49.82 | 49.8% |
| New bread | 90 / 100 | 9,079.98 | 33.88 | 66.12 | 66.1% |
| NGALA BREAD | 90 / 100 | 7,351.39 | 42.99 | 57.01 | 57.0% |
| Pain au lait | 136 / 150 | 9,645.83 | 64.31 | 85.69 | 57.1% |
| NEW BRIOCHE | 82 / 100 | 10,838.38 | 51.86 | 48.14 | 48.1% |
| Brioche Professionel | 70 / 100 | 8,800.68 | 57.52 | 42.48 | 42.5% |
| professinal Buns | 95 / 100 | 9,383.41 | 64.27 | 35.73 | 35.7% |
| brioche | 82 / 100 | 10,861.15 | 51.23 | 48.77 | 48.8% |
| Chinchin † | 45 / 100 | 4,445.70 | 33.18 | 66.82 | 66.8% |
| choko bread | 100 / 100 | 4,175.69 | 50.31 | 49.69 | 49.7% |
| YUMMY BREAD | 139 / 150 | 12,133.85 | 68.17 | 81.83 | 54.6% |
| Kouatchoua gato | 81.4 / 100 | 27,540.05 | 52.56 | 47.44 | 47.4% |
| Cake Prof | 230 / 500 | 7,511.20 | 187.78 | 312.22 | 62.4% |
| Best Chinchin | 45 / 100 | 54,165.35 | 53.74 | 46.26 | 46.3% |
| Sugar Balls † | 70 / 100 | 7,198.27 | 29.62 | 70.38 | 70.4% |
| Beignet soufle † | 37 / 50 | 7,474.69 | 22.38 | 27.62 | 55.2% |
| Zebree | 370 / 500 | 12,605.07 | 242.41 | 257.59 | 51.5% |
| Danisa biscuits | 30 / 50 | 28,624.31 | 24.14 | 25.86 | 51.7% |
| Delice | 700 / 1000 | 4,893.36 | 543.71 | 456.29 | 45.6% |
| Okinawa | 80 / 100 | 4,447.94 | 55.60 | 44.40 | 44.4% |
| CAKE NOW | 220 / 500 | 6,138.07 | 191.81 | 308.19 | 61.6% |
| Short bread | 38 / 50 | 2,982.88 | 28.96 | 21.04 | 42.1% |
| Melto | 34 / 50 | 5,768.87 | 26.22 | 23.78 | 47.6% |
| Kumba bread | 900 / 1000 | 16,401.69 | 341.70 | 658.30 | 65.8% |
| Hamburger buns | 370 / 500 | 5,899.21 | 125.52 | 374.48 | 74.9% |
| Taste it | 800 / 1000 | 9,065.64 | 453.28 | 546.72 | 54.7% |
| Samosa † | 25 / 50 | 6,402.72 | 30.78 | 19.22 | 38.4% |
| Ice Cream | 70 / 100 | 9,361.20 | 42.36 | 57.64 | 57.6% |
| Melto1 | 35 / 50 | 5,682.32 | 26.43 | 23.57 | 47.1% |
| Croissant | 45 / 100 | 3,070.41 | 21.03 | 78.97 | 79.0% |
| Universal bread | 81.4 / 100 | 27,727.70 | 54.91 | 45.09 | 45.1% |
| Sheet3 | 144 / 125 | 9,161.49 | 68.88 | 56.12 | 44.9% |
| Croissant new | 50 / 100 | 3,639.55 | 31.38 | 68.62 | 68.6% |

## Problems that affect the whole workbook

**The May profitability report should not guide today’s pricing.** The current workbook has changed recipes and prices. The earlier report used each sheet’s best-margin offer, sometimes counted fryer oil in saleable mass, and omitted populated/new formulas. Its flour-shock margin estimates also confuse a cost-share change with a sales-margin change. Recompute any price shock as extra ingredient cost ÷ unchanged revenue, in percentage points.

**Pack-price references must match pack weights.** Galette, Zebree, Delice and Taste it use baking-powder price with a 4,000 g denominator from milk flavouring. Zebree and Hamburger buns use an EDC price with milk-powder pack weight. Fish Pie, Sugar Balls and Best Chinchin misidentify the improver rate. Okinawa prices egg as butter. This model corrects those name/reference mismatches using the master sheet, while preserving unresolved product identities in the notes.

**Source totals and source revenues are unreliable.** Some totals omit ingredients, cost is sometimes divided by grams to create a piece count, and one sales block multiplies price twice. Ten cached error cells remain in the original across Donuts, New bread and NGALA BREAD. This analysis rebuilds from quantities and offer inputs; it does not repair or overwrite the source workbook.

**Do not add profits from alternative formats or unmatched batch sizes.** One batch can be allocated across formats, but it cannot generate every row’s revenue simultaneously. The listed recipe batches vary widely in size. A sum of one batch of every recipe is not a daily profit forecast or a procurement budget without a production schedule and sales mix.

**Wholesale formulas require confirmation.** The model separately evaluates the 12-piece discounts shown in source revenue formulas. Identical copied wholesale formulas are combined into one price/weight row with their source range. In Kumba bread, the formula implies 12 pieces of 900 g for just 1,000 CFA: this is labelled a suspect formula, not an established commercial offer. Its negative result is evidence to repair the pricing reference, not evidence that those sales actually occurred. Kouatchoua gato and Universal bread repeatedly reference the first portion weight across their wholesale rows; they do not calculate each adjacent format correctly.

**Margin is not markup.** A 100 CFA selling price and 60 CFA ingredient cost produce a 40% ingredient margin but a 66.7% markup on ingredients. Several source cells label markup as profit margin. Flat deductions of 16% or 16.7% of surplus in the source have no supported cost or tax basis and are not carried into this model.

**Additives and variant names need control.** EDC, improver, stabilizer and milk tantalizer require exact product identity and manufacturer dosage. Similar names are not proof of identical recipes. Keep version identifiers and approve taste/yield trials before merging Melto/Melto1, brioche/NEW BRIOCHE or Cake Prof/CAKE NOW.

## Oven workflow and the cost of producing baguettes

The handbook’s corrected oven workflow was consulted alongside the current workbook. Oven capacity affects cost per good piece through loading, recovery time, labour and energy. It does not automatically justify producing a full rack when demand is insufficient.

The workflow’s planning rack is 16 trays × 5 pieces = 80 pieces of 300 g raw dough. Its separate S-B01 formula (66% water, 2% salt, 0.5% instant dry yeast) needs about 24,489.8 g mixed dough with a 2% handling-loss allowance. At the Melto master prices, 14,534.0035 g flour, 9,592.4423 g water, 290.6801 g salt and 72.6700 g yeast cost **6,368.47 CFA per rack, or 79.61 CFA per raw piece**, before diesel, electricity, labour, packaging and rejects. This is a comparison calculation for the handbook formula, not a substitution for either workbook baguette recipe.

For that 80-piece planning rack, a test selling price of 100 CFA would leave only 1,631.53 CFA per rack for all non-ingredient costs; 200 CFA would leave 9,631.53 CFA. These are price sensitivities, not confirmed sale prices. A 300 g raw piece at 15% bake loss would weigh about 255 g cooled; do not compare it directly with a 90 g workbook offer.

The workflow’s 25-minute cycle implies 192 pieces/hour and 30 minutes implies 160 pieces/hour only at full, uninterrupted loads. A 45-minute upstream supply interval caps output at about 106.7 pieces/hour; a 100-piece/hour dividing or packing station remains the bottleneck. Confirm these planning assumptions with the actual crew. The oven’s reported 3 kW electrical auxiliaries do not include its diesel heat.

Record **diesel litres × invoice price**, **electricity kWh × actual cost basis**, **paid minutes × loaded labour rate**, and the number of good pieces per run. Allocate warm-up across the production session once. Allocate shared energy and labour by a documented driver such as occupied oven minutes or measured work minutes. Include solar/battery depreciation and maintenance in overhead rather than treating all solar energy as free.

## Recipe-by-recipe calculations and corrective actions

All offers below are alternatives for the same selected recipe batch. “Manual” means a separate price/weight entry elsewhere on the source sheet, or a possible price inferred from the number beside a chosen weight. These require confirmation, especially Chinchin’s unlabelled 30 g / 1,200 CFA pair. Duplicated offers are retained because they occupy distinct source entries. Wholesale rows use complete 12-piece packs. For partial recipes, every displayed surplus still needs the missing ingredient cost deducted.

### 01. baguette

**Basis:** `baguette!D5:D9`. Nominal dough/mix mass: **9,890.00 g**. Known batch ingredients: **3,378.85 CFA**. No operating costs are included.

**Key problem and action:** The 18 kg column actually starts with 111 kg flour. Improver is 3% of flour; verify its specified dose. The 200 g/100 CFA format is much weaker than the 90 g format.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 90 g / 100 CFA | 109 | 31.00 | 69.00 | 7,521.15 | 69.0% |
| 200 g / 100 CFA | 49 | 68.96 | 31.04 | 1,521.15 | 31.0% |
| 65 g / 50 CFA | 152 | 22.23 | 27.77 | 4,221.15 | 55.5% |
| 12 × 90 g / 1000 CFA (wholesale) | 108 | 31.29 | 52.05 | 5,621.15 | 62.5% |

At the first offer, selling **34 of 109 pieces (31.2%)** recovers only the known ingredients. The remaining **69.00 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 02. Baguette AI

**Basis:** `Baguette AI!D5:D9`. Nominal dough/mix mass: **30,520.00 g**. Known batch ingredients: **8,109.14 CFA**. No operating costs are included.

**Key problem and action:** D uses 18 kg flour despite its 10 kg heading. F and J use different salt/improver ratios, so they are separate formulas. Bulk revenue uses 12 pieces for 1,000 CFA.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 85 g / 100 CFA | 359 | 22.59 | 77.41 | 27,790.86 | 77.4% |
| 500 g / 200 CFA | 61 | 132.94 | 67.06 | 4,090.86 | 33.5% |
| 65 g / 50 CFA | 469 | 17.29 | 32.71 | 15,340.86 | 65.4% |
| 12 × 85 g / 1000 CFA (wholesale) | 348 | 23.30 | 60.03 | 20,890.86 | 72.0% |

At the first offer, selling **82 of 359 pieces (22.8%)** recovers only the known ingredients. The remaining **77.41 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 03. Banh Mi

**Basis:** `Banh Mi!F5:F10`. Nominal dough/mix mass: **10,530.00 g**. Known batch ingredients: **3,230.47 CFA**. No operating costs are included.

**Key problem and action:** The 50 kg column actually has 150 kg flour. Correct sugar from 37,000 to the master 32,000 per 50 kg. Very low salt and 2.5% improver require recipe review.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 90 g / 100 CFA | 117 | 27.61 | 72.39 | 8,469.53 | 72.4% |
| 500 g / 200 CFA | 21 | 153.83 | 46.17 | 969.53 | 23.1% |
| 65 g / 50 CFA | 162 | 19.94 | 30.06 | 4,869.53 | 60.1% |
| 12 × 90 g / 1000 CFA (wholesale) | 108 | 29.91 | 53.42 | 5,769.53 | 64.1% |

At the first offer, selling **33 of 117 pieces (28.2%)** recovers only the known ingredients. The remaining **72.39 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 04. cake marbre

**Basis:** `cake marbre!D5:D14`. Nominal dough/mix mass: **5,227.00 g**. Known batch ingredients: **3,303.42 CFA**. No operating costs are included.

**Key problem and action:** Piece-count formulas divide batch COST by piece weight. Historical ingredient rates differ sharply from the master. Milk identity is unclear. No cocoa/chocolate line identifies the marbling.

**Price qualification:** Milk type unclear; generic master milk rate used provisionally.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 60 g / 150 CFA | 87 | 37.97 | 112.03 | 9,746.58 | 74.7% |
| 50 g / 100 CFA | 104 | 31.76 | 68.24 | 7,096.58 | 68.2% |

At the first offer, selling **23 of 87 pieces (26.4%)** recovers only the known ingredients. The remaining **112.03 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 05. gateau

**Basis:** `gateau!D5:D16`. Nominal dough/mix mass: **39,870.00 g**. Known batch ingredients: **16,354.77 CFA**. No operating costs are included.

**Key problem and action:** Frying oil is entered as 10 against a pack weight of 20; units and net oil consumption are unresolved. Butter uses 20,000 g instead of 9,500 g. Condensed milk and egg mass need confirmation.

**Missing ingredient cost:** frying oil. Surplus and margin below are partial-cost indications only.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 81 g / 100 CFA | 492 | 33.24 | 66.76 | 32,845.23 | 66.8% |
| 90 g / 100 CFA | 443 | 36.92 | 63.08 | 27,945.23 | 63.1% |
| 90 g / 100 CFA | 443 | 36.92 | 63.08 | 27,945.23 | 63.1% |
| 900 g / 1000 CFA | 44 | 371.70 | 628.30 | 27,645.23 | 62.8% |

At the first offer, selling **164 of 492 pieces (33.3%)** recovers only the known ingredients. The remaining **66.76 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 06. buns new look

**Basis:** `buns new look!D5:D14`. Nominal dough/mix mass: **24,750.00 g**. Known batch ingredients: **12,433.85 CFA**. No operating costs are included.

**Key problem and action:** D/F/H/N are different formulas, not exact scales. D16 omits the 100 g EDC. Manual per-bun costs use selling weight/price instead of ingredient cost.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 160 g / 200 CFA | 154 | 80.74 | 119.26 | 18,366.15 | 59.6% |
| 139 g / 125 CFA | 178 | 69.85 | 55.15 | 9,816.15 | 44.1% |
| 139 g / 150 CFA | 178 | 69.85 | 80.15 | 14,266.15 | 53.4% |
| 133 g / 150 CFA (manual) | 186 | 66.85 | 83.15 | 15,466.15 | 55.4% |
| 130 g / 150 CFA (manual) | 190 | 65.44 | 84.56 | 16,066.15 | 56.4% |

At the first offer, selling **63 of 154 pieces (40.9%)** recovers only the known ingredients. The remaining **119.26 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 07. Donuts

**Basis:** `Donuts!D5:D13`. Nominal dough/mix mass: **22,450.00 g**. Known batch ingredients: **14,597.74 CFA**. No operating costs are included.

**Key problem and action:** Keep the 5 kg frying-oil charge out of dough yield. Its full cost is charged provisionally; measure oil consumed/discarded. Large-scale cost and quantity use different multipliers; sales formulas have broken references.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 40 g / 50 CFA | 561 | 26.02 | 23.98 | 13,452.26 | 48.0% |
| 22 g / 50 CFA | 1,020 | 14.31 | 35.69 | 36,402.26 | 71.4% |
| 150 g / 500 CFA | 149 | 97.97 | 402.03 | 59,902.26 | 80.4% |
| 60 g / 100 CFA (manual) | 374 | 39.03 | 60.97 | 22,802.26 | 61.0% |
| 230 g / 500 CFA (manual) | 97 | 150.49 | 349.51 | 33,902.26 | 69.9% |
| 12 × 40 g / 500 CFA (wholesale) | 552 | 26.45 | 15.22 | 8,402.26 | 36.5% |
| 12 × 22 g / 500 CFA (wholesale) | 1,020 | 14.31 | 27.36 | 27,902.26 | 65.7% |

At the first offer, selling **292 of 561 pieces (52.0%)** recovers only the known ingredients. The remaining **23.98 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

Broken source results bypassed in this model: `H20`, `L20`.

### 08. Fish Pie

**Basis:** `Fish Pie!D5:D16`. Nominal dough/mix mass: **5,700.00 g**. Known batch ingredients: **4,186.65 CFA**. No operating costs are included.

**Key problem and action:** Cabbage (200 g) is unpriced. Improver points to baking powder. Filling trim/cook losses and labour are missing. Manual 60 g/100 CFA differs from the main 85 g/100 CFA format.

**Missing ingredient cost:** cabbage. Surplus and margin below are partial-cost indications only.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 85 g / 100 CFA | 67 | 62.49 | 37.51 | 2,513.35 | 37.5% |
| 65 g / 100 CFA | 87 | 48.12 | 51.88 | 4,513.35 | 51.9% |
| 150 g / 500 CFA | 38 | 110.17 | 389.83 | 14,813.35 | 78.0% |
| 60 g / 100 CFA (manual) | 95 | 44.07 | 55.93 | 5,313.35 | 55.9% |
| 230 g / 500 CFA (manual) | 24 | 174.44 | 325.56 | 7,813.35 | 65.1% |
| 12 × 85 g / 1000 CFA (wholesale) | 60 | 69.78 | 13.56 | 813.35 | 16.3% |
| 12 × 65 g / 1000 CFA (wholesale) | 84 | 49.84 | 33.49 | 2,813.35 | 40.2% |

At the first offer, selling **42 of 67 pieces (62.7%)** recovers only the known ingredients. The remaining **37.51 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 09. Galette

**Basis:** `Galette!D5:D16`. Nominal dough/mix mass: **16,995.00 g**. Known batch ingredients: **10,788.44 CFA**. No operating costs are included.

**Key problem and action:** Baking powder uses a 4,000 g milk-tantalizer denominator instead of 500 g. Manual per-piece cost is a price/weight ratio, not ingredient cost. EDC identity needs confirmation.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 79 g / 100 CFA | 215 | 50.18 | 49.82 | 10,711.56 | 49.8% |
| 140 g / 200 CFA | 121 | 89.16 | 110.84 | 13,411.56 | 55.4% |
| 700 g / 1000 CFA | 24 | 449.52 | 550.48 | 13,211.56 | 55.0% |
| 700 g / 1000 CFA (manual) | 24 | 449.52 | 550.48 | 13,211.56 | 55.0% |
| 86 g / 100 CFA (manual) | 197 | 54.76 | 45.24 | 8,911.56 | 45.2% |
| 12 × 79 g / 1000 CFA (wholesale) | 204 | 52.88 | 30.45 | 6,211.56 | 36.5% |

At the first offer, selling **108 of 215 pieces (50.2%)** recovers only the known ingredients. The remaining **49.82 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 10. New bread

**Basis:** `New bread!D5:D13`. Nominal dough/mix mass: **24,160.00 g**. Known batch ingredients: **9,079.98 CFA**. No operating costs are included.

**Key problem and action:** Condensed milk combines a milk price with a 25 kg powder-milk pack. Egg denominator is 540 g rather than the master 1,500 g. The purported 50 kg batch contains 125 kg flour.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 90 g / 100 CFA | 268 | 33.88 | 66.12 | 17,720.02 | 66.1% |
| 95 g / 150 CFA (manual) | 254 | 35.75 | 114.25 | 29,020.02 | 76.2% |
| 130 g / 150 CFA (manual) | 185 | 49.08 | 100.92 | 18,670.02 | 67.3% |

At the first offer, selling **91 of 268 pieces (34.0%)** recovers only the known ingredients. The remaining **66.12 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

Broken source results bypassed in this model: `F24`, `H24`, `F25`, `H25`.

### 11. NGALA BREAD

**Basis:** `NGALA BREAD!D5:D13`. Nominal dough/mix mass: **15,430.00 g**. Known batch ingredients: **7,351.39 CFA**. No operating costs are included.

**Key problem and action:** Condensed milk uses the 25 kg powder-milk denominator. Egg pack weight is inconsistent. Manual cost formulas contain broken references.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 90 g / 100 CFA | 171 | 42.99 | 57.01 | 9,748.61 | 57.0% |
| 95 g / 150 CFA (manual) | 162 | 45.38 | 104.62 | 16,948.61 | 69.7% |
| 130 g / 150 CFA (manual) | 118 | 62.30 | 87.70 | 10,348.61 | 58.5% |

At the first offer, selling **74 of 171 pieces (43.3%)** recovers only the known ingredients. The remaining **57.01 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

Broken source results bypassed in this model: `F24`, `H24`, `F25`, `H25`.

### 12. Pain au lait

**Basis:** `Pain au lait!D5:D17`. Nominal dough/mix mass: **20,457.00 g**. Known batch ingredients: **9,645.83 CFA**. No operating costs are included.

**Key problem and action:** E19 omits ingredients after yeast although D19 includes them. The purported 18 kg batch starts with 43.2 kg flour. Confirm milk identity, EDC and flavour dosage.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 136 g / 150 CFA | 150 | 64.31 | 85.69 | 12,854.17 | 57.1% |
| 200 g / 300 CFA | 102 | 94.57 | 205.43 | 20,954.17 | 68.5% |
| 800 g / 1000 CFA | 25 | 385.83 | 614.17 | 15,354.17 | 61.4% |
| 133 g / 150 CFA (manual) | 153 | 63.04 | 86.96 | 13,304.17 | 58.0% |
| 130 g / 150 CFA (manual) | 157 | 61.44 | 88.56 | 13,904.17 | 59.0% |
| 12 × 800 g / 10000 CFA (wholesale) | 24 | 401.91 | 431.42 | 10,354.17 | 51.8% |

At the first offer, selling **65 of 150 pieces (43.3%)** recovers only the known ingredients. The remaining **85.69 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 13. NEW BRIOCHE

**Basis:** `NEW BRIOCHE!D5:D15`. Nominal dough/mix mass: **17,213.00 g**. Known batch ingredients: **10,838.38 CFA**. No operating costs are included.

**Key problem and action:** The secondary batch total omits rows and is not a faithful scale. The 82 g/100 CFA entry needs separate economics from 140 g/200 CFA. Compare flavour and demand before combining with brioche.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 82 g / 100 CFA | 209 | 51.86 | 48.14 | 10,061.62 | 48.1% |
| 140 g / 200 CFA | 122 | 88.84 | 111.16 | 13,561.62 | 55.6% |
| 700 g / 1000 CFA | 24 | 451.60 | 548.40 | 13,161.62 | 54.8% |
| 700 g / 1000 CFA (manual) | 24 | 451.60 | 548.40 | 13,161.62 | 54.8% |
| 86 g / 100 CFA (manual) | 200 | 54.19 | 45.81 | 9,161.62 | 45.8% |
| 12 × 82 g / 1000 CFA (wholesale) | 204 | 53.13 | 30.20 | 6,161.62 | 36.2% |

At the first offer, selling **109 of 209 pieces (52.2%)** recovers only the known ingredients. The remaining **48.14 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 14. Brioche Professionel

**Basis:** `Brioche Professionel!D5:D13`. Nominal dough/mix mass: **10,750.00 g**. Known batch ingredients: **8,800.68 CFA**. No operating costs are included.

**Key problem and action:** E15 omits yeast and nutmeg. The 50 kg column starts with only 13.64 kg flour. Condensed-milk identity is unresolved; the manual 80 g/100 CFA is weaker than 70 g/100 CFA.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 70 g / 100 CFA | 153 | 57.52 | 42.48 | 6,499.32 | 42.5% |
| 220 g / 300 CFA | 48 | 183.35 | 116.65 | 5,599.32 | 38.9% |
| 800 g / 1000 CFA | 13 | 676.98 | 323.02 | 4,199.32 | 32.3% |
| 80 g / 100 CFA (manual) | 134 | 65.68 | 34.32 | 4,599.32 | 34.3% |

At the first offer, selling **89 of 153 pieces (58.2%)** recovers only the known ingredients. The remaining **42.48 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 15. professinal Buns

**Basis:** `professinal Buns!D5:D17`. Nominal dough/mix mass: **13,905.00 g**. Known batch ingredients: **9,383.41 CFA**. No operating costs are included.

**Key problem and action:** E19 omits milk flavour, oil and nutmeg. Sales formulas multiply price twice. Water is only 300 g per 10 kg flour: confirm an omitted liquid before production.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 95 g / 100 CFA | 146 | 64.27 | 35.73 | 5,216.59 | 35.7% |
| 140 g / 150 CFA | 99 | 94.78 | 55.22 | 5,466.59 | 36.8% |
| 800 g / 1000 CFA | 17 | 551.97 | 448.03 | 7,616.59 | 44.8% |
| 95 g / 100 CFA (manual) | 146 | 64.27 | 35.73 | 5,216.59 | 35.7% |
| 140 g / 150 CFA (manual) | 99 | 94.78 | 55.22 | 5,466.59 | 36.8% |

At the first offer, selling **94 of 146 pieces (64.4%)** recovers only the known ingredients. The remaining **35.73 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 16. brioche

**Basis:** `brioche!D5:D15`. Nominal dough/mix mass: **17,400.00 g**. Known batch ingredients: **10,861.15 CFA**. No operating costs are included.

**Key problem and action:** Secondary batch quantities are blank. Some profit cells deduct 16% of ingredient surplus without a supported expense basis. Compare with NEW BRIOCHE by taste and measured yield.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 82 g / 100 CFA | 212 | 51.23 | 48.77 | 10,338.85 | 48.8% |
| 160 g / 200 CFA | 108 | 100.57 | 99.43 | 10,738.85 | 49.7% |
| 700 g / 1000 CFA | 24 | 452.55 | 547.45 | 13,138.85 | 54.7% |

At the first offer, selling **109 of 212 pieces (51.4%)** recovers only the known ingredients. The remaining **48.77 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 17. Chinchin

**Basis:** `Chinchin!D5:D13`. Nominal dough/mix mass: **6,065.00 g**. Known batch ingredients: **4,445.70 CFA**. No operating costs are included.

**Key problem and action:** Oil is entered as 2 and priced as 2 g; confirm its unit and consumption. The manual 30 g / 1,200 CFA pair lacks a price header and is only a possible offer, requiring confirmation. Egg mass is 1,200 g for 3,600 g flour.

**Missing ingredient cost:** oil. Surplus and margin below are partial-cost indications only.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 45 g / 100 CFA | 134 | 33.18 | 66.82 | 8,954.30 | 66.8% |
| 40 g / 100 CFA | 151 | 29.44 | 70.56 | 10,654.30 | 70.6% |
| 220 g / 500 CFA | 27 | 164.66 | 335.34 | 9,054.30 | 67.1% |
| 30 g / 1200 CFA (manual) | 202 | 22.01 | 1,177.99 | 237,954.30 | 98.2% |
| 160 g / 500 CFA (manual) | 37 | 120.15 | 379.85 | 14,054.30 | 76.0% |

At the first offer, selling **45 of 134 pieces (33.6%)** recovers only the known ingredients. The remaining **66.82 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 18. choko bread

**Basis:** `choko bread!D5:D15`. Nominal dough/mix mass: **8,384.00 g**. Known batch ingredients: **4,175.69 CFA**. No operating costs are included.

**Key problem and action:** Old hard-coded prices and a powder-sized milk pack. Milk is provisionally mapped to powder milk. Base-cost total omits chocolate while scaled cost includes it.

**Price qualification:** 25 kg source pack suggests powder; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 100 g / 100 CFA | 83 | 50.31 | 49.69 | 4,124.31 | 49.7% |
| 220 g / 300 CFA | 38 | 109.89 | 190.11 | 7,224.31 | 63.4% |
| 90 g / 100 CFA | 93 | 44.90 | 55.10 | 5,124.31 | 55.1% |

At the first offer, selling **42 of 83 pieces (50.6%)** recovers only the known ingredients. The remaining **49.69 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 19. YUMMY BREAD

**Basis:** `YUMMY BREAD!D5:D14`. Nominal dough/mix mass: **24,750.00 g**. Known batch ingredients: **12,133.85 CFA**. No operating costs are included.

**Key problem and action:** Flour Bir at 20,000/50 kg is retained. The source total omits 100 g EDC. D/F/H are different formulas; 125 and 150 CFA are separate prices for the same 139 g piece.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 139 g / 150 CFA | 178 | 68.17 | 81.83 | 14,566.15 | 54.6% |
| 139 g / 125 CFA | 178 | 68.17 | 56.83 | 10,116.15 | 45.5% |
| 139 g / 150 CFA | 178 | 68.17 | 81.83 | 14,566.15 | 54.6% |
| 133 g / 150 CFA (manual) | 186 | 65.24 | 84.76 | 15,766.15 | 56.5% |
| 130 g / 150 CFA (manual) | 190 | 63.86 | 86.14 | 16,366.15 | 57.4% |

At the first offer, selling **81 of 178 pieces (45.5%)** recovers only the known ingredients. The remaining **81.83 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 20. Kouatchoua gato

**Basis:** `Kouatchoua gato!D5:D15`. Nominal dough/mix mass: **42,710.00 g**. Known batch ingredients: **27,540.05 CFA**. No operating costs are included.

**Key problem and action:** Exclude 8 kg frying oil from dough yield, while provisionally charging its full cost. Condensed-milk identity remains unclear. The older report included fryer oil in saleable mass.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 81.4 g / 100 CFA | 524 | 52.56 | 47.44 | 24,859.95 | 47.4% |
| 90 g / 100 CFA | 474 | 58.10 | 41.90 | 19,859.95 | 41.9% |
| 90 g / 100 CFA | 474 | 58.10 | 41.90 | 19,859.95 | 41.9% |
| 900 g / 1000 CFA | 47 | 585.96 | 414.04 | 19,459.95 | 41.4% |
| 80 g / 100 CFA (manual) | 533 | 51.67 | 48.33 | 25,759.95 | 48.3% |
| 12 × 81.4 g / 1000 CFA (wholesale) | 516 | 53.37 | 29.96 | 15,459.95 | 36.0% |

At the first offer, selling **276 of 524 pieces (52.7%)** recovers only the known ingredients. The remaining **47.44 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 21. Cake Prof

**Basis:** `Cake Prof!D5:D10`. Nominal dough/mix mass: **9,260.00 g**. Known batch ingredients: **7,511.20 CFA**. No operating costs are included.

**Key problem and action:** D and H are materially different egg/butter/sugar formulas. Its profit-margin cell is a markup on cost. Use one approved formula and a measured cooled yield.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 230 g / 500 CFA | 40 | 187.78 | 312.22 | 12,488.80 | 62.4% |
| 60 g / 100 CFA | 154 | 48.77 | 51.23 | 7,888.80 | 51.2% |

At the first offer, selling **16 of 40 pieces (40.0%)** recovers only the known ingredients. The remaining **312.22 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 22. Best Chinchin

**Basis:** `Best Chinchin!D5:D14`. Nominal dough/mix mass: **45,400.00 g**. Known batch ingredients: **54,165.35 CFA**. No operating costs are included.

**Key problem and action:** The 15 kg frying-oil line is excluded from dough mass but fully charged provisionally. Improver is incorrectly priced as milk. Smaller-batch ingredient ratios differ.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 45 g / 100 CFA | 1,008 | 53.74 | 46.26 | 46,634.65 | 46.3% |
| 225 g / 500 CFA | 201 | 269.48 | 230.52 | 46,334.65 | 46.1% |
| 500 g / 1000 CFA | 90 | 601.84 | 398.16 | 35,834.65 | 39.8% |
| 45 g / 100 CFA (manual) | 1,008 | 53.74 | 46.26 | 46,634.65 | 46.3% |
| 230 g / 500 CFA (manual) | 197 | 274.95 | 225.05 | 44,334.65 | 45.0% |

At the first offer, selling **542 of 1,008 pieces (53.8%)** recovers only the known ingredients. The remaining **46.26 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 23. Sugar Balls

**Basis:** `Sugar Balls!D5:D12`. Nominal dough/mix mass: **17,010.00 g**. Known batch ingredients: **7,198.27 CFA**. No operating costs are included.

**Key problem and action:** Improver is priced as baking powder. No frying-oil consumption is costed. Small and large batch formulas differ. The 500 CFA offer is a price hypothesis, not evidence of demand.

**Missing ingredient cost:** Frying oil consumed/discarded. Surplus and margin below are partial-cost indications only.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 70 g / 100 CFA | 243 | 29.62 | 70.38 | 17,101.73 | 70.4% |
| 80 g / 100 CFA | 212 | 33.95 | 66.05 | 14,001.73 | 66.0% |
| 150 g / 500 CFA | 113 | 63.70 | 436.30 | 49,301.73 | 87.3% |
| 60 g / 100 CFA (manual) | 283 | 25.44 | 74.56 | 21,101.73 | 74.6% |
| 230 g / 500 CFA (manual) | 73 | 98.61 | 401.39 | 29,301.73 | 80.3% |
| 12 × 70 g / 1000 CFA (wholesale) | 240 | 29.99 | 53.34 | 12,801.73 | 64.0% |

At the first offer, selling **72 of 243 pieces (29.6%)** recovers only the known ingredients. The remaining **70.38 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 24. Beignet soufle

**Basis:** `Beignet soufle!F5:F14`. Nominal dough/mix mass: **12,380.00 g**. Known batch ingredients: **7,474.69 CFA**. No operating costs are included.

**Key problem and action:** Use the explicit 6 kg-flour F column. D/H are scaled from a different 7 kg formula. Frying oil is absent. Confirm EDC identity and dose.

**Missing ingredient cost:** Frying oil consumed/discarded. Surplus and margin below are partial-cost indications only.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 37 g / 50 CFA | 334 | 22.38 | 27.62 | 9,225.31 | 55.2% |
| 160 g / 200 CFA | 77 | 97.07 | 102.93 | 7,925.31 | 51.5% |
| 700 g / 1000 CFA | 17 | 439.69 | 560.31 | 9,525.31 | 56.0% |

At the first offer, selling **150 of 334 pieces (44.9%)** recovers only the known ingredients. The remaining **27.62 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 25. Zebree

**Basis:** `Zebree!D5:D16`. Nominal dough/mix mass: **19,505.00 g**. Known batch ingredients: **12,605.07 CFA**. No operating costs are included.

**Key problem and action:** Baking powder uses the wrong pack weight; EDC uses a 25 kg milk-powder pack. Large and small formulas differ, including chocolate and butter.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 370 g / 500 CFA | 52 | 242.41 | 257.59 | 13,394.93 | 51.5% |
| 190 g / 250 CFA | 102 | 123.58 | 126.42 | 12,894.93 | 50.6% |
| 700 g / 1000 CFA | 27 | 466.85 | 533.15 | 14,394.93 | 53.3% |
| 380 g / 500 CFA (manual) | 51 | 247.16 | 252.84 | 12,894.93 | 50.6% |
| 190 g / 250 CFA (manual) | 102 | 123.58 | 126.42 | 12,894.93 | 50.6% |

At the first offer, selling **26 of 52 pieces (50.0%)** recovers only the known ingredients. The remaining **257.59 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 26. Danisa biscuits

**Basis:** `Danisa biscuits!D5:D12`. Nominal dough/mix mass: **35,590.00 g**. Known batch ingredients: **28,624.31 CFA**. No operating costs are included.

**Key problem and action:** The 2 kg and trial formulas change sugar/egg ratios. The 30 g/50 CFA offer has a different price per gram from large packs. Packaging and cooled biscuit yield are missing.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 30 g / 50 CFA | 1,186 | 24.14 | 25.86 | 30,675.69 | 51.7% |
| 140 g / 200 CFA | 254 | 112.69 | 87.31 | 22,175.69 | 43.7% |
| 700 g / 1000 CFA | 50 | 572.49 | 427.51 | 21,375.69 | 42.8% |
| 700 g / 1000 CFA (manual) | 50 | 572.49 | 427.51 | 21,375.69 | 42.8% |
| 86 g / 100 CFA (manual) | 413 | 69.31 | 30.69 | 12,675.69 | 30.7% |

At the first offer, selling **573 of 1,186 pieces (48.3%)** recovers only the known ingredients. The remaining **25.86 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 27. Delice

**Basis:** `Delice!D5:D17`. Nominal dough/mix mass: **6,785.00 g**. Known batch ingredients: **4,893.36 CFA**. No operating costs are included.

**Key problem and action:** Baking powder pack weight is wrong. The smaller formula omits honey and changes butter/sugar. Manual 86 g/100 CFA needs its own lower-margin calculation.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 700 g / 1000 CFA | 9 | 543.71 | 456.29 | 4,106.64 | 45.6% |
| 140 g / 200 CFA | 48 | 101.94 | 98.06 | 4,706.64 | 49.0% |
| 700 g / 1000 CFA | 9 | 543.71 | 456.29 | 4,106.64 | 45.6% |
| 700 g / 1000 CFA (manual) | 9 | 543.71 | 456.29 | 4,106.64 | 45.6% |
| 86 g / 100 CFA (manual) | 78 | 62.74 | 37.26 | 2,906.64 | 37.3% |

At the first offer, selling **5 of 9 pieces (55.6%)** recovers only the known ingredients. The remaining **456.29 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 28. Okinawa

**Basis:** `Okinawa!D5:D11`. Nominal dough/mix mass: **6,400.00 g**. Known batch ingredients: **4,447.94 CFA**. No operating costs are included.

**Key problem and action:** Egg is priced as butter. Exclude the 1 kg frying-oil line from yield but charge it provisionally. No water line is supplied; confirm the formula before judging texture or yield.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 80 g / 100 CFA | 80 | 55.60 | 44.40 | 3,552.06 | 44.4% |
| 80 g / 100 CFA | 80 | 55.60 | 44.40 | 3,552.06 | 44.4% |
| 150 g / 500 CFA | 42 | 105.90 | 394.10 | 16,552.06 | 78.8% |
| 60 g / 100 CFA (manual) | 106 | 41.96 | 58.04 | 6,152.06 | 58.0% |
| 230 g / 500 CFA (manual) | 27 | 164.74 | 335.26 | 9,052.06 | 67.1% |
| 12 × 80 g / 1000 CFA (wholesale) | 72 | 61.78 | 21.56 | 1,552.06 | 25.9% |

At the first offer, selling **45 of 80 pieces (56.2%)** recovers only the known ingredients. The remaining **44.40 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 29. CAKE NOW

**Basis:** `CAKE NOW!D5:D10`. Nominal dough/mix mass: **7,100.00 g**. Known batch ingredients: **6,138.07 CFA**. No operating costs are included.

**Key problem and action:** Water row is blank and treated as unused in the listed formula. The 100 CFA row without a weight cannot be costed. Source margin is markup, not sales margin.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 220 g / 500 CFA | 32 | 191.81 | 308.19 | 9,861.93 | 61.6% |
| 60 g / 100 CFA | 118 | 52.02 | 47.98 | 5,661.93 | 48.0% |

At the first offer, selling **13 of 32 pieces (40.6%)** recovers only the known ingredients. The remaining **308.19 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 30. Short bread

**Basis:** `Short bread!D5:D11`. Nominal dough/mix mass: **3,950.00 g**. Known batch ingredients: **2,982.88 CFA**. No operating costs are included.

**Key problem and action:** Salt is 150 g per 2 kg flour (7.5%): confirm transcription before production. The smaller formula changes ratios. Two weights are sold at the same 50 CFA price.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 38 g / 50 CFA | 103 | 28.96 | 21.04 | 2,167.12 | 42.1% |
| 45 g / 50 CFA | 87 | 34.29 | 15.71 | 1,367.12 | 31.4% |

At the first offer, selling **60 of 103 pieces (58.3%)** recovers only the known ingredients. The remaining **21.04 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 31. Melto

**Basis:** `Melto!D5:D10`. Nominal dough/mix mass: **7,490.00 g**. Known batch ingredients: **5,768.87 CFA**. No operating costs are included.

**Key problem and action:** F scales H, but H has 50 g egg while D has 150 g. The 50 kg column has 56.25 kg flour. At 50 CFA, moving from 34 to 45 g sharply reduces margin.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 34 g / 50 CFA | 220 | 26.22 | 23.78 | 5,231.13 | 47.6% |
| 45 g / 50 CFA | 166 | 34.75 | 15.25 | 2,531.13 | 30.5% |

At the first offer, selling **116 of 220 pieces (52.7%)** recovers only the known ingredients. The remaining **23.78 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 32. Kumba bread

**Basis:** `Kumba bread!D5:D12`. Nominal dough/mix mass: **43,575.00 g**. Known batch ingredients: **16,401.69 CFA**. No operating costs are included.

**Key problem and action:** Secondary sales rows reference empty batches. Wholesale formulas imply 12 pieces of 900 g for only 1,000 CFA, apparently a copied pricing error. The 80 g manual offer differs from 90 g main offer.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 900 g / 1000 CFA | 48 | 341.70 | 658.30 | 31,598.31 | 65.8% |
| 90 g / 100 CFA | 484 | 33.89 | 66.11 | 31,998.31 | 66.1% |
| 90 g / 100 CFA | 484 | 33.89 | 66.11 | 31,998.31 | 66.1% |
| 900 g / 1000 CFA | 48 | 341.70 | 658.30 | 31,598.31 | 65.8% |
| 80 g / 100 CFA (manual) | 544 | 30.15 | 69.85 | 37,998.31 | 69.8% |
| 12 × 900 g / 1000 CFA (suspect formula) | 48 | 341.70 | -258.37 | -12,401.69 | -310.0% |

At the first offer, selling **17 of 48 pieces (35.4%)** recovers only the known ingredients. The remaining **658.30 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 33. Hamburger buns

**Basis:** `Hamburger buns!D5:D12`. Nominal dough/mix mass: **17,480.00 g**. Known batch ingredients: **5,899.21 CFA**. No operating costs are included.

**Key problem and action:** EDC uses powder-milk pack weight. Scaled batches use a different formula. The 370–700 g sale sizes look like loaves/packs; confirm units and whether any filling is included.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 370 g / 500 CFA | 47 | 125.52 | 374.48 | 17,600.79 | 74.9% |
| 190 g / 250 CFA | 92 | 64.12 | 185.88 | 17,100.79 | 74.4% |
| 700 g / 1000 CFA | 24 | 245.80 | 754.20 | 18,100.79 | 75.4% |
| 380 g / 500 CFA (manual) | 46 | 128.24 | 371.76 | 17,100.79 | 74.4% |
| 190 g / 250 CFA (manual) | 92 | 64.12 | 185.88 | 17,100.79 | 74.4% |

At the first offer, selling **12 of 47 pieces (25.5%)** recovers only the known ingredients. The remaining **374.48 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 34. Taste it

**Basis:** `Taste it!D5:D15`. Nominal dough/mix mass: **16,045.00 g**. Known batch ingredients: **9,065.64 CFA**. No operating costs are included.

**Key problem and action:** Baking powder denominator is wrong. The 800 g/1,000 CFA format has a lower margin than 700 g at the same price. Manual costs use price/weight, not recipe cost.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 800 g / 1000 CFA | 20 | 453.28 | 546.72 | 10,934.36 | 54.7% |
| 140 g / 200 CFA | 114 | 79.52 | 120.48 | 13,734.36 | 60.2% |
| 700 g / 1000 CFA | 22 | 412.07 | 587.93 | 12,934.36 | 58.8% |
| 700 g / 1000 CFA (manual) | 22 | 412.07 | 587.93 | 12,934.36 | 58.8% |
| 86 g / 100 CFA (manual) | 186 | 48.74 | 51.26 | 9,534.36 | 51.3% |

At the first offer, selling **10 of 20 pieces (50.0%)** recovers only the known ingredients. The remaining **546.72 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 35. Samosa

**Basis:** `Samosa!D5:D9`. Nominal dough/mix mass: **5,210.00 g**. Known batch ingredients: **6,402.72 CFA**. No operating costs are included.

**Key problem and action:** No frying oil or spices are listed. Filling cooking loss and assembly labour are missing. Salt is 110 g for 1,500 g flour; check formula and batch basis.

**Missing ingredient cost:** Frying oil consumed/discarded. Surplus and margin below are partial-cost indications only.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 25 g / 50 CFA | 208 | 30.78 | 19.22 | 3,997.28 | 38.4% |
| 140 g / 200 CFA | 37 | 173.05 | 26.95 | 997.28 | 13.5% |
| 700 g / 1000 CFA | 7 | 914.67 | 85.33 | 597.28 | 8.5% |
| 700 g / 1000 CFA (manual) | 7 | 914.67 | 85.33 | 597.28 | 8.5% |
| 86 g / 100 CFA (manual) | 60 | 106.71 | -6.71 | -402.72 | -6.7% |
| 12 × 25 g / 500 CFA (wholesale) | 204 | 31.39 | 10.28 | 2,097.28 | 24.7% |

At the first offer, selling **129 of 208 pieces (62.0%)** recovers only the known ingredients. The remaining **19.22 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 36. Ice Cream

**Basis:** `Ice Cream!D5:D9`. Nominal dough/mix mass: **15,500.00 g**. Known batch ingredients: **9,361.20 CFA**. No operating costs are included.

**Key problem and action:** The 200 g stabilizer is 1.29% of mix: verify the specific product dose. The 200 g others are priced but unidentified. Overrun cannot increase saleable grams; cups, refrigeration and cleaning are missing.

**Price qualification:** Recipe price retained; item identity unknown.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 70 g / 100 CFA | 221 | 42.36 | 57.64 | 12,738.80 | 57.6% |
| 45 g / 50 CFA | 344 | 27.21 | 22.79 | 7,838.80 | 45.6% |

At the first offer, selling **94 of 221 pieces (42.5%)** recovers only the known ingredients. The remaining **57.64 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 37. Melto1

**Basis:** `Melto1!D5:D10`. Nominal dough/mix mass: **7,540.00 g**. Known batch ingredients: **5,682.32 CFA**. No operating costs are included.

**Key problem and action:** H is not an exact scale of D. Its 50 kg column uses 50.04 kg flour. Confirm the distinct product purpose versus Melto; the 45 g/50 CFA format is weaker.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 35 g / 50 CFA | 215 | 26.43 | 23.57 | 5,067.68 | 47.1% |
| 45 g / 50 CFA | 167 | 34.03 | 15.97 | 2,667.68 | 31.9% |

At the first offer, selling **114 of 215 pieces (53.0%)** recovers only the known ingredients. The remaining **23.57 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 38. Croissant

**Basis:** `Croissant!D5:D12`. Nominal dough/mix mass: **6,590.00 g**. Known batch ingredients: **3,070.41 CFA**. No operating costs are included.

**Key problem and action:** Source margin uses D18=350 rather than C18=45. Confirm whether 1,000 g butter includes all lamination butter. Lamination labour, trim and refrigeration are uncosted.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 45 g / 100 CFA | 146 | 21.03 | 78.97 | 11,529.59 | 79.0% |
| 190 g / 250 CFA | 34 | 90.31 | 159.69 | 5,429.59 | 63.9% |
| 700 g / 1000 CFA | 9 | 341.16 | 658.84 | 5,929.59 | 65.9% |
| 380 g / 500 CFA (manual) | 17 | 180.61 | 319.39 | 5,429.59 | 63.9% |
| 190 g / 250 CFA (manual) | 34 | 90.31 | 159.69 | 5,429.59 | 63.9% |

At the first offer, selling **31 of 146 pieces (21.2%)** recovers only the known ingredients. The remaining **78.97 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 39. Universal bread

**Basis:** `Universal bread!D5:D15`. Nominal dough/mix mass: **41,170.00 g**. Known batch ingredients: **27,727.70 CFA**. No operating costs are included.

**Key problem and action:** Exclude 9 kg frying oil from dough yield while provisionally charging it in full. Condensed-milk identity is unresolved. The old report overstated output by including fryer oil.

**Price qualification:** Generic milk price used provisionally for condensed milk; confirm identity.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 81.4 g / 100 CFA | 505 | 54.91 | 45.09 | 22,772.30 | 45.1% |
| 90 g / 100 CFA | 457 | 60.67 | 39.33 | 17,972.30 | 39.3% |
| 90 g / 100 CFA | 457 | 60.67 | 39.33 | 17,972.30 | 39.3% |
| 900 g / 1000 CFA | 45 | 616.17 | 383.83 | 17,272.30 | 38.4% |
| 190 g / 250 CFA (manual) | 216 | 128.37 | 121.63 | 26,272.30 | 48.7% |
| 12 × 81.4 g / 1000 CFA (wholesale) | 504 | 55.02 | 28.32 | 14,272.30 | 34.0% |

At the first offer, selling **278 of 505 pieces (55.0%)** recovers only the known ingredients. The remaining **45.09 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 40. Sheet3

**Basis:** `Sheet3!D5:D15`. Nominal dough/mix mass: **19,250.00 g**. Known batch ingredients: **9,161.49 CFA**. No operating costs are included.

**Key problem and action:** This is an unnamed but populated bread recipe, so it is included. Name and approve it before use. D/F/H formulations and manual price calculations differ.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 144 g / 125 CFA | 133 | 68.88 | 56.12 | 7,463.51 | 44.9% |
| 500 g / 500 CFA | 38 | 241.09 | 258.91 | 9,838.51 | 51.8% |
| 139 g / 150 CFA | 138 | 66.39 | 83.61 | 11,538.51 | 55.7% |
| 133 g / 150 CFA (manual) | 144 | 63.62 | 86.38 | 12,438.51 | 57.6% |
| 130 g / 150 CFA (manual) | 148 | 61.90 | 88.10 | 13,038.51 | 58.7% |

At the first offer, selling **74 of 133 pieces (55.6%)** recovers only the known ingredients. The remaining **56.12 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

### 41. Croissant new

**Basis:** `Croissant new!F5:F14`. Nominal dough/mix mass: **5,800.00 g**. Known batch ingredients: **3,639.55 CFA**. No operating costs are included.

**Key problem and action:** Layering butter points to EDC price divided by powder-milk weight. Reprice its 600 g at the master butter rate, provisionally. Confirm that the quoted fat is suitable for lamination.

**Price qualification:** Master butter rate used provisionally; lamination fat specification unconfirmed.

| Offer | Whole pieces | Ingredients / piece CFA | Remainder / piece CFA | Ingredient surplus / batch CFA | Ingredient margin |
|---|---:|---:|---:|---:|---:|
| 50 g / 100 CFA | 116 | 31.38 | 68.62 | 7,960.45 | 68.6% |
| 200 g / 300 CFA | 29 | 125.50 | 174.50 | 5,060.45 | 58.2% |
| 700 g / 1000 CFA | 8 | 454.94 | 545.06 | 4,360.45 | 54.5% |
| 380 g / 500 CFA (manual) | 15 | 242.64 | 257.36 | 3,860.45 | 51.5% |
| 190 g / 250 CFA (manual) | 30 | 121.32 | 128.68 | 3,860.45 | 51.5% |

At the first offer, selling **37 of 116 pieces (31.9%)** recovers only the known ingredients. The remaining **68.62 CFA per sold piece** is the maximum available under this nominal-yield calculation for omitted costs and any profit.

## Closing the profitability gaps

Use a short production trial for each selected SKU. Record the exact approved formula, weighed edible ingredients, actual batch cost, raw dough weight, cooled output, good pieces, rejects, portions sold at each price, unsold pieces, packaging consumed, paid labour minutes and energy use. For filled products, separately record cooked filling yield and filling grams per piece. For dairy products, record cold-storage and cleaning costs as well.

Enter measured yield and sell-through in the workbook. Enter all five operating costs, using zero only where the cost is genuinely absent. Fix the six missing ingredient lines and unresolved milk/fat/egg purchasing specifications. Then evaluate operating profit per batch and per constrained production hour. Do not choose the menu on ingredient margin percentage alone.

For a target operating margin m, a useful price test is **(batch ingredient cost + non-ingredient batch cost + packaging for all produced pieces) ÷ expected sold pieces ÷ (1 − m)**. This is an economic requirement, not proof that customers will accept the price. Validate any changed weight, price and quality in a controlled selling trial.

## Ingredient cost reference

Rates come from the current workbook’s ` COST rRAW MATERIAL` sheet unless explicitly stated. Pack weights are the source numbers, treated as grams. Both egg purchasing options are retained; recipe links determine the option. Unlinked eggs use the tray rate provisionally. Flour Bir is retained where expressly referenced. Duplicate onion entries have the same 2 CFA/g rate.

| Ingredient | Pack price CFA | Pack weight g | CFA/kg | Source |
|---|---:|---:|---:|---|
| Flour | 21,000.00 | 50,000 | 420.00 | ' COST rRAW MATERIAL'!B4:D4 |
| Sugar | 32,000.00 | 50,000 | 640.00 | ' COST rRAW MATERIAL'!B5:D5 |
| salt | 3,700.00 | 18,000 | 205.56 | ' COST rRAW MATERIAL'!B6:D6 |
| butter | 12,000.00 | 9,500 | 1,263.16 | ' COST rRAW MATERIAL'!B7:D7 |
| oil | 30,500.00 | 25,000 | 1,220.00 | ' COST rRAW MATERIAL'!B8:D8 |
| yeast | 1,400.00 | 500 | 2,800.00 | ' COST rRAW MATERIAL'!B9:D9 |
| baking powder | 1,300.00 | 500 | 2,600.00 | ' COST rRAW MATERIAL'!B10:D10 |
| egg carton | 25,000.00 | 18,000 | 1,388.89 | ' COST rRAW MATERIAL'!B11:D11 |
| improver | 1,400.00 | 500 | 2,800.00 | ' COST rRAW MATERIAL'!B12:D12 |
| egg tray | 2,000.00 | 1,500 | 1,333.33 | ' COST rRAW MATERIAL'!B13:D13 |
| NUTMEG | 9,000.00 | 1,000 | 9,000.00 | ' COST rRAW MATERIAL'!B14:D14 |
| milk | 1,170.00 | 1,000 | 1,170.00 | ' COST rRAW MATERIAL'!B15:D15 |
| water | 1.00 | 10,000 | 0.10 | ' COST rRAW MATERIAL'!B16:D16 |
| powder milk | 80,000.00 | 25,000 | 3,200.00 | ' COST rRAW MATERIAL'!B17:D17 |
| Milk tantalizer | 45,000.00 | 4,000 | 11,250.00 | ' COST rRAW MATERIAL'!B18:D18 |
| EDC | 3,000.00 | 1,000 | 3,000.00 | ' COST rRAW MATERIAL'!B19:D19 |
| BUTTER 2 | 12,000.00 | 9,500 | 1,263.16 | ' COST rRAW MATERIAL'!B20:D20 |
| Chocolate | 17,000.00 | 9,500 | 1,789.47 | ' COST rRAW MATERIAL'!B21:D21 |
| fish | 24,000.00 | 20,000 | 1,200.00 | ' COST rRAW MATERIAL'!B22:D22 |
| carrots | 600.00 | 700 | 857.14 | ' COST rRAW MATERIAL'!B23:D23 |
| Green beans | 200.00 | 1,000 | 200.00 | ' COST rRAW MATERIAL'!B24:D24 |
| peppers | 200.00 | 500 | 400.00 | ' COST rRAW MATERIAL'!B25:D25 |
| onions | 100.00 | 50 | 2,000.00 | ' COST rRAW MATERIAL'!B26:D26 |
| irish | 4,000.00 | 7,000 | 571.43 | ' COST rRAW MATERIAL'!B27:D27 |
| honey | 10,000.00 | 8,000 | 1,250.00 | ' COST rRAW MATERIAL'!B29:D29 |
| Icing Sugar | 1,100.00 | 500 | 2,200.00 | ' COST rRAW MATERIAL'!B30:D30 |
| stabilizer | 3,200.00 | 250 | 12,800.00 | ' COST rRAW MATERIAL'!B32:D32 |
| flour Bir | 20,000.00 | 50,000 | 400.00 | ' COST rRAW MATERIAL'!B36:D36 |
| meat | 2,500.00 | 1,000 | 2,500.00 | ' COST rRAW MATERIAL'!B37:D37 |
| onions | 2,000.00 | 1,000 | 2,000.00 | ' COST rRAW MATERIAL'!B38:D38 |
| Cabbage | Missing | 1,000 | Missing | Fish Pie!C16:K16 |
| Ice Cream others | 5,000.00 | 500 | 10,000.00 | Ice Cream!J9:K9 |

## Sources and verification

1. **Primary:** `Bakery recipes   melto 2026.xlsx`, supplied folder `E:\retail management systems`. Source SHA-256: `16e76d552c4fcec7a718ea791100e69ba10595ec4932680d9cfaa625bceb9283`. File modified 2 October 2026; reviewed 3 October 2026. The modification date is not an ingredient-price quotation date.

2. **Historical context:** `BAKERY_RECIPE_BOOK_2026.md` and `BAKERY_RECIPE_PROFITABILITY_REPORT_2026-05-31.md` in the same folder. Their older figures, recipes and unsupported profitability claims are not carried forward as current facts.

3. **Operating context:** `Nkambe_Bakery_Handbook.md`, chapter 12, and `Nkambe_Bakery_Business_and_Production_Plan.md` in `docs/bakery`. Their illustrative prices were not blended into the Melto price list. The separate rack comparison uses the handbook’s explicitly identified S-B01 planning formula.

4. **Coverage:** all 41 non-price worksheets are included, including `Sheet3`. There is no BUNS SPECIAL or Pancake sheet in this current workbook. Alternate non-proportional batch columns are flagged rather than represented as exact scaling. The unweighted 100 CFA row in CAKE NOW and unpriced chosen-weight notes cannot define an additional complete selling offer.

5. **Verification:** every offer’s whole-piece count, revenue, known ingredient cost per piece, surplus and margin is independently compared with the formula workbook. Formula checks also test a flour-price change, zero sell-through, and blank versus zero operating costs. No production yield, customer demand or supplier price has been independently observed. The original workbook is preserved.

The editable workbook accompanies this report. Its Prices, Ingredients and Sale formats sheets retain source cell references, and Batches contains the missing operating-cost inputs.
