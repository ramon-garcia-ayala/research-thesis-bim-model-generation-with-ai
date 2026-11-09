## 2026-10-22 · Summary
Delft. A benchmark of multi-apartment building complexes curated from Swiss Dwellings: generation constrained on a
zoning graph and the building structure (load-bearing walls and columns). Cleaning is all rules, each step counted
(residential only, near-duplicates, ≥15 areas…): 5,372 plans, over 18.9K apartments. Access graphs and load-bearing
walls are extracted algorithmically (polygons ≤0.04 m apart; walls thicker than the plan's 60% quantile).

Results: near-duplicates RPLAN 70%, LIFULL 50%, MSD <1%; graph entropy MSD 8.02 vs RPLAN 4.56. Baselines (modified
HouseDiffusion, GCN-conditioned U-Net) do poorly: MIoU 10.9–42.4, generated plans "often look infeasible".
User study: 7 architects, topology and proportions scored 0.37–0.51. Switzerland and residential only; no doors.

For the thesis
- States what realism requires (irregular shapes, multi-unit connectivity, structure) and gives two metrics a
  synthetic set can be measured with: near-duplicate rate and graph entropy.
- Scraped sets are highly redundant, and even "real" data needs rule-based cleaning and graph extraction.
- Against: current ML fails on complex layouts, so a synthetic set has to reach that complexity to be useful.
