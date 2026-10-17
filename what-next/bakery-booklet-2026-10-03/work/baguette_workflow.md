## Large-scale baguette production: oven-led scheduling

This expanded operating section was prepared after consulting the Commercial Baguette Production Guide (SRC21), Staggered Baguette Production Schedule (SRC27), the five-batch operations manual (SRC17), and the September corrected manual and equipment trial plan (SRC05/SRC07). It replaces their contradictory timing instructions with explicit calculations and a worked scheduling example. The timetable below is an editorial planning model, not an observed factory result.

### Choose the loaf specification before choosing the batch

Use S-B01 as the lean baguette formula: flour 100%, water 66%, salt 2%, instant yeast 0.5%. Its total formula factor is 1.685. Keep this formula distinct from the condensed-milk baguette variant. Fix the flour, yeast, dough temperature and proof method through trials before increasing rack volume.

Confirm that five loaves of the selected length and spacing actually fit each 40 × 60 cm tray, and that sixteen loaded trays bake evenly. Five per tray gives 80 loaves per rack. Neither tray area nor a nominal mixer rating alone establishes usable production capacity.

| Calculation | Result | Operational meaning |
|---|---|---|
| Source guide ingredients: 14.20 kg flour + 9.37 kg water + 284 g salt + 71 g yeast | 23.925 kg input | This is not 24 kg. It cannot produce 80 × 300 g even before handling loss. |
| Same source batch, assuming 2% handling loss | 23.4465 kg usable = 78 × 300 g + 46.5 g remainder | Replace the loss assumption with measured bowl, bench and dividing losses. |
| 300 g raw piece with 15% baking/cooling loss | 255 g cooled loaf | Do not label the result 250 g merely because the original report did. |
| Raw piece for a 250 g cooled target at 15% loss | 250 ÷ 0.85 = 294.12 g | A theoretical mean target, not a guarantee that every loaf meets declared net weight. Establish the actual distribution and label-control procedure. |
| Original 18 kg flour batch at 66% water, 2% salt and 0.5% yeast | 30.33 kg input; 29.7234 kg after assumed 2% handling loss | About 99 × 300 g plus 23.4 g, not one 80-loaf rack. Plan the surplus rack or resize the mix. |

For N loaves, raw piece mass w grams and measured handling-loss fraction h:

Flour required (g) = N × w ÷ [(1 − h) × 1.685]. Water = flour × 0.66; salt = flour × 0.02; instant yeast = flour × 0.005. Ice is part of the water amount, never an extra ingredient.

### One-rack planning example: 80 pieces at 300 g raw

| Ingredient | Calculated mass g, rounded to 0.1 g |
|---|---|
| Bread flour | 14,534.0 |
| Total water, including any ice | 9,592.4 |
| Salt | 290.7 |
| Instant dry yeast | 72.7 |
| Total input | 24,489.8 |

At the illustrative 2% handling loss, this provides approximately 24,000 g usable dough. Expect about 255 g per cooled loaf if the separate baking/cooling loss is 15%. These fine decimals explain the calculation; use suitable scales and a documented practical rounding/overage policy after measuring real variation. Do not reclaim dirty bench scraps to reach the theoretical count. Reserve separate dough for destructive samples if all 80 pieces must be saleable.

For a 250 g cooled target under the same assumptions, flour is approximately 14,249.0 g and raw pieces approximately 294.12 g; recalculate the remaining ingredients with the formula above. Do not change the dough weight without updating the cost and label specification.

Check minimum and maximum lean-dough load before running this 24.49 kg input example. The older reports conflict on mixer rating. A two-rack mix would be approximately 48.98 kg input and would create extra handling and fermentation queues; it is not automatically permitted by a “50 kg” machine description. Start with one validated rack-sized mix if the machine's minimum load allows it.

### Measure the complete oven cycle

Time rack loading, approved steam operation, baking, unloading and recovery to the next approved loading condition. Some steps overlap; record the actual start-to-start interval rather than adding overlapping observations twice. The source reports disagree between three minutes of turnaround and a supposedly mandatory 23-minute recovery. Neither recovery allowance has been established for this oven.

| Scenario | Planning capacity at 80 loaves/rack | Requirement |
|---|---|---|
| 22-minute bake + 3-minute complete turnaround | 192 loaves/hour at 25-minute rack starts | Only if repeat loaded trials demonstrate recovery, handling and upstream supply at that pace. |
| 22-minute bake + 8-minute complete turnaround | 160 loaves/hour at 30-minute rack starts | Worked example below; every station must sustain this rate. |
| One rack supplied every 45 minutes | 106.7 loaves/hour maximum sustained supply | A faster oven does not remove the upstream gap. |
| Dividing or cooling/packing limited to 100 loaves/hour | 100 loaves/hour; at least 48 minutes per 80-loaf batch | This was a September workbook assumption, not a measured rate. If confirmed, it governs the line until improved. |

The line's rack-start interval must be at least the largest of: measured complete oven cycle; mixer occupied time per rack batch; dividing/shaping time per rack; rack-equivalent packing/cooling constraint; and final-proof duration divided by the number of usable proof positions. Also check shared workers, trays, dough bins and rack movements; capacity cannot be counted twice when the same person serves two stations.

At a 22-minute bake, productive baking occupies 88% of a 25-minute interval, 73.3% of a 30-minute interval, and 48.9% of a 45-minute interval. These are time ratios, not burner-efficiency or fuel-saving measurements. Record diesel use and electricity separately.

### Corrected five-rack worked schedule

Assumptions for this example: mixing plus the source's short rest occupies 18 minutes; bulk fermentation is 45 minutes; dividing, preshaping, bench rest, moulding and tray loading occupy 27 minutes; final proof is about 60 minutes; oven slots start every 30 minutes with a 22-minute bake and eight minutes for complete turnaround. All times are elapsed from the first mix. Dough readiness overrides the clock.

The 18-minute source sequence includes yeast before a short rest, so it is not a strict flour-and-water-only autolyse. S-B01 uses a different mixing/rest sequence. The timetable is a scheduling exercise: select and validate one mixing program, measure its true occupied time, and shift the downstream times accordingly. Do not silently splice the two processes together.

| Rack batch | Mix/rest | Bulk fermentation | Divide, rest, mould, load | Final proof / ready window | Oven in–out |
|---|---|---|---|---|---|
| 1 | 00:00–00:18 | 00:18–01:03 | 01:03–01:30 | 01:30–02:30 | 02:30–02:52 |
| 2 | 00:30–00:48 | 00:48–01:33 | 01:33–02:00 | 02:00–03:00 | 03:00–03:22 |
| 3 | 01:00–01:18 | 01:18–02:03 | 02:03–02:30 | 02:30–03:30 | 03:30–03:52 |
| 4 | 01:30–01:48 | 01:48–02:33 | 02:33–03:00 | 03:00–04:00 | 04:00–04:22 |
| 5 | 02:00–02:18 | 02:18–03:03 | 03:03–03:30 | 03:30–04:30 | 04:30–04:52 |

This plans 400 pieces before bake rejects and samples. The last rack exits 4 hours 52 minutes after the first mix; cooling, packing, transport and cleaning continue afterwards. The 160 loaves/hour figure is steady-state slot capacity, not the average output from shift start. Arrange scoring and transfer within the measured handover allowance and readiness window; increase the interval if the actual work cannot fit.

The original schedule placed Rack 1 into proof at 01:30 but into the oven at 02:15 while calling that 60 minutes; it is 45 minutes. Its Batch 2 oven times also disagreed with the stated stagger. The corrected example keeps every proof window at 60 minutes and every rack start 30 minutes apart. A fixed 45-minute stagger can still be chosen if it suits measured staffing and demand; it simply does not fill a 25-minute oven cycle continuously.

For a chosen interval C minutes, shift every stage of rack n by (n − 1) × C from rack 1, then check that no resource overlaps beyond its capacity. If a station cannot process 80 loaves within the chosen interval, lengthen C or qualify a specific improvement before starting a larger campaign.

### Proofers, racks, cooling space and staffing

At 60-minute final proof and 30-minute arrivals, two 16-tray rack-equivalents are in proof simultaneously. Provide handover space and a contingency plan for a delayed oven; do not count an occupied passage as a proof position. The earlier inventory lists two 32-tray proofers, but cabinet tray slots do not prove wheeled oven racks fit. Check actual rack geometry, airflow, door opening and transfer time.

Plan at least two rack-equivalents in proof, one in the oven and one being loaded at peak overlap, plus separate cooling capacity. This can be achieved with the appropriate combination of racks and trays; verify the actual transfer method before purchasing. If bread cools on oven racks, those racks remain unavailable until safely unloaded. With an illustrative 45-minute cooling occupancy and 30-minute output interval, allow at least two rack-equivalents of cooling space, then verify actual cooling and packing time.

| Role | Required handoff | Efficiency check |
|---|---|---|
| Mixer operator | Label batch/bin with mix end, dough temperature and bulk-ready time | Preweigh the next batch while the mixer is free; maintain enough chilled formula water without adding uncounted ice. |
| Divider/moulder operator or team | Deliver a correctly counted and identified rack with consistent piece weights | Time all weighing, bench rest and tray handling. The example's 27-minute block must be demonstrated, not assumed. |
| Oven/proof operator | Accept ready dough, score/load, log program and release baked rack | Control oven slots and proof readiness together; avoid simultaneous duties that leave the oven or proofer unattended. |
| Cooling/packing/dispatch support | Receive hot racks, cool, count, pack and record dispatch | Keep this work from blocking the oven operator or occupying the next empty rack. Assign a trained runner during peaks if needed. |

These are responsibilities, not a guarantee that three people can perform all jobs at the target rate. Time the actual staffing arrangement. Measure units per paid labour hour and avoid moving a bottleneck from the mixer to packing.

### Oven operating sequence and fuel discipline

1. Before mixing, confirm the day's orders, approved loaf weight, rack count, tray availability, water, ingredients, fuel, electrical auxiliaries and cooling space. Plan the last partial batch from demand; do not create unsold bread to improve apparent oven utilization.
2. Use the oven manufacturer's startup, combustion and exhaust checks. Start preheating from measured cold-start time so the oven is ready for the first proofed rack. Avoid a long empty hot hold caused by starting the oven far earlier than the dough.
3. Follow the selected baguette trial program. S-B01 starts around 230°C loading and 215–220°C baking for 20–25 minutes; the older guide proposed 240°C then 220°C. These are alternative starting trials, not universal settings. Map colour, crumb set and cooled weight across a full rack before fixing one program.
4. Apply early steam only through the approved system and dose established for this model. The old 15–20-second steam instruction cannot be transferred blindly. Do not add water to an oven floor or improvise a steam method. Score consistently using the S-B01 technique.
5. Keep loading and unloading orderly and doors open only as long as safe handling requires. Do not bypass guards or rush around hot racks to save seconds. Verify the recovery condition before admitting the next rack.
6. Use approved venting near the end of the bake to achieve the tested crust. Assess representative top, middle and bottom trays. Do not release underbaked centers merely because the exterior is brown.
7. Run compatible baguette batches together. Schedule lower-temperature products afterwards only when their validated time, temperature, steam and hygiene requirements fit. Residual heat is useful only if measured conditions complete the product's bake; it does not make fuel cost zero.
8. Transfer baked bread to protected ventilated cooling. Do not seal hot baguettes in airtight transport bins. Fully cool before any packaging that traps moisture. Treat par-baking or frozen-dough distribution as separate development projects with their own cooling, storage and finishing specifications.

### When the timetable slips

| Observation | Immediate operating response | Adjustment before the next campaign |
|---|---|---|
| Oven is ready but the next rack is not proofed | Wait for dough readiness; record the idle interval | Recheck upstream timing and proof conditions. Do not compensate with an unrecorded yeast increase. |
| Dough is ready but oven recovery is late | Apply the approved delay/hold procedure and identify the affected batch; withhold unacceptable overproofed product | Lengthen the rack interval or resolve recovery with the service technician. Do not overheat the next bake to catch up. |
| Dividing or loading falls behind | Slow or pause future mix starts while keeping existing batches controlled | Measure task times, revise crew allocation and only then revise batch cadence. |
| No empty rack, tray or cooling position | Stop releasing additional batches into the bottleneck | Recalculate equipment circulation and cooling space; separate dispatch from oven handoffs. |
| Bake colour differs across trays | Segregate the affected output and inspect the rack pattern | Check load spacing, approved airflow/rotation and maintenance; do not improvise unsafe rack manipulation. |
| Demand is below the planned output | Reduce or cancel unstarted batches | Use orders and sell-through to set campaign length; a full rack of unsold bread is not an efficiency gain. |

Do not use an unqualified refrigerator as an emergency dough-retarder or extend proof indefinitely. Any hold/retard method must be tested with the actual formula and equipment.

### Campaign record and scale-up decision

For each rack record: batch ID; input/usable dough mass; raw piece count and weights; dough temperature; mix/bulk/shape/proof timestamps; oven load/unload/next-ready times; steam/vent program; rack positions sampled; cooled weights; rejects; cooling/packing release; dispatch count; fuel and electrical meter readings where available; labour and stoppage reasons.

Calculate observed rack interval, good loaves/hour, diesel litres per 100 good loaves, electricity kWh per 100 good loaves, paid labour minutes per 100 good loaves, reject rate and sell-through. Include warm-up and shutdown in campaign energy costs; do not allocate only the minutes when bread is inside the oven.

Qualify the formula and one loaded rack first, then run two consecutive racks to expose overlaps, followed by the five-rack campaign only when proof space, handoffs, recovery and cooling remain stable. Repeat the successful arrangement on three runs before treating its capacity as dependable. Replace every assumed time and loss in this example with measured results and issue the resulting station schedule.
