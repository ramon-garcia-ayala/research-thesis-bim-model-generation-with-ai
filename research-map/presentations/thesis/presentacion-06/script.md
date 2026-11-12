# Pecha Kucha pitch · rehearsal script

15 slides × 20 s = 5:00. Each block is about 50 spoken words, which is the pace of one slide.
Read the **bold** words at a glance and improvise around them; the rest is only there so it sounds natural.
Every figure is the one on the slide. Where something is a plan, the script says so out loud.

## 1 · The need

Most real BIM models are **not ready to teach an AI**. Of **57 models** from practice, only five to ten were usable as they are. Another team asked **148 offices** and got **22 usable** files, partly because of its **six-class filter**. And many of those 57 came from **one project**. A pattern, not a census.

## 2 · The paradox

The data **exists**. Every office has years of models, but they sit **inside each office**. And what one project teaches **does not carry over**: door specification drops from point nine to **point two** when the training mixes typologies, and accuracy falls from over ninety-nine percent to **eighty-something** on a file the model never saw.

## 3 · The question

So here is the question. **Can we decompose BIM models into meaningful parts**, and use them to **generate new, valid models**? My hypothesis: if a model is broken into its **elements and relations**, an AI can find the patterns it needs to build something similar. That is the whole thesis, in one sentence.

## 4 · Step one, decompose

Step one: **take a model apart**. I ran a **round trip with no AI**, on Autodesk's sample project. Every element goes out to text and comes back into Revit: **180 of 180 walls**, 83 doors, 24 windows, all 16 floors. One wall is out of place, and rooms rebuild less well. So the **mechanics work**.

## 5 · Step two, mask

Step two: **learn by hiding**. This is the direction my supervisor approved. I hide part of a model and ask the AI to **predict it**. The literature points the right way: BIGNet masks half the nodes and, with only **thirty percent of the labels**, reaches point eighty-seven instead of point fifty. Still, this is **the plan**.

## 6 · Step three, assemble

Step three: **the AI proposes, and MCP builds it in Revit**. The order of placing is the experiment: **all at once**, **one by one**, or **one and its neighbours**. And the key test is **new, not a copy**: learn from nine models, test on one it has never seen. Again, this is **the plan**, not a result.

## 7 · Actors

Two actors matter here. **Data owners**: the AEC offices, who hold the models. And **tool developers**, who build what offices use. In the middle, my **pipeline**. Models go in, and what comes out is a **method and an MCP server** that developers can use. Offices give the data; developers get the tool.

## 8 · What I exploit

What do I exploit? **The parts**. Every model can be broken into **elements and relations**: walls, doors, windows, floors, rooms. Together they become a **dataset of examples**, and some of them get **masked** so the AI can learn to fill them back in. The raw material is not the file; it is **what is inside it**.

## 9 · How

How? **Inside the office**. The pipeline runs on the office's **own models**. The files **stay there**. Only the derived dataset, the elements and relations, **leaves**. So an office can learn from its own history **without handing over** its project files. Nothing here asks it to upload a model.

## 10 · To whom

To whom? Offices first. This is an **open invitation**: give me ten of your Revit models and I turn them into a **decomposed dataset** and a **first masking test**. You keep the pipeline. **Tool developers** come second, through the method and the MCP server. No office has joined yet; the offer is **open**.

## 11 · Short term

Short term, by the end of the thesis: **a method and a pipeline**, and **results on ten models** of one typology. I want to be careful here. This is **the goal**, not something I have today. What I have today is the **round trip**, with no AI; everything else is still to be built.

## 12 · Long term

Long term, the **horizon**: a **co-pilot inside Revit**, trained on each office's **own data**. It proposes the next element, and the modeller keeps the **criteria and the choice**. It is a direction, not a promise, and it only works if the first steps hold.

## 13 · Impact

Two dimensions of impact. **Technological**: real models become **training data**, which is exactly what the literature says is missing. And **professional and social**: the work moves from drawing to **criteria and choice**, and the data stays **in the office's hands**. I am not claiming savings in hours or money; I do not have that evidence.

## 14 · Readiness

Where am I? Today, **level three**: the round trip works in the lab, on one sample model. By the end of the thesis, I aim for **level four**, validated in the lab. Four steps get me there: **gather ten models and mask them**, **MCP assembling in Revit**, the **three placement orders**, and the **new-versus-copied test**.

## 15 · The close

So, where am I, and what do I need from you? Two questions. First: **what should be hidden first**? An element, a relation, a whole class like the openings? Second: **how do we prove** that what the AI generates is **new, and not a copy**? I would love your **feedback** on both. Thank you.
