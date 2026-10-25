# Video Demo — Part 1: Client Pitch Script

**Audience**: Energy utility stakeholders — not necessarily technical, but business-savvy  
**Duration**: Under 5 minutes  
**Tone**: Confident, clear, professional — no unnecessary jargon

---

## Before You Hit Record
- Open [http://localhost:3000](http://localhost:3000) in full screen
- Load **January 15, 2026** on the Dashboard
- Cutoff set to **11:00 UTC**

---

## The Script

---

### ⏱️ [0:00 – 0:45] — The Problem

*(Screen: Dashboard loaded, nothing clicked yet)*

> **You say:**
>
> "Every day, your team has to make a big purchasing decision before the day-ahead electricity auction closes — typically around 11 AM.
>
> A large part of that decision depends on one question: *how much wind power is actually going to arrive tomorrow?*
>
> If the forecast says wind will cover a lot of your demand, you buy less backup power. If the forecast is wrong — and wind underdelivers — you're short. And buying emergency power at the last minute is significantly more expensive than buying it in advance.
>
> The problem is: **wind forecasts are often wrong. And in January 2026, they were wrong in a very specific, costly way — they consistently over-promised.**
>
> WindWise is the tool that makes that visible, quantifies it, and helps your desk make smarter decisions because of it."

---

### ⏱️ [0:45 – 2:00] — The Dashboard: Day-Ahead Decision Cockpit

*(Action: Point to the cutoff selector at the top. Switch between 11:00 and 12:00, then back. Point at the teal banner. Hover over a point on the chart at 15:00)*

> **You say:**
>
> "Let's look at January 15th, 2026.
>
> At the top, you set your auction cutoff time — 11:00 UTC for EPEX SPOT, 12:00 for Nord Pool. WindWise locks in to that cutoff strictly. It will only use forecast data that was published *before* your decision deadline — no hindsight, no post-cutoff revisions.
>
> The banner confirms exactly which forecast was used: **Published January 14th at 09:30 UTC.** Full transparency, fully auditable.
>
> The chart shows two things:
> - The **green shaded area** — the day-ahead wind forecast your desk would have relied on
> - The **darker line** — what wind actually generated that day
>
> Look at the gap between them. At 3 PM, the forecast said **9,134 MW** of wind. Actual generation was **8,545 MW** — a shortfall of **589 MW**.
>
> That gap, repeated across every hour of the day, is what this platform tracks."

---

### ⏱️ [2:00 – 2:50] — Illustrative Supply Scenario

*(Action: Open the Illustrative Supply Scenario panel. Slowly adjust the demand slider to 25,000 MW and safety margin to 5%)*

> **You say:**
>
> "This next section turns the forecast data into a procurement sizing tool.
>
> You input your expected demand — say 25,000 MW — your anticipated wind share, and any safety margin your risk policy requires.
>
> WindWise calculates and overlays your net thermal procurement target for every hour of the delivery day — shown here as the dashed line.
>
> Drag the safety margin up to 5%, and you can see that target shift. That buffer accounts for the forecast uncertainty we just saw.
>
> This is illustrative — it's a decision-support view, not a trading system. But it gives your desk a structured, consistent way to factor in forecast risk every single day."

---

### ⏱️ [2:50 – 3:50] — Accuracy Analytics: The Big Finding

*(Action: Click "Accuracy Analytics" in the sidebar. Select "Full Month (31 Days)")*

> **You say:**
>
> "Now, the accuracy scorecard — and this is where the real value is.
>
> Looking at the full month of January 2026, across all 744 hourly intervals with 100% data coverage:
>
> - **MAE: 2,123 MW** — that's the average deviation between forecast and actual, every hour
> - **RMSE: 2,617 MW** — weighted higher for the worst-case events
> - **WAPE: 18.3%** — percentage error, relative to actual generation
>
> But the most important number here is this one: **Mean Bias: +1,840 MW.**
>
> A positive bias means the forecast was not just inaccurate — it was *systematically* inaccurate in one direction. It over-predicted wind generation, consistently, every day for the entire month.
>
> That's not random noise. That's a pattern. And a pattern can be anticipated.
>
> If your desk knows the forecast tends to run 1,800 MW high, you can build that correction into your purchasing decisions — reducing your exposure to costly real-time balancing."

---

### ⏱️ [3:50 – 4:30] — Delivery Ledger & Close

*(Action: Click "Delivery Periods" in the sidebar. Scroll through the table. Hover over "Export CSV Audit")*

> **You say:**
>
> "Finally, the Delivery Ledger.
>
> Every settlement period — all 48 half-hours of the day — with the exact forecast used, the actual generation recorded, the error, and the publication timestamp of each forecast vintage.
>
> Your settlement and compliance teams can export the full dataset as a CSV with one click.
>
> So — to bring this together:
>
> WindWise gives you three things: **visibility** into what the day-ahead forecast said versus reality, **accountability** by enforcing your exact auction cutoff, and **insight** through quantified accuracy metrics your team can act on.
>
> In January 2026, UK wind forecasts ran over **1,800 MW high, every hour, for a full month.** That's the kind of systematic error that is invisible without a tool like this — and expensive without the context to act on it.
>
> Thank you."

---

## Recording Tips

| Tip | Why It Matters |
|-----|----------------|
| Speak at a measured pace — not rushed | Big numbers need a moment to land |
| Move the cursor deliberately when pointing at data | Viewer needs time to follow |
| Pause briefly after the key stats (2,123 / +1,840) | Emphasis — these are your punchlines |
| Keep eye contact with the camera when wrapping up | Closes strong |
| Target 4:15–4:30 | Stays safely under the 5-minute cap |

---

## Key Numbers to Know Cold

| Metric | Value | What It Means |
|--------|-------|---------------|
| MAE | **2,123 MW** | Average hourly forecast error |
| RMSE | **2,617 MW** | Error weighted for worst-case events |
| Mean Bias | **+1,840 MW** | Systematic over-forecast — the key story |
| WAPE | **18.3%** | Percentage error against actuals |
| Coverage | **100%** | All 744 January intervals matched |
| Jan 15 @ 15:00 gap | **589 MW** | Your live demo highlight |
