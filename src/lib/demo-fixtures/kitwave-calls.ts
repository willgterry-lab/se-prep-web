import type {
  MeddpiccScore,
  MeddpiccDelta,
  RiskItem,
  NextAction,
  ExtractedStakeholder,
  SuccessCriterion,
  PovAssessment,
  MatchedCaseStudy,
  VeBaselineInput,
} from "@/types"

// Baked from a real, once-only run of the live analysis pipeline against the
// five real Kitwave call transcripts (post-call, POV setup/checkin/final review,
// VE workshop) -- same discipline as kitwave-group.ts's research+prep fixtures.
// Not hand-authored: every evidence quote, risk, and email here is genuine model
// output verified against the real transcripts, not fabricated to fit the schema.

// A completed-task detection from the real run, remapped from the debug run's
// synthetic task ids (meaningless in production) to the task's description text --
// matched against real deal_tasks rows by description at cache-serving time, since
// the real DB-assigned ids don't exist until the corresponding fixture stage's own
// actions are actually inserted.
export interface CachedCompletedTask {
  description: string
  evidence: string
}

export interface CachedPostCallFixture {
  meddpicc: MeddpiccScore
  delta: MeddpiccDelta | null
  risks: RiskItem[]
  email: string
  actions: NextAction[]
  stakeholders: ExtractedStakeholder[]
  completedTasks: CachedCompletedTask[]
  callDate: string
}

export const KITWAVE_POST_CALL: CachedPostCallFixture = {
  "meddpicc": {
    "metrics": {
      "score": 1,
      "evidence": "Sixty-eight percent of those arrive through a channel someone has to key by hand... Call it seven thousand eight hundred orders a week being keyed into Swords manually. / Six minutes on average... Voicemails run longer. / roughly forty-seven thousand minutes a week, call it seven hundred and eighty hours, across the division. / forty-six people across the ten sales offices, which fully loaded is about one point six million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin.",
      "gap": "What is the fully-loaded revenue or margin contribution of the South West DC specifically, so pilot success criteria can be expressed in the same units Marcus will present to OEP? What threshold of basis-point improvement counts as a win in the July/August portfolio review?"
    },
    "economic_buyer": {
      "score": 3,
      "evidence": "The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin, alongside delivering the synergy case on the acquisitions. His words to me were that Foodservice is why the group's margin story works... Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August. / And I'll get Marcus. If this is going into his review cycle, he'll want to have shaped the success criteria himself.",
      "gap": "What is the exact spend threshold that triggers OEP involvement versus Marcus signing alone? Has Marcus seen any Choco materials directly yet, or is all framing still mediated through Gemma?"
    },
    "decision_criteria": {
      "score": 2,
      "evidence": "My bar, first, a genuine two-way integration, live pricing, live stock, live order history, not a batch file at midnight. Second, I want a data flow diagram showing exactly what leaves our environment, where it's processed and where it rests, GDPR is table stakes but... I'll want Cyber Essentials Plus evidenced and a recent pen test summary. Third, and this is the one that kills most vendors, I have no integration capacity to give you. If this needs six months of my people, it's dead on arrival. / Walking into the August portfolio review with results from the peak is a different conversation from results from a quiet April.",
      "gap": "What are Marcus's explicit quantitative success criteria for the pilot - specific error-rate reduction, hours saved, or credit-note reduction targets he would commit to ahead of the August review? Does OEP have its own evaluation criteria beyond the margin number?"
    },
    "decision_process": {
      "score": 1,
      "evidence": "Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August. / Then the sequencing is, Andrea, a short technical session this week so integration and security are settled before anyone says the word contract, then a setup call with Marcus in the room to lock scope and success criteria, with Lee there too. / Send times for Thursday or Friday. I'd rather find the problems now than in a procurement thread in August. / If we went live mid-June we'd have four weeks of results by mid-July, which is ahead of the August review.",
      "gap": "Who runs procurement formally for a spend of this size - is there a Group procurement function or legal review step between Marcus approving and a contract being signed? Does OEP require a formal sign-off on new vendor relationships above a certain value?"
    },
    "paper_process": {
      "score": 0,
      "evidence": "I'd rather find the problems now than in a procurement thread in August.",
      "gap": "What does the formal procurement and legal process look like - is there a vendor onboarding checklist, standard contract terms, data processing agreement requirements, or insurance minimums set by OEP's diligence team? Who owns supplier contracts at Group level and what are typical cycle times?"
    },
    "identify_pain": {
      "score": 3,
      "evidence": "Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / If the six a.m. voicemail queue disappeared, my Exeter team would build you a statue. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Foodservice is why the group's margin story works, we're the higher-margin division, so we're the ones who have to prove the model scales profitably.",
      "gap": "Has the cost of coordinator attrition risk (e.g. Dawn's near-departure) been formally quantified alongside the overtime and credit-note numbers? Is there a measured impact on customer satisfaction or churn from missed next-day cutoffs during peak?"
    },
    "champion": {
      "score": 2,
      "evidence": "I did, and it took some doing across ten sites. / I asked him directly. The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin. / That's the version of brave Marcus tends to like. / And I'll get Marcus. If this is going into his review cycle, he'll want to have shaped the success criteria himself. / If we went live mid-June we'd have four weeks of results by mid-July, which is ahead of the August review. Tight but real.",
      "gap": "Has Gemma explicitly positioned Choco to Marcus as her recommended solution, or is she still presenting it as one of several options? Does she have a track record of successfully sponsoring third-party vendor initiatives through Marcus and the OEP review cycle?"
    },
    "competition": {
      "score": 3,
      "evidence": "What about the REKKI attempt at High Wycombe? I wasn't close to it, but the residue of it is that people here think this category doesn't work. / REKKI reads email and app-style orders reasonably well. It does nothing for phone and voicemail, which for you is roughly half of everything, and it had no path into Swords, so even what it did capture got re-keyed, which means it added a step instead of removing one. / That framing will land better with the group exec than 'your portal failed', for what it's worth.",
      "gap": "Is there any ongoing evaluation of other AI order-capture vendors, or has the REKKI failure effectively closed the market for alternatives internally? Is the Swords web ordering module extension still being actively considered by IT, or has Andrea formally parked it pending acquisition integrations?"
    },
    "overall_score": 15,
    "summary": "This is a promising early-stage discovery position: economic buyer mandate, identified pain, and competitive context are now well evidenced, but formal decision criteria, decision process, and paper process are still mostly unexplored, and the numbers so far (£2.8M credit exposure, £1.6M team cost, 150bps margin mandate) haven't yet been organised into a structured business case. The primary remaining risks are paper process opacity - procurement and legal cycle times are unknown and could compress the mid-June go-live - and the need to lock Marcus's own success criteria before the setup call so the August OEP narrative is built on agreed numbers rather than Choco's framing. Momentum is strong and the pilot site, timing, and internal urgency all align; the immediate priority is the Thursday/Friday technical session with Andrea followed by getting Marcus into a scoping call with pre-distributed success criteria before any procurement thread opens.",
    "suggested_questions": {
      "sc_intro": [
        "Lee Trevaskis needs to be onboard from the start -- what does he need to see first?",
        "Marcus shaped the success criteria himself -- what metrics matter most to him personally?",
        "Is there anyone else at OEP level who will review the August portfolio submission?"
      ],
      "discovery": [
        "Who owns supplier contracts at Group level, Kitwave or OEP, and what are typical cycle times?",
        "Does OEP set vendor insurance minimums or does Kitwave procurement define those independently?",
        "Is there a standard data processing agreement template we sign, or do you require bespoke terms?",
        "What does the formal vendor onboarding checklist look like before a contract can be executed?",
        "If Marcus shapes success criteria, what return threshold makes this defensible at the portfolio review?"
      ],
      "technical": [
        "When REKKI failed on Swords integration, was that an API gap or a Sanderson licensing issue?",
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?"
      ]
    },
    "answered_questions": {
      "sc_intro": [
        "Should we focus today on summer readiness at Exeter or the broader ten-site picture?"
      ],
      "discovery": [
        "Has finance put any sterling figure on the credit notes from the MJ Baker price-file conflicts?",
        "When Marcus evaluates a proposal, does OEP set the return hurdles or does he?",
        "If this works at Exeter before July, who inside Kitwave would that proof point need to convince?"
      ],
      "technical": [
        "Across your ten sites, is Sanderson Swords fully live everywhere or are some depots still mid-migration?",
        "What does Andrea typically require from a vendor before she approves anything touching the Swords estate?"
      ]
    }
  },
  "delta": {
    "metrics": {
      "prev": 1,
      "curr": 1,
      "change": 0
    },
    "economic_buyer": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "decision_criteria": {
      "prev": 1,
      "curr": 2,
      "change": 1
    },
    "decision_process": {
      "prev": 1,
      "curr": 1,
      "change": 0
    },
    "paper_process": {
      "prev": 0,
      "curr": 0,
      "change": 0
    },
    "identify_pain": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "champion": {
      "prev": 2,
      "curr": 2,
      "change": 0
    },
    "competition": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "overall_prev": 12,
    "overall_curr": 15,
    "overall_change": 3
  },
  "risks": [
    {
      "key": "no-paper-process-visibility",
      "risk": "There is no visibility into the formal procurement, legal, or vendor onboarding process, meaning a contract could stall in an unknown review layer after Marcus approves, potentially blowing the July/August portfolio review window.",
      "evidence": "Not mentioned in the transcript. Neither Gemma nor Andrea referenced a procurement function, standard contract terms, data processing agreement requirements, insurance minimums, or typical cycle times for vendor onboarding at Group or OEP level.",
      "severity": "high",
      "suggested_action": "Before or during the Marcus setup call, ask Gemma directly: 'Assuming Marcus gives the green light after the August review, who picks up the contract from there - is there a Group procurement or legal function, and what does their typical cycle look like? We want to make sure the commercials aren't the long pole.'"
    },
    {
      "key": "oep-as-hidden-decision-layer",
      "risk": "OEP, the private equity owner, functions as an opaque approval layer above Marcus that Choco has no direct access to, and if they apply their own evaluation criteria or vendor diligence requirements beyond the margin number, the deal could be blocked or delayed without warning.",
      "evidence": "\"The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August.\" Combined with Andrea: \"the new owners' diligence people also crawl over our supplier list now.\"",
      "severity": "high",
      "suggested_action": "In the Marcus setup call, ask explicitly: 'When a new vendor relationship of this size goes into the OEP portfolio review, what does that submission look like - do they have their own diligence checklist or approval criteria we should be building toward, and is there anything beyond the margin story we need to address for them directly?'"
    },
    {
      "key": "pilot-timing-against-peak",
      "risk": "The proposed mid-June go-live at the South West DC coincides with the summer peak, meaning a rough launch - caused by integration delays, catalogue issues, or team adoption friction - could damage operational performance at the worst possible moment and kill internal confidence before the August review.",
      "evidence": "\"Peak starts mid-July. Lee Trevaskis runs that site, he'd need to be in from the start, and he'll say exactly that.\" And: \"If we went live mid-June we'd have four weeks of results by mid-July, which is ahead of the August review. Tight but real.\"",
      "severity": "medium",
      "suggested_action": "In the technical session with Andrea this week, validate the integration build timeline with enough buffer to confirm a mid-June go-live is genuinely achievable; if it is not, surface this to Gemma and Marcus before the setup call so the sequencing can be adjusted rather than discovered under pressure in July."
    },
    {
      "key": "rekki-failure-legacy-scepticism",
      "risk": "The failed REKKI deployment has created a category-level credibility problem inside the organisation - particularly with stakeholders not on this call - meaning internal cynicism could undermine Gemma's ability to champion the pilot even if Marcus and Andrea are bought in.",
      "evidence": "\"What about the REKKI attempt at High Wycombe? I wasn't close to it, but the residue of it is that people here think this category doesn't work.\"",
      "severity": "medium",
      "suggested_action": "Prepare a concise, written 'REKKI vs Choco' comparison - focused specifically on phone/voicemail capture and native Swords integration - and ask Gemma to share it with Lee Trevaskis and any site managers who lived through the REKKI experience before the pilot scoping call, so objections surface in conversation rather than as silent resistance during go-live."
    },
    {
      "key": "champion-authority-gap",
      "risk": "Gemma is the primary champion but owns operations, not budget or IT, meaning she is dependent on both Marcus (commercial sign-off) and Andrea (technical gate) to advance every stage, and has not yet explicitly recommended Choco to Marcus as her preferred solution.",
      "evidence": "Not mentioned in the transcript. Gemma's framing throughout is facilitative ('I'll get Marcus', 'he'll want to have shaped the success criteria himself') rather than that of a sponsor who has already positioned Choco as her recommendation. Budget ownership and procurement authority remain unconfirmed.",
      "suggested_action": "Before the Marcus setup call, coach Gemma in a brief pre-call: ask her directly whether she plans to walk into that meeting as a recommender of Choco or as a presenter of an option, and if the latter, work with her on the framing - specifically tying the credit-note and overtime numbers she personally sourced to a Choco-specific recommendation she can own.",
      "severity": "medium"
    }
  ],
  "email": "Subject: South West pilot -- next steps and materials for Andrea\n\nGemma, the credit number landing at £2.8M was the moment that sharpened everything, and the mid-June to mid-July window before the August portfolio review is exactly the kind of proof Marcus can defend in that room rather than just present to it.\n\nAndrea, attached are the Cyber Essentials Plus certificate, pen test summary, and data flow diagram -- documents, not assurances, as agreed. The integration build sits with our team; the ask on your side stays at a few hours of access, not a workstream.\n\nThree things to lock in now: Andrea, please send times for Thursday or Friday for the technical session so integration and security are settled before procurement opens. Gemma, I'll circulate a draft scope and success criteria for the South West site before the call with Marcus, so he's editing against his own numbers rather than ours. Lee Trevaskis should be in that call from the start.\n\nWill Terry\nSolutions Consultant, Choco",
  "actions": [
    {
      "action": "Send data flow diagram to Andrea as a document (not assurance)",
      "owner": "SC",
      "suggested_reminder_date": "2026-05-29"
    },
    {
      "action": "Send Cyber Essentials Plus certificate to Andrea this week",
      "owner": "SC",
      "suggested_reminder_date": "2026-05-29"
    },
    {
      "action": "Send recent pen test summary to Andrea this week",
      "owner": "SC",
      "suggested_reminder_date": "2026-05-29"
    },
    {
      "action": "Send available times for technical session on Thursday or Friday",
      "owner": "SC",
      "suggested_reminder_date": "2026-05-28"
    },
    {
      "action": "Draft proposed pilot scope and success criteria for South West site",
      "owner": "SC",
      "suggested_reminder_date": "2026-05-29"
    },
    {
      "action": "Send drafted scope and criteria ahead of setup call with Marcus",
      "owner": "SC",
      "suggested_reminder_date": "2026-06-01"
    },
    {
      "action": "Review security documents (data flow diagram, CE+ cert, pen test summary)",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-01"
    },
    {
      "action": "Confirm Thursday or Friday availability for technical session",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-05-28"
    },
    {
      "action": "Get Marcus engaged and confirmed for setup call to shape success criteria",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-01"
    },
    {
      "action": "Include Lee Trevaskis in setup call for South West DC pilot",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-01"
    },
    {
      "action": "Conduct short technical session to settle integration and security",
      "owner": "Joint",
      "suggested_reminder_date": "2026-05-30"
    },
    {
      "action": "Hold setup call with Marcus and Lee to lock pilot scope and success criteria",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-05"
    },
    {
      "action": "Target mid-June go-live for South West DC pilot to generate results by mid-July",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-15"
    }
  ],
  "stakeholders": [
    {
      "name": "Gemma Hartley",
      "role": "Head of Sales Office Operations, Kitwave Foodservice"
    },
    {
      "name": "Andrea Kowalczyk",
      "role": "Group IT Director, Kitwave Group"
    },
    {
      "name": "Marcus",
      "role": null
    },
    {
      "name": "Fiona",
      "role": "finance business partner"
    },
    {
      "name": "Lee Trevaskis",
      "role": null
    }
  ],
  "completedTasks": [],
  "callDate": "2026-05-27"
}

export interface CachedPovFixture {
  meddpicc: MeddpiccScore
  criteria: SuccessCriterion[] | null
  totalAgreed: number | null
  delta: MeddpiccDelta | null
  povAssessment: PovAssessment[]
  risks: RiskItem[]
  email: string
  actions: NextAction[]
  stakeholders: ExtractedStakeholder[]
  completedTasks: CachedCompletedTask[]
  callDate: string
}

export const KITWAVE_POV_1: CachedPovFixture = {
  "meddpicc": {
    "metrics": {
      "score": 1,
      "evidence": "Sixty-eight percent of those arrive through a channel someone has to key by hand... Call it seven thousand eight hundred orders a week being keyed into Swords manually. / Six minutes on average... Voicemails run longer. / roughly forty-seven thousand minutes a week, call it seven hundred and eighty hours, across the division. / forty-six people across the ten sales offices, which fully loaded is about one point six million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin.",
      "gap": "The annualised error-leakage extrapolation to division level (criterion five) has not yet been built - confirm the methodology one-pager will be ready before the two-week checkpoint on 30 June, not just at final review."
    },
    "economic_buyer": {
      "score": 3,
      "evidence": "The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin, alongside delivering the synergy case on the acquisitions. His words to me were that Foodservice is why the group's margin story works... Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August. / And I'll get Marcus. If this is going into his review cycle, he'll want to have shaped the success criteria himself. / I'll be at both, and that's not me being polite, if this is going in front of OEP in August I need to have seen it move myself, not read a summary. On process from here, so it's said in the room... if the evidence holds I take it to the August portfolio review with a recommendation to roll out across the division's ten sites.",
      "gap": "OEP's internal approval threshold is unknown - confirm whether Marcus's recommendation alone is sufficient or whether OEP requires a formal investment committee sign-off above a certain contract value."
    },
    "decision_criteria": {
      "score": 3,
      "evidence": "My bar, first, a genuine two-way integration, live pricing, live stock, live order history, not a batch file at midnight. Second, I want a data flow diagram showing exactly what leaves our environment, where it's processed and where it rests, GDPR is table stakes but... I'll want Cyber Essentials Plus evidenced and a recent pen test summary. Third, and this is the one that kills most vendors, I have no integration capacity to give you. If this needs six months of my people, it's dead on arrival. / Walking into the August portfolio review with results from the peak is a different conversation from results from a quiet April.",
      "gap": "Pricing and commercial criteria for the full division rollout have not been discussed - understand whether cost-per-site, per-order, or an enterprise licence model is expected, and whether OEP has a benchmark or ceiling in mind."
    },
    "decision_process": {
      "score": 2,
      "evidence": "Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August. / Then the sequencing is, Andrea, a short technical session this week so integration and security are settled before anyone says the word contract, then a setup call with Marcus in the room to lock scope and success criteria, with Lee there too. / If we went live mid-June we'd have four weeks of results by mid-July, which is ahead of the August review. / legal reviews the master agreement only once the pilot reports, and if the evidence holds I take it to the August portfolio review with a recommendation to roll out across the division's ten sites. And I'll say this now, Christmas is Creed's biggest trading window, if we proceed I want the Creed sites live before that peak, so nobody get comfortable in September.",
      "gap": "The identities and influence of other OEP portfolio review participants are unknown - establish who else presents at that review and whether any stakeholder outside this call could raise an objection or request a competing evaluation."
    },
    "paper_process": {
      "score": 0,
      "evidence": "I'd rather find the problems now than in a procurement thread in August. / The DPA is with our procurement now to run in parallel, on my insistence, I'm not having security paperwork become the critical path in August. / legal reviews the master agreement only once the pilot reports.",
      "gap": "The full procurement and legal sign-off timeline is still unclear - confirm how long Kitwave's legal review of the master agreement typically takes once triggered, whether there is a procurement committee above a certain contract value, and who owns final signature authority."
    },
    "identify_pain": {
      "score": 3,
      "evidence": "Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / If the six a.m. voicemail queue disappeared, my Exeter team would build you a statue. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Foodservice is why the group's margin story works, we're the higher-margin division, so we're the ones who have to prove the model scales profitably.",
      "gap": "The cost and pain impact at the other nine division sites beyond South West has not been quantified individually - gathering site-level data would strengthen the division-wide extrapolation Marcus needs for the portfolio review."
    },
    "champion": {
      "score": 3,
      "evidence": "I did, and it took some doing across ten sites. / I asked him directly. The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin. / That's the version of brave Marcus tends to like. / And I'll get Marcus. If this is going into his review cycle, he'll want to have shaped the success criteria himself. / If we went live mid-June we'd have four weeks of results by mid-July, which is ahead of the August review. Tight but real. / I'll be at both, and that's not me being polite, if this is going in front of OEP in August I need to have seen it move myself.",
      "gap": "Gemma's influence and ability to champion across the other nine sites post-pilot is untested - confirm whether she has direct relationships with the sales office leads at those sites or whether site-level GMs like Lee will need individual engagement plans."
    },
    "competition": {
      "score": 3,
      "evidence": "What about the REKKI attempt at High Wycombe? I wasn't close to it, but the residue of it is that people here think this category doesn't work. / REKKI reads email and app-style orders reasonably well. It does nothing for phone and voicemail, which for you is roughly half of everything, and it had no path into Swords, so even what it did capture got re-keyed, which means it added a step instead of removing one. / That framing will land better with the group exec than 'your portal failed', for what it's worth. / my sales office has heard the word pilot before, REKKI's ghost still walks at High Wycombe.",
      "gap": "It is unknown whether OEP or any other Kitwave division is currently evaluating alternative vendors for a comparable capability - confirm at the two-week checkpoint whether any parallel RFP or informal market scan is underway at group level."
    },
    "overall_score": 18,
    "summary": "This is a high-conviction deal in controlled execution: the Economic Buyer is personally present and committed to the August portfolio review, seven quantified success criteria are signed off in the room, and the champion has already navigated the internal landscape to get Choco to POV stage. The primary remaining risk is paper process - legal review of the master agreement has not been scoped for duration or approval authority, and a slow procurement thread post-pilot could compress the window between August approval and the Christmas deadline Marcus has already set for the Creed sites.",
    "suggested_questions": {
      "sc_intro": [
        "Did the sales office team hear about the pilot outcome, and what was their reaction?",
        "Marcus said he needed to see it move himself -- what specifically shifted his view?",
        "Is OEP sending anyone to the August portfolio review, or is Marcus presenting solo?"
      ],
      "discovery": [
        "Who owns final signature authority on the master agreement at Kitwave Group level?",
        "Is there a procurement committee approval required above a certain contract value threshold?",
        "How long does Kitwave legal typically take to review a master agreement once triggered?",
        "Who owns supplier contracts at Group level, Kitwave or OEP, and what are typical cycle times?",
        "Does OEP set vendor insurance minimums or does Kitwave procurement define those independently?",
        "What return threshold makes the division rollout defensible at the August portfolio review?"
      ],
      "technical": [
        "When REKKI failed on Swords integration, was that an API gap or a Sanderson licensing issue?",
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?"
      ]
    },
    "answered_questions": {
      "sc_intro": [
        "Lee Trevaskis needs to be onboard from the start -- what does he need to see first?",
        "Marcus shaped the success criteria himself -- what metrics matter most to him personally?"
      ],
      "discovery": [
        "Is there a standard data processing agreement template we sign, or do you require bespoke terms?",
        "If Marcus shapes success criteria, what return threshold makes this defensible at the portfolio review?"
      ],
      "technical": []
    }
  },
  "criteria": [
    {
      "id": 1,
      "description": "Order capture accuracy of 95% or better on AI-processed orders by end of pilot, measured against the sales team's own corrections."
    },
    {
      "id": 2,
      "description": "Average manual handling time reduced by at least half against the six-minute baseline, to three minutes or better."
    },
    {
      "id": 3,
      "description": "Zero pricing errors reaching a customer from AI-processed orders - errors flagged and caught in review do not count against this, only what ships."
    },
    {
      "id": 4,
      "description": "No increase in customer complaints attributable to the new flow AND no drop in order cutoff compliance (orders arriving before cutoff making next-day delivery), measured weekly."
    },
    {
      "id": 5,
      "description": "Zero unplanned downtime and zero data integrity incidents against the Swords integration for the duration of the pilot."
    }
  ],
  "totalAgreed": 7,
  "delta": {
    "metrics": {
      "prev": 1,
      "curr": 1,
      "change": 0
    },
    "economic_buyer": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_criteria": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "decision_process": {
      "prev": 1,
      "curr": 2,
      "change": 1
    },
    "paper_process": {
      "prev": 0,
      "curr": 0,
      "change": 0
    },
    "identify_pain": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "champion": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "competition": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "overall_prev": 15,
    "overall_curr": 18,
    "overall_change": 3
  },
  "povAssessment": [
    {
      "criterion_id": 1,
      "status": "in_progress",
      "evidence": "order capture accuracy of ninety-five percent or better on AI-processed orders by end of pilot, measured against your own team's corrections",
      "notes": "Criterion formally agreed in the room but pilot has not yet started. No performance data exists; measurement framework is established, outcome pending."
    },
    {
      "criterion_id": 2,
      "status": "in_progress",
      "evidence": "average manual handling time down at least half against the six-minute baseline, so three minutes or better",
      "notes": "Criterion agreed and baseline confirmed at six minutes. No reduction data yet as pilot has not commenced."
    },
    {
      "criterion_id": 3,
      "status": "in_progress",
      "evidence": "zero pricing errors reaching a customer from AI-processed orders. Flagged and caught in review doesn't count against it, only what ships",
      "notes": "Criterion agreed and scoping protections are in place (review-first mode before autopilot). No orders have shipped under the new flow yet; outcome pending."
    },
    {
      "criterion_id": 4,
      "status": "in_progress",
      "evidence": "criterion four becomes no increase in complaints and no drop in order cutoff compliance, measured weekly",
      "notes": "Criterion strengthened at Lee's request to include cutoff compliance alongside complaints. Measurement cadence agreed as weekly. Pilot not yet live; no data collected."
    },
    {
      "criterion_id": 5,
      "status": "in_progress",
      "evidence": "zero unplanned downtime and zero data integrity incidents against Swords for the duration. A silently broken sync during their peak is my nightmare scenario, so it gets measured, not assumed",
      "notes": "Criterion formally added by Andrea and accepted. Integration is scoped to South West DC only, rollback plan required before go-live, and data flow diagram to be counter-signed by Friday. Infrastructure safeguards are being put in place but pilot has not started."
    }
  ],
  "risks": [
    {
      "key": "no-paper-process-visibility",
      "risk": "The full procurement and legal sign-off timeline remains opaque - if Kitwave's legal review of the master agreement or a procurement committee above a certain contract value introduces unexpected cycle time, the deal could miss the August portfolio review window entirely.",
      "evidence": "\"legal reviews the master agreement only once the pilot reports\" - the trigger is clear but the duration, ownership, and any procurement committee thresholds above a certain contract value were never discussed, leaving a potential silent stall between Marcus's recommendation and a signed contract.",
      "severity": "high",
      "suggested_action": "Before the two-week checkpoint on 30 June, ask Andrea or Gemma directly: how long has Kitwave's legal review of a comparable SaaS agreement taken historically, is there a procurement committee or CFO sign-off threshold above a certain contract value, and who holds final signature authority - then map those steps against the August portfolio review date to confirm the timeline is viable."
    },
    {
      "key": "oep-as-hidden-decision-layer",
      "risk": "OEP, the private equity owner, is a decision layer Choco has no direct access to, and if OEP applies its own vendor diligence criteria, requires a formal investment committee vote, or has a contract-value threshold above which it controls approval, Marcus's recommendation alone may be insufficient to close.",
      "evidence": "\"if this is going in front of OEP in August I need to have seen it move myself, not read a summary\" and \"the new owners are completely unsentimental\" - Marcus signals OEP scrutiny is intense but neither he nor anyone else confirmed whether his recommendation is self-sufficient or whether OEP requires a parallel diligence or sign-off process.",
      "severity": "high",
      "suggested_action": "At the two-week checkpoint with Marcus, ask explicitly: 'When you take this to the August portfolio review with a recommendation to roll out, is that decision yours to make, or does OEP require a separate investment committee vote or vendor approval process above a certain contract value?' - then assess whether Choco needs to prepare any additional diligence materials aimed directly at OEP."
    },
    {
      "key": "pilot-timing-against-peak",
      "risk": "The pilot goes live on 15 June and must produce clean, defensible results by 13 July - but the South West DC's order volume rises 40% from mid-July, meaning any operational wobble in weeks three or four lands directly inside Lee's peak fortnight, threatening both site confidence and the quality of evidence Marcus needs for August.",
      "evidence": "\"We go live Monday the fifteenth, the school holidays start mid-July, and by the last week of July my order volume is up forty percent on May. If this thing wobbles in week five I'm firefighting in my worst fortnight.\"",
      "severity": "medium",
      "suggested_action": "Lock the Thursday catalogue-mapping session with Lee and the integration lead this week, confirm the Swords ERP sync is stable before the weekend, and establish a daily automated exception report for Lee in week one so any accuracy or cutoff-compliance issue is visible within hours rather than discovered during the peak ramp."
    },
    {
      "key": "rekki-failure-legacy-scepticism",
      "risk": "The failed REKKI deployment has left a category-level credibility problem across the organisation - particularly at sites not represented on this call - that could resurface when Gemma or Marcus tries to build internal momentum for a division-wide rollout across the other nine sites after a successful pilot.",
      "evidence": "\"my sales office has heard the word pilot before, REKKI's ghost still walks at High Wycombe\" and \"the residue of it is that people here think this category doesn't work\" - Lee names the failure explicitly and attributes lasting scepticism to it across the business.",
      "severity": "medium",
      "suggested_action": "Ask Lee and Gemma to identify the two or three most vocal sceptics in the South West sales office and deliberately include them in week-one order review sessions so they become informed witnesses to early wins rather than uninformed critics - and build a one-page 'what is different from REKKI' narrative to send to site GMs at the other nine locations before the final review."
    },
    {
      "key": "champion-authority-gap",
      "risk": "Gemma is the operational champion but has no visible budget ownership, procurement authority, or explicit mandate to drive adoption across the other nine division sites - making the path from a successful South West pilot to a signed division-wide rollout dependent on Marcus and Andrea staying actively engaged through a process Gemma cannot control.",
      "evidence": "Not mentioned in the transcript. Gemma spoke twice during the call and only on logistics; she did not assert a commercial recommendation, confirm budget ownership, or indicate she has standing relationships with the sales office leads at the other nine sites - her role remains facilitative rather than that of a sponsor who can independently drive the next stage.",
      "severity": "medium",
      "suggested_action": "In a one-to-one with Gemma before the 30 June checkpoint, explicitly ask whether she has direct relationships with the sales office leads at the other nine sites, confirm what authority she holds over the division rollout decision, and agree on a specific action she will own - such as briefing two or three site GMs on pilot progress - so her champion role becomes active and visible before August."
    }
  ],
  "email": "Subject: Kitwave South West pilot -- confirmation and next steps before Monday\n\nThe scope and success criteria are locked as agreed in the room. OrderAgent goes live Monday 15 June across the independent hospitality book at the South West DC -- phone, voicemail, email, WhatsApp and photo capture, two-way into Swords, review-first throughout week one. The seven criteria are confirmed: 95% capture accuracy, handling time to three minutes or better, zero pricing errors shipping, no increase in complaints and no drop in cutoff compliance measured weekly, a methodology-documented error leakage extrapolation, sales office sign-off, and zero downtime or data integrity incidents against Swords.\n\nBefore Monday there are three things to land. I will have the counter-signed data flow diagram back to Andrea by Friday. Our integration lead is with Lee for a half day Thursday to work through the current price file -- current file only, not the archaeology. The documented rollback plan goes to Andrea alongside the diagram.\n\nTwo-week checkpoint is 30 June, final review 14 July. Marcus, the extrapolation one-pager -- inclusions, exclusions, assumptions explicit -- will be ready for both. Let's get the statue built.\n\nWill Terry\nSolutions Consultant, Choco",
  "actions": [
    {
      "action": "Deliver counter-signed data flow diagram to Andrea by Friday",
      "owner": "SC",
      "suggested_reminder_date": "2026-06-11"
    },
    {
      "action": "Provide documented rollback plan to Andrea before go-live",
      "owner": "SC",
      "suggested_reminder_date": "2026-06-12"
    },
    {
      "action": "Run DPA review in parallel with pilot; do not block go-live",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-12"
    },
    {
      "action": "Assign integration lead for half-day catalogue mapping session Thursday",
      "owner": "SC",
      "suggested_reminder_date": "2026-06-11"
    },
    {
      "action": "Lee to join integration lead for catalogue mapping session Thursday",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-11"
    },
    {
      "action": "Go live with OrderAgent at South West DC on Monday 15 June",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-13"
    },
    {
      "action": "Operate in review-first mode during week one; team checks all AI orders",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-15"
    },
    {
      "action": "Hold two-week checkpoint review around 30 June",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-27"
    },
    {
      "action": "Hold final four-week pilot review on 14 July",
      "owner": "Joint",
      "suggested_reminder_date": "2026-07-11"
    },
    {
      "action": "Deliver quantified annualised error-leakage extrapolation with written method one-pager",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-11"
    },
    {
      "action": "Measure weekly order cutoff compliance throughout pilot duration",
      "owner": "Joint",
      "suggested_reminder_date": "2026-06-15"
    },
    {
      "action": "Marcus to attend both checkpoint and final review meetings personally",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-06-27"
    },
    {
      "action": "Legal to review master agreement only after pilot results are available",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-14"
    },
    {
      "action": "Marcus to present pilot results to August OEP portfolio review",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-28"
    },
    {
      "action": "Plan division-wide rollout across ten sites if August review is positive",
      "owner": "Joint",
      "suggested_reminder_date": "2026-08-17"
    },
    {
      "action": "Target Creed sites live before Christmas peak if rollout proceeds",
      "owner": "Joint",
      "suggested_reminder_date": "2026-09-01"
    }
  ],
  "stakeholders": [
    {
      "name": "Marcus Threlfall",
      "role": "Managing Director, Kitwave Foodservice"
    },
    {
      "name": "Gemma Hartley",
      "role": "Head of Sales Office Operations, Kitwave Foodservice"
    },
    {
      "name": "Andrea Kowalczyk",
      "role": "Group IT Director, Kitwave Group"
    },
    {
      "name": "Lee Trevaskis",
      "role": "General Manager, South West Distribution Centre, Kitwave Foodservice"
    }
  ],
  "completedTasks": [
    {
      "description": "Send data flow diagram to Andrea as a document (not assurance)",
      "evidence": "the data flow is clear, order content processed in-region, nothing resting anywhere that worries me."
    },
    {
      "description": "Send Cyber Essentials Plus certificate to Andrea this week",
      "evidence": "The Cyber Essentials Plus certificate is current"
    },
    {
      "description": "Send recent pen test summary to Andrea this week",
      "evidence": "the pen test summary was recent and more candid than most, which I appreciated"
    },
    {
      "description": "Review security documents (data flow diagram, CE+ cert, pen test summary)",
      "evidence": "I've been through all of it. The Cyber Essentials Plus certificate is current, the pen test summary was recent and more candid than most, which I appreciated, and the data flow is clear, order content processed in-region, nothing resting anywhere that worries me."
    },
    {
      "description": "Get Marcus engaged and confirmed for setup call to shape success criteria",
      "evidence": "Marcus Threlfall, Managing Director, Kitwave Foodservice"
    },
    {
      "description": "Include Lee Trevaskis in setup call for South West DC pilot",
      "evidence": "Lee Trevaskis, General Manager, South West Distribution Centre, Kitwave Foodservice"
    },
    {
      "description": "Hold setup call with Marcus and Lee to lock pilot scope and success criteria",
      "evidence": "Marcus, I want these agreed in this room so August isn't a debate about what we measured."
    },
    {
      "description": "Target mid-June go-live for South West DC pilot to generate results by mid-July",
      "evidence": "On cadence, four weeks from Monday the fifteenth puts final review the fourteenth of July."
    }
  ],
  "callDate": "2026-06-09"
}

export const KITWAVE_POV_2: CachedPovFixture = {
  "meddpicc": {
    "metrics": {
      "score": 2,
      "evidence": "Conservatively stated, about one point two million a year in prevented leakage at division level, methodology one-pager to follow with inclusions and exclusions. / We're at three point four minutes average, so a forty-three percent reduction against a fifty percent target. / Week two cutoff compliance on the pilot book ran one point eight points higher than the four-week average before go-live.",
      "gap": "Methodology one-pager is promised but not yet delivered - confirm it lands with Marcus by 7 July and that OEP will accept the conservative discounting approach before the August portfolio review."
    },
    "economic_buyer": {
      "score": 3,
      "evidence": "The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin, alongside delivering the synergy case on the acquisitions. His words to me were that Foodservice is why the group's margin story works... Anything material goes through the monthly portfolio review with OEP, the next ones that matter for us are July and August. / if the evidence holds I take it to the August portfolio review with a recommendation to roll out across the division's ten sites.",
      "gap": "Marcus is present and engaged, but confirm whether OEP has any new questions or shifting priorities ahead of the August review that could affect the recommendation framing."
    },
    "decision_criteria": {
      "score": 3,
      "evidence": "My bar, first, a genuine two-way integration, live pricing, live stock, live order history, not a batch file at midnight. Second, I want a data flow diagram showing exactly what leaves our environment, where it's processed and where it rests, GDPR is table stakes but... I'll want Cyber Essentials Plus evidenced and a recent pen test summary. Third, and this is the one that kills most vendors, I have no integration capacity to give you. If this needs six months of my people, it's dead on arrival.",
      "gap": "Pilot results are being mapped to success criteria - confirm that the final report explicitly scores each criterion against Marcus's original bar so there is no ambiguity at the OEP review."
    },
    "decision_process": {
      "score": 3,
      "evidence": "Agreed, no extension, the whole point of the timing was results before the school holidays bite. Two things for the final review. The methodology one-pager comes to me a week before, not on the day. And Will, have the duplicate-code fix verified with a written confirmation of zero recurrence. / if the evidence holds I take it to the August portfolio review with a recommendation to roll out across the division's ten sites. And I'll say this now, Christmas is Creed's biggest trading window, if we proceed I want the Creed sites live before that peak.",
      "gap": "Legal has not yet reviewed the master agreement - confirm the DPA parallel-track is still on schedule and that legal review timing will not compress the window between the 14 July pilot report and the August OEP review."
    },
    "paper_process": {
      "score": 1,
      "evidence": "I'd rather find the problems now than in a procurement thread in August. / The DPA is with our procurement now to run in parallel, on my insistence, I'm not having security paperwork become the critical path in August. / legal reviews the master agreement only once the pilot reports.",
      "gap": "No update on DPA or procurement status in this call. Confirm the DPA has progressed, identify who in legal signs off the master agreement, and establish whether any commercial redlines are anticipated that could delay execution after the August portfolio review."
    },
    "identify_pain": {
      "score": 3,
      "evidence": "Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / If the six a.m. voicemail queue disappeared, my Exeter team would build you a statue. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Foodservice is why the group's margin story works, we're the higher-margin division, so we're the ones who have to prove the model scales profitably.",
      "gap": "Pain is well established and now corroborated by live pilot data. No gaps remain - reinforce the linkage between pilot leakage numbers and the two-point-eight million baseline in the final report narrative."
    },
    "champion": {
      "score": 3,
      "evidence": "That honesty survives a portfolio review better than a clean sheet I don't believe. / And I'll get Marcus. If this is going into his review cycle, he'll want to have shaped the success criteria himself. / I'll be at both, and that's not me being polite, if this is going in front of OEP in August I need to have seen it move myself, not read a summary.",
      "gap": "Gemma is emerging as a strong internal advocate alongside Gemma's role - confirm she will actively support the OEP presentation narrative and that Dawn's grassroots adoption story can be referenced as qualitative evidence in the final pack."
    },
    "competition": {
      "score": 3,
      "evidence": "What about the REKKI attempt at High Wycombe? I wasn't close to it, but the residue of it is that people here think this category doesn't work. / REKKI reads email and app-style orders reasonably well. It does nothing for phone and voicemail, which for you is roughly half of everything, and it had no path into Swords, so even what it did capture got re-keyed, which means it added a step instead of removing one. / my sales office has heard the word pilot before, REKKI's ghost still walks at High Wycombe.",
      "gap": "No competitor re-emerged in this call. Confirm whether any other vendors are being evaluated at group or OEP level ahead of the August review, particularly given the portfolio-wide rollout decision that follows."
    },
    "overall_score": 21,
    "summary": "This deal is in strong shape heading into the final pilot review: economic buyer, decision criteria, decision process, identify pain, champion, and competition are all fully evidenced, metrics are now substantially quantified from the two-week measured results, and live pilot data is directionally validating the original pain and metrics case. The one live risk is the duplicate-code open item, which must be closed with written verification before 14 July - Marcus has explicitly flagged that OEP finding it unfixed would be a credibility problem, so this is the single critical path action. Paper process remains the one element still lagging, due to continued silence on DPA and legal progress; confirming those are tracking is the priority ask before the methodology one-pager lands on 7 July.",
    "suggested_questions": {
      "sc_intro": [
        "Did the sales office team hear about the pilot outcome, and what was their reaction?",
        "Marcus said he needed to see it move himself -- what specifically shifted his view?",
        "Is OEP sending anyone to the August portfolio review, or is Marcus presenting solo?",
        "Has Dawn's self-appointed ownership of the exception queue changed how Gemma is framing the rollout internally?"
      ],
      "discovery": [
        "Who owns final signature authority on the master agreement at Kitwave Group level?",
        "Is there a procurement committee approval required above a certain contract value threshold?",
        "How long does Kitwave legal typically take to review a master agreement once triggered?",
        "Who owns supplier contracts at Group level, Kitwave or OEP, and what are typical cycle times?",
        "Does OEP set vendor insurance minimums or does Kitwave procurement define those independently?",
        "What return threshold makes the division rollout defensible at the August portfolio review?",
        "Has the DPA progressed since pilot kickoff, and who in legal will sign off the master agreement?",
        "Are commercial redlines anticipated on the master agreement that could delay execution post-August review?",
        "Does the education and care book have a separate procurement owner who needs to be engaged?"
      ],
      "technical": [
        "When REKKI failed on Swords integration, was that an API gap or a Sanderson licensing issue?",
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?",
        "Can the mapping table fix be validated against all deprecated codes before the July fourteenth review?",
        "Which teams own the deduplication work at source, and what is their completion commitment date?"
      ]
    },
    "answered_questions": {
      "sc_intro": [],
      "discovery": [],
      "technical": [
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?"
      ]
    }
  },
  "criteria": null,
  "totalAgreed": null,
  "delta": {
    "metrics": {
      "prev": 1,
      "curr": 2,
      "change": 1
    },
    "economic_buyer": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_criteria": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_process": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "paper_process": {
      "prev": 0,
      "curr": 1,
      "change": 1
    },
    "identify_pain": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "champion": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "competition": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "overall_prev": 18,
    "overall_curr": 21,
    "overall_change": 3
  },
  "povAssessment": [
    {
      "criterion_id": 1,
      "status": "in_progress",
      "evidence": "We're at ninety-two point eight percent on AI-processed orders across the two weeks. Target is ninety-five. Not there yet, but the shape is right, week one averaged just under ninety, week two is running ninety-three and a half and still climbing",
      "notes": "Currently at 92.8% against a 95% target. Positive trend observed week-over-week (week 1 ~90%, week 2 ~93.5%) but threshold not yet reached. Mechanical path to target described as Autopilot share increasing."
    },
    {
      "criterion_id": 2,
      "status": "in_progress",
      "evidence": "We're at three point four minutes average, so a forty-three percent reduction against a fifty percent target... And as that share climbs, the average falls, that's the mechanical path to target by week four.",
      "notes": "Currently at 3.4 minutes against a 3-minute target - close but not yet met. The average is pulled up by the review queue; as Autopilot share grows (currently 35%), the average is expected to reach target by week four."
    },
    {
      "criterion_id": 3,
      "status": "met",
      "evidence": "Zero shipped. But I owe you the detail behind that, because it's not zero flagged, and one pattern matters... Review caught all three, nothing shipped",
      "notes": "Criterion is technically met as stated - zero pricing errors reached a customer. However, a systemic risk (duplicate legacy product codes from catalogue merge) was identified and flagged. A fix is in flight. Will explicitly noted the pattern is a risk at Autopilot scale, so confidence in sustained compliance is conditional on that fix shipping."
    },
    {
      "criterion_id": 4,
      "status": "met",
      "evidence": "Complaints, none attributable to the new flow. Cutoff compliance is up, not held, up... Week two cutoff compliance on the pilot book ran one point eight points higher than the four-week average before go-live.",
      "notes": "Both sub-components of this criterion are met: zero new customer complaints attributable to the new flow, and cutoff compliance has improved rather than declined. Qualitative supporting evidence also provided by Lee and unprompted customer feedback."
    },
    {
      "criterion_id": 5,
      "status": "met",
      "evidence": "Zero unplanned downtime, zero data integrity incidents against Swords across the two weeks. She reviewed the sync logs herself on Friday and passed her sign-off through Gemma... her words were 'so far it's the quietest vendor integration I've ever monitored'",
      "notes": "Both conditions - zero unplanned downtime and zero data integrity incidents - confirmed by Andrea's independent review of sync logs with explicit sign-off passed through Gemma."
    }
  ],
  "risks": [
    {
      "key": "no-paper-process-visibility",
      "risk": "The DPA, master agreement legal review, and any procurement committee thresholds above a certain contract value remain entirely undiscussed, and if that process introduces unexpected cycle time after the 14 July pilot review there is insufficient runway to sign before the August OEP portfolio review.",
      "evidence": "Not mentioned in the transcript. No update on DPA progress, legal sign-off ownership, or procurement committee thresholds was raised by any party across the full 34-minute call.",
      "severity": "high",
      "suggested_action": "Before the 7 July methodology one-pager lands with Marcus, confirm in writing who owns legal sign-off on the master agreement, whether any contract value threshold triggers a procurement committee above Marcus, and whether the DPA parallel-track is still on schedule - so Will can surface any cycle-time risk before the 14 July final review rather than after it."
    },
    {
      "key": "oep-as-hidden-decision-layer",
      "risk": "OEP remains a decision layer Choco has no direct access to, and if OEP applies its own diligence criteria or requires a formal approval process above Marcus's recommendation, a positive pilot report alone may be insufficient to close in August.",
      "evidence": "Not mentioned in the transcript. Marcus referenced the August portfolio review only implicitly through his instruction to have the methodology one-pager \"before the August portfolio review\" and his comment that \"honesty survives a portfolio review better than a clean sheet I don't believe\" - but neither Marcus nor anyone else confirmed whether his recommendation is self-sufficient or whether OEP runs a parallel approval process.",
      "severity": "high",
      "suggested_action": "Ask Marcus directly during the 7 July one-pager delivery conversation whether his recommendation to OEP is sufficient for approval or whether OEP will run its own vendor diligence, and establish whether Choco should prepare any supplementary materials - financial model, security pack, reference contacts - that OEP typically requests independently of the sponsoring MD."
    },
    {
      "key": "champion-authority-gap",
      "risk": "Gemma has no visible budget ownership, procurement authority, or confirmed mandate to drive adoption across the other nine division sites, meaning the path from a successful South West pilot to a signed division-wide rollout depends entirely on Marcus and Andrea remaining actively engaged through a process Gemma cannot control.",
      "evidence": "Not mentioned in the transcript. Gemma participated substantively on team adoption and the duplicate-code issue but did not assert a commercial recommendation, confirm budget ownership, or indicate she has standing relationships with sales office leads at the other nine sites - her role remains facilitative rather than that of a sponsor who can independently drive the next stage.",
      "severity": "medium",
      "suggested_action": "Before the 14 July final review, ask Gemma explicitly whether she has been given a mandate to present the rollout case to the other nine site leads, and if not, secure Marcus's agreement to include a named internal sponsor for the division-wide phase in the final review agenda - so the commercial momentum does not stall the moment Marcus's attention moves to the August OEP preparation."
    },
    {
      "key": "rekki-failure-legacy-scepticism",
      "risk": "The failed REKKI deployment has left lasting category-level scepticism across sites not represented on this call, and that residual distrust could resurface and slow internal momentum when Gemma or Marcus attempts to build the case for a division-wide rollout across the remaining nine sites after a successful South West pilot.",
      "evidence": "Not mentioned in the transcript. Lee named the risk explicitly on a prior call - \"REKKI's ghost still walks at High Wycombe\" and \"the residue of it is that people here think this category doesn't work\" - and nothing in this call contradicts or resolves that structural credibility problem at the other sites.",
      "severity": "medium",
      "suggested_action": "Include Dawn's self-appointed ownership of the exception queue and the two holiday park customers who gave unsolicited positive feedback as named qualitative evidence in the final pack, and ask Marcus whether a brief site-lead briefing - even a 20-minute call - ahead of the OEP review would help pre-empt the REKKI objection before it surfaces during a division-wide rollout conversation."
    },
    {
      "key": "duplicate-code-fix-as-sign-off-gate",
      "risk": "Gemma has explicitly withheld team sign-off until the duplicate legacy-code fix is verified, meaning if the integration team's mapping table slips or delivers incomplete results before 14 July, the final report will carry an open criterion that undermines the clean narrative Marcus needs to defend at the OEP portfolio review.",
      "evidence": "\"Not unanimous yet, and I won't call it sign-off until the duplicate-code thing is fixed, because that's what generates the silly exceptions they still grumble about.\" and Marcus: \"if OEP's people find the one open item themselves it's a credibility problem, if I present it fixed with evidence it's a strength.\"",
      "severity": "medium",
      "suggested_action": "Establish a hard internal deadline of 10 July for the mapping-table deployment and a 48-hour verification window before the final review, and confirm with Will's integration lead and Gemma's master data lead jointly that zero recurrence can be evidenced in writing by 12 July - giving Marcus two days to review before the 14 July session rather than receiving the confirmation on the day."
    }
  ],
  "email": "Subject: Kitwave POV -- Two-Week Checkpoint Summary\n\nThree criteria are already ahead of target. Shipped pricing errors remain at zero, cutoff compliance is running 1.8 points above your pre-pilot baseline (Lee's team clearing the voicemail queue by 7am is the operational reason), and the Swords integration has logged zero downtime or data integrity incidents -- Andrea's words, \"the quietest vendor integration I've ever monitored\", are on the record. Accuracy is at 93.5% and climbing through week two, and handling time is at 3.4 minutes; both are on the standard improvement curve and the mechanical path to target by week four is clear.\n\nThe one open item that matters is the duplicate legacy codes from the MJ Baker and Westcountry catalogue merge. Review caught all three instances before anything shipped, but I flagged it as a fault, not a feature. The mapping table fix ships before the final review, and your master data lead is deduplicating at source. I will provide written confirmation of zero recurrence in the final pack, as Marcus requested.\n\nCommitments before 14 July: methodology one-pager to Marcus by 7 July; fix verification included in the final review pack. Nothing needed from your side beyond what is already in flight.\n\nWill Terry",
  "actions": [
    {
      "action": "Build mapping table resolving deprecated catalogue codes to live product records before pricing applied",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-07"
    },
    {
      "action": "Deduplicate worst-offending legacy product codes at source in master data",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-07"
    },
    {
      "action": "Deliver pricing leakage methodology one-pager to Marcus by 7 July",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-07"
    },
    {
      "action": "Provide written verification of zero recurrence after duplicate-code fix for final pack",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-10"
    },
    {
      "action": "Include duplicate-code issue documented as found-and-fixed in final review report",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-14"
    },
    {
      "action": "Conduct final POV review meeting as scheduled on 14 July",
      "owner": "Joint",
      "suggested_reminder_date": "2026-07-14"
    },
    {
      "action": "Continue adding accounts to Autopilot daily to increase share above 35%",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-07"
    },
    {
      "action": "Obtain team sign-off on criterion six once duplicate-code fix is confirmed",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-10"
    }
  ],
  "stakeholders": [
    {
      "name": "Marcus Threlfall",
      "role": "Managing Director, Kitwave Foodservice"
    },
    {
      "name": "Gemma Hartley",
      "role": "Head of Sales Office Operations, Kitwave Foodservice"
    },
    {
      "name": "Lee Trevaskis",
      "role": "General Manager, South West Distribution Centre, Kitwave Foodservice"
    },
    {
      "name": "Dawn",
      "role": null
    },
    {
      "name": "Andrea",
      "role": null
    }
  ],
  "completedTasks": [
    {
      "description": "Go live with OrderAgent at South West DC on Monday 15 June",
      "evidence": "Week two cutoff compliance on the pilot book ran one point eight points higher than the four-week average before go-live."
    },
    {
      "description": "Operate in review-first mode during week one; team checks all AI orders",
      "evidence": "What's holding the average up is the review queue, which is the point of review-first, so I'm not complaining. We're at about thirty-five percent of pilot volume on Autopilot now, I've been adding accounts most days."
    },
    {
      "description": "Hold two-week checkpoint review around 30 June",
      "evidence": "Marcus, thanks for holding the checkpoint, I know the diary pressure this time of year."
    },
    {
      "description": "Deliver quantified annualised error-leakage extrapolation with written method one-pager",
      "evidence": "Conservatively stated, about one point two million a year in prevented leakage at division level, methodology one-pager to follow with inclusions and exclusions."
    },
    {
      "description": "Measure weekly order cutoff compliance throughout pilot duration",
      "evidence": "Cutoff compliance is up, not held, up. The overnight voicemail queue is being transcribed, priced and queued for review before six a.m., Lee's team confirms the queue that used to take until mid-morning is cleared by seven. Week two cutoff compliance on the pilot book ran one point eight points higher than the four-week average before go-live."
    },
    {
      "description": "Marcus to attend both checkpoint and final review meetings personally",
      "evidence": "Attendees: Marcus Threlfall, Managing Director, Kitwave Foodservice"
    }
  ],
  "callDate": "2026-06-30"
}

export const KITWAVE_POV_3: CachedPovFixture = {
  "meddpicc": {
    "metrics": {
      "score": 3,
      "evidence": "Conservative annualised figure at division level, one point four million a year in prevented leakage. Against your two point eight million total leakage, that's half of it addressed by this lever alone, and on two hundred and forty million of division revenue it's roughly sixty basis points of margin, call it forty percent of the hundred and fifty point target, from one initiative, evidenced on your own data.",
      "gap": "Order size uplift and redeployed sales office hours are deliberately excluded - quantify those for phase 2 business case to further strengthen the margin story."
    },
    "economic_buyer": {
      "score": 3,
      "evidence": "I'm not taking a proposal to August, I'm taking a result and a rollout plan. The evidence is stronger than anything else on my slate for that meeting... Jordan, commercials. I want a division-wide proposal, all ten sites, Creed sequenced first and live before the Christmas catering peak.",
      "gap": "OEP (the private equity owners) will see the August portfolio review pack - confirm whether OEP sign-off is required for a contract of this size or whether Marcus has full authority."
    },
    "decision_criteria": {
      "score": 3,
      "evidence": "That's seven for seven, met or exceeded, with one issue found, fixed and verified in flight rather than discovered later.",
      "gap": "No remaining gaps - all seven criteria met or exceeded; written verification of the duplicate-code fix is already in the pack per Marcus's prior request."
    },
    "decision_process": {
      "score": 3,
      "evidence": "I'm not taking a proposal to August, I'm taking a result and a rollout plan... Jordan, commercials. I want a division-wide proposal, all ten sites, Creed sequenced first and live before the Christmas catering peak. What do you need from us? / Proposal with you by Friday, and if your legal can turn it while the portfolio review lands, contract and rollout can both be moving in August.",
      "gap": "Confirm the exact August portfolio review date so the legal turnaround timeline can be back-planned with precision."
    },
    "paper_process": {
      "score": 1,
      "evidence": "The DPA's in place and carries across sites, so it's the master agreement through your legal and a rollout schedule we'd build with Andrea and Lee. Proposal with you by Friday, and if your legal can turn it while the portfolio review lands, contract and rollout can both be moving in August.",
      "gap": "Identify the named legal contact and confirm whether procurement needs to counter-sign alongside legal, and whether any OEP-level approval threshold applies to the contract value."
    },
    "identify_pain": {
      "score": 3,
      "evidence": "Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Foodservice is why the group's margin story works, we're the higher-margin division, so we're the ones who have to prove the model scales.",
      "gap": "Acquisition integration pain is now surfacing as a compounding driver - quantify the incremental cost per acquired site of onboarding a new sales office without a standardised ordering platform."
    },
    "champion": {
      "score": 3,
      "evidence": "Gemma, you carried this from a cold email to here, so say the last word. / Just that I want the statue clause in the contract. Will knows what it means.",
      "gap": "Gemma's authority is proven but confirm she has a named seat in the August portfolio review presentation or that she is briefing Marcus's pack directly."
    },
    "competition": {
      "score": 3,
      "evidence": "REKKI reads email and app-style orders reasonably well. It does nothing for phone and voicemail, which for you is roughly half of everything, and it had no path into Swords, so even what it did capture got re-keyed, which means it added a step instead of removing one. / my sales office has heard the word pilot before, REKKI's ghost still walks at High Wycombe.",
      "gap": "As rollout expands to nine additional sites, validate whether any site-level managers at Creed, Staverton, Ilkeston or High Wycombe have existing vendor relationships or preferences that could resurface competitive friction."
    },
    "overall_score": 22,
    "summary": "This deal is effectively closed in all but contract signature: seven-for-seven pilot success criteria met, the economic buyer has publicly redirected the August portfolio review from evaluation to rollout approval, and the DPA is already in place across sites. The only remaining execution risk is legal turnaround speed relative to the August review date and Christmas go-live deadline for the Creed sites - the Choco team should lock the exact portfolio review date this week and name a legal counterpart at Kitwave to eliminate any paperwork critical path.",
    "suggested_questions": {
      "sc_intro": [
        "Did the caravan park group follow up about expanding to their Somerset sister sites?",
        "How did Marcus present the Choco result at the August portfolio review?",
        "Has Dawn formally taken ownership of exception queue management post-rollout?",
        "Which site goes live after the Creed sequencing, and who is leading that onboarding?"
      ],
      "discovery": [
        "Who owns final signature authority on the master agreement at Kitwave Group level?",
        "Is there a procurement committee approval required above a certain contract value threshold?",
        "How long does Kitwave legal typically take to review a master agreement once triggered?",
        "Who owns supplier contracts at Group level, Kitwave or OEP, and what are typical cycle times?",
        "Does OEP set vendor insurance minimums or does Kitwave procurement define those independently?",
        "Are commercial redlines anticipated on the master agreement that could delay execution post-August review?",
        "Does the education and care book have a separate procurement owner who needs to be engaged?",
        "Will Fife Creamery be included in the division rollout scope or treated as a separate workstream?",
        "Does the acquisition integration playbook have a formal owner who needs to approve Choco inclusion?"
      ],
      "technical": [
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?",
        "What is the catalogue mapping complexity expected at Staverton, Ilkeston and High Wycombe?",
        "Who leads per-site scoping calls with Andrea, and what is the expected duration per site?"
      ]
    },
    "answered_questions": {
      "sc_intro": [
        "Has Dawn's self-appointed ownership of the exception queue changed how Gemma is framing the rollout internally?"
      ],
      "discovery": [
        "What return threshold makes the division rollout defensible at the August portfolio review?",
        "Has the DPA progressed since pilot kickoff, and who in legal will sign off the master agreement?"
      ],
      "technical": [
        "Can the mapping table fix be validated against all deprecated codes before the July fourteenth review?",
        "Which teams own the deduplication work at source, and what is their completion commitment date?"
      ]
    }
  },
  "criteria": null,
  "totalAgreed": null,
  "delta": {
    "metrics": {
      "prev": 2,
      "curr": 3,
      "change": 1
    },
    "economic_buyer": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_criteria": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_process": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "paper_process": {
      "prev": 1,
      "curr": 1,
      "change": 0
    },
    "identify_pain": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "champion": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "competition": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "overall_prev": 21,
    "overall_curr": 22,
    "overall_change": 1
  },
  "povAssessment": [
    {
      "criterion_id": 1,
      "status": "met",
      "evidence": "Criterion one, accuracy, target ninety-five percent. We closed at ninety-five point eight, met, with week four alone running above ninety-six and a half.",
      "notes": null
    },
    {
      "criterion_id": 2,
      "status": "met",
      "evidence": "Criterion two, handling time, target three minutes or better against the six-minute baseline. Closed at two point eight minutes blended across the pilot book, met, a fifty-three percent reduction.",
      "notes": null
    },
    {
      "criterion_id": 3,
      "status": "met",
      "evidence": "Criterion three, pricing errors reaching a customer, zero across all four weeks. And the open item from the checkpoint, the duplicate legacy codes from the catalogue merge, the mapping fix shipped on the third of July, week four saw zero recurrences.",
      "notes": null
    },
    {
      "criterion_id": 4,
      "status": "met",
      "evidence": "No complaints attributable to the new flow in four weeks. Cutoff compliance on the pilot book finished two point one points above the pre-pilot average, sustained through the first fortnight of the school holidays.",
      "notes": null
    },
    {
      "criterion_id": 5,
      "status": "met",
      "evidence": "Zero unplanned downtime, zero data integrity incidents across the full four weeks. I pulled the sync logs weekly myself. It's a pass, and a comfortable one.",
      "notes": null
    }
  ],
  "risks": [
    {
      "key": "oep-as-hidden-decision-layer",
      "risk": "OEP retains an unconfirmed approval layer above Marcus that could apply its own diligence criteria or contract-value thresholds to a division-wide rollout, meaning Marcus's strong recommendation alone may be insufficient to close in August.",
      "evidence": "Marcus said 'I'm not taking a proposal to August, I'm taking a result and a rollout plan' and 'that's the language the owners think in' - but neither he nor anyone else confirmed whether his recommendation is self-sufficient or whether OEP runs a parallel approval or sign-off process for a contract of this size.",
      "severity": "high",
      "suggested_action": "Before Friday's proposal lands, Jordan should ask Marcus directly in a one-on-one whether the contract value requires any OEP-level approval separate from his portfolio review recommendation, and if so, what that approval process looks like and who owns it - then structure the proposal timeline around that answer."
    },
    {
      "key": "no-paper-process-visibility",
      "risk": "The legal and procurement path for the master agreement remains uncharted - no named legal contact, no procurement counter-sign confirmation, and no contract-value threshold has been surfaced - creating real risk that cycle time after the Friday proposal eats into the August portfolio review window.",
      "evidence": "Jordan said 'it's the master agreement through your legal and a rollout schedule we'd build with Andrea and Lee. Proposal with you by Friday, and if your legal can turn it while the portfolio review lands, contract and rollout can both be moving in August' - the conditional 'if your legal can turn it' acknowledges the dependency without resolving it.",
      "severity": "high",
      "suggested_action": "Jordan should ask Marcus and Andrea this week, before the proposal is sent, to name the legal contact and confirm whether procurement needs to counter-sign and whether any internal approval threshold applies at this contract value - then build an explicit legal turnaround milestone into the rollout plan delivered on Friday."
    },
    {
      "key": "rekki-failure-legacy-scepticism",
      "risk": "Residual category-level scepticism from the failed REKKI deployment at sites not represented on this call - particularly High Wycombe - could slow internal momentum when Marcus and Gemma begin building the case for rollout across the remaining nine sites.",
      "evidence": "Not mentioned in the transcript. Lee named the risk explicitly on a prior call - 'REKKI's ghost still walks at High Wycombe' and 'the residue of it is that people here think this category doesn't work' - and nothing in this call contradicts or resolves that structural credibility problem at the other sites.",
      "severity": "medium",
      "suggested_action": "Will and Jordan should work with Lee to develop a one-page site-level briefing that leads with the South West pilot results and the caravan park anecdote - concrete, peer-level evidence from within Kitwave - and ask Lee to present it personally to the High Wycombe GM before the rollout scoping call, since his voice carries more weight than Choco's at that site."
    },
    {
      "key": "champion-authority-gap",
      "risk": "Gemma has no confirmed budget ownership or commercial mandate across the other nine sites, so the path from a successful South West pilot to a signed division-wide rollout depends on Marcus and Andrea remaining actively engaged through a legal and rollout process Gemma cannot independently drive.",
      "evidence": "Marcus directed the commercial next step entirely to Jordan - 'Jordan, commercials. I want a division-wide proposal' - and Gemma's closing line was personal and celebratory rather than a commitment of ownership: 'I want the statue clause in the contract.' No budget authority or cross-site mandate was asserted by Gemma at any point.",
      "severity": "medium",
      "suggested_action": "Jordan should confirm with Marcus before Friday whether Gemma is formally named as the internal project owner for the rollout, with a defined remit and the relationships to engage the other nine site GMs - and if not, ask Marcus to designate a named internal sponsor with that authority so the rollout plan can show a credible internal owner at each stage."
    },
    {
      "key": "creed-site-competitive-friction",
      "risk": "As rollout expands to the Creed sites sequenced first for Christmas, existing vendor relationships or ordering habits at those site-level managers - who were absent from the entire pilot - could surface competitive friction or passive resistance that delays the rollout schedule.",
      "evidence": "Andrea said 'the Creed sites are the cleanest catalogues we have, if the South West worked, Staverton, Ilkeston and High Wycombe are easier' - but no Creed site manager was present on any call, and no confirmation was given that Creed GMs have been briefed on or are supportive of the rollout decision.",
      "severity": "low",
      "suggested_action": "Ask Andrea and Lee to arrange a brief introduction call between Will and the Creed site GMs before the rollout scoping begins - framed as a discovery conversation about their current ordering workflow - so that any existing vendor relationships or objections are surfaced before they can become timeline blockers during the Christmas sequencing."
    }
  ],
  "email": "Subject: Kitwave POV -- 7/7, results and next steps\n\nSeven criteria, seven met. Accuracy closed at 95.8% (96.5%+ in week four), handling time at 2.8 minutes against a six-minute baseline, zero pricing errors reaching a customer, cutoff compliance two points above the pre-pilot average through the school holidays, and a clean Swords integration with no downtime or data incidents across all four weeks. The duplicate legacy code issue found at the checkpoint was fixed, verified, and saw zero recurrences in week four. One issue, found in flight, fixed in flight. The conservative annualised leakage figure sits at £1.4m -- the catalogue discount is the detail that makes it defensible, and it is already in section three of the pack exactly as Marcus described it.\n\nThe caravan park head of catering who rang Lee to ask why confirmations now come back the same evening, and whether her Somerset sites could have the same, is the summary I would take into any portfolio review.\n\nJordan will have a division-wide proposal with you by Friday, Creed sites sequenced first for the Christmas peak. If your legal can move in parallel with the August portfolio review, contract and rollout can both be in motion together.\n\nWill Terry",
  "actions": [
    {
      "action": "Send division-wide proposal covering all ten sites, Creed sequenced first",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-17"
    },
    {
      "action": "Build rollout schedule with Andrea and Lee for all ten sites",
      "owner": "Joint",
      "suggested_reminder_date": "2026-07-24"
    },
    {
      "action": "Progress master agreement through Kitwave legal team",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-31"
    },
    {
      "action": "Present POV result and rollout plan at August portfolio review",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-31"
    },
    {
      "action": "Ensure Creed sites are live before Christmas catering peak",
      "owner": "Joint",
      "suggested_reminder_date": "2026-09-14"
    },
    {
      "action": "Include caravan park customer anecdote in review pack (section five)",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-17"
    },
    {
      "action": "Include 'statue clause' in the contract as requested by Gemma",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-17"
    }
  ],
  "stakeholders": [
    {
      "name": "Marcus Threlfall",
      "role": "Managing Director, Kitwave Foodservice"
    },
    {
      "name": "Gemma Hartley",
      "role": "Head of Sales Office Operations, Kitwave Foodservice"
    },
    {
      "name": "Andrea Kowalczyk",
      "role": "Group IT Director, Kitwave Group"
    },
    {
      "name": "Lee Trevaskis",
      "role": "General Manager, South West Distribution Centre, Kitwave Foodservice"
    },
    {
      "name": "Dawn",
      "role": null
    }
  ],
  "completedTasks": [
    {
      "description": "Hold final four-week pilot review on 14 July",
      "evidence": "Call Transcript: Final POV Check-in Call ... Date: 14 July 2026"
    },
    {
      "description": "Build mapping table resolving deprecated catalogue codes to live product records before pricing applied",
      "evidence": "the duplicate legacy codes from the catalogue merge, the mapping fix shipped on the third of July, week four saw zero recurrences"
    },
    {
      "description": "Deduplicate worst-offending legacy product codes at source in master data",
      "evidence": "Nineteen deprecated codes also cleaned at source by Gemma's master data lead, so the underlying archaeology is smaller too, that outlives the pilot whatever you decide."
    },
    {
      "description": "Deliver pricing leakage methodology one-pager to Marcus by 7 July",
      "evidence": "You've all had the pack and the methodology one-pager since the seventh"
    },
    {
      "description": "Provide written verification of zero recurrence after duplicate-code fix for final pack",
      "evidence": "week four saw zero recurrences, and the written verification Marcus asked for is in the pack, section three."
    },
    {
      "description": "Include duplicate-code issue documented as found-and-fixed in final review report",
      "evidence": "with one issue found, fixed and verified in flight rather than discovered later"
    },
    {
      "description": "Conduct final POV review meeting as scheduled on 14 July",
      "evidence": "Call Transcript: Final POV Check-in Call ... Date: 14 July 2026 ... Will: Four weeks done, and done inside your hardest trading window"
    },
    {
      "description": "Continue adding accounts to Autopilot daily to increase share above 35%",
      "evidence": "Fifty-five percent of pilot volume ended on Autopilot, and those orders barely register as work."
    },
    {
      "description": "Obtain team sign-off on criterion six once duplicate-code fix is confirmed",
      "evidence": "Sign-off given, unconditionally. The fix killed the silly exceptions, and the last two sceptics turned in week three."
    }
  ],
  "callDate": "2026-07-14"
}

export interface CachedVeFixture {
  meddpicc: MeddpiccScore
  caseStudies: MatchedCaseStudy[]
  baseline: VeBaselineInput[]
  delta: MeddpiccDelta | null
  risks: RiskItem[]
  email: string
  actions: NextAction[]
  stakeholders: ExtractedStakeholder[]
  completedTasks: CachedCompletedTask[]
  callDate: string
}

export const KITWAVE_VE: CachedVeFixture = {
  "meddpicc": {
    "metrics": {
      "score": 3,
      "evidence": "a case anchored on the one point seven million addressable leakage with the pilot's one point four million as evidence inside it, the fifty-five thousand turnover line and the reclaimed management time as secondary drivers... forty-six reconcile to just over one point six million a year... three numbers from three directions agreeing is the strongest thing a business case can contain",
      "gap": "Quantify the management time (20 hrs/week) in pounds to add a fourth validated line item; get a defensible number on the subset of orders genuinely lost (not just delayed) at peak."
    },
    "economic_buyer": {
      "score": 3,
      "evidence": "I'm not taking a proposal to August, I'm taking a result and a rollout plan. The evidence is stronger than anything else on my slate for that meeting... Jordan, commercials. I want a division-wide proposal, all ten sites, Creed sequenced first and live before the Christmas catering peak.",
      "gap": "Confirm Marcus has formal sign-off authority at the August portfolio review without needing a further board escalation above him."
    },
    "decision_criteria": {
      "score": 3,
      "evidence": "That's seven for seven, met or exceeded, with one issue found, fixed and verified in flight rather than discovered later.",
      "gap": "No active gaps; criteria are fully documented and verified through the pilot. Confirm the August review panel does not introduce new evaluation criteria beyond those already met."
    },
    "decision_process": {
      "score": 3,
      "evidence": "I'm not taking a proposal to August, I'm taking a result and a rollout plan... Jordan, commercials. I want a division-wide proposal, all ten sites, Creed sequenced first and live before the Christmas catering peak. What do you need from us? / Proposal with you by Friday, and if your legal can turn it while the portfolio review lands, contract and rollout can both be moving in August.",
      "gap": "Clarify the exact date of the August portfolio review and who else presents or votes on it beyond Marcus, to ensure no surprises in the room."
    },
    "paper_process": {
      "score": 1,
      "evidence": "Jordan's side, but as of Friday the proposal's with your legal, and Andrea's already scoped Staverton and Ilkeston, High Wycombe's booked for next week. Nothing on my side blocks contract, and nothing on the value case waits for it.",
      "gap": "Confirm legal turnaround timeline and whether Kitwave's legal team has flagged any outstanding redlines on the master agreement that could delay execution alongside the August review."
    },
    "identify_pain": {
      "score": 3,
      "evidence": "Credits, re-picks and write-offs traced back to order and pricing errors are running at about one point two percent of division revenue, which on two hundred and forty million is about two point eight million a year. / Peak overtime... came to about a hundred and ninety thousand last year. / The value creation plan gives the division two years to put a hundred and fifty basis points on operating margin... Foodservice is why the group's margin story works, we're the higher-margin division, so we're the ones who have to prove the model scales.",
      "gap": "Formalise the account attrition pain-fourteen flagged accounts at £310k combined revenue remains judgement-based; explore whether any can be substantiated with order-frequency data from Swords."
    },
    "champion": {
      "score": 3,
      "evidence": "Gemma, you carried this from a cold email to here, so say the last word. / Just that I want the statue clause in the contract. Will knows what it means.",
      "gap": "Validate that Gemma retains influence in the August review room itself, or identify who will be her proxy voice if she is not a named attendee at the portfolio review."
    },
    "competition": {
      "score": 3,
      "evidence": "REKKI reads email and app-style orders reasonably well. It does nothing for phone and voicemail, which for you is roughly half of everything, and it had no path into Swords, so even what it did capture got re-keyed, which means it added a step instead of removing one. / my sales office has heard the word pilot before, REKKI's ghost still walks at High Wycombe.",
      "gap": "Confirm no new competitive vendor has been introduced at the portfolio review level above Marcus, particularly given the acquisition-heavy group structure that may have other divisional incumbents."
    },
    "overall_score": 22,
    "summary": "This deal is at very high MEDDPICC maturity heading into the portfolio review: metrics, economic buyer, decision criteria, decision process, identify pain, champion, and competition are all fully evidenced and the business case has been stress-tested and triangulated from three independent data directions. Paper process remains the one element not yet fully closed out, though legal is now in motion and the economic buyer is personally driving the August portfolio review with Choco as the lead initiative. The only residual risks are external to the sales process-legal turnaround speed and whether the portfolio review panel introduces any last-minute evaluation criteria-both of which should be actively monitored but neither undermines the current position.",
    "suggested_questions": {
      "sc_intro": [
        "Did the August portfolio review go ahead as planned, and how did the room receive the case?",
        "Has Marcus shared the value engineering output with the OEP portfolio team yet?",
        "Which site is confirmed for the first post-Staverton and Ilkeston rollout wave?",
        "Did High Wycombe scoping with Andrea complete on schedule last week?"
      ],
      "discovery": [
        "Who owns final signature authority on the master agreement at Kitwave Group level?",
        "Is there a procurement committee approval required above a certain contract value threshold?",
        "How long does Kitwave legal typically take to review a master agreement once triggered?",
        "Who owns supplier contracts at Group level, Kitwave or OEP, and what are typical cycle times?",
        "Does OEP set vendor insurance minimums or does Kitwave procurement define those independently?",
        "Are commercial redlines anticipated on the master agreement that could delay execution post-August review?",
        "Does the education and care book have a separate procurement owner who needs to be engaged?",
        "Will Fife Creamery be included in the division rollout scope or treated as a separate workstream?",
        "Does the acquisition integration playbook have a formal owner who needs to approve Choco inclusion?"
      ],
      "technical": [
        "Are the merged South West price files fully reconciled in Swords now or still being cleaned?",
        "What is the catalogue mapping complexity expected at Staverton, Ilkeston and High Wycombe?",
        "Who leads per-site scoping calls with Andrea, and what is the expected duration per site?",
        "Will legacy catalogue quirks at remaining sites require clean-up before Choco onboarding begins?",
        "Is Swords configuration consistent across all ten sites or does each site carry local variations?"
      ]
    },
    "answered_questions": {
      "sc_intro": [],
      "discovery": [],
      "technical": []
    }
  },
  "caseStudies": [
    {
      "title": "T. Quality + Choco",
      "url": "https://choco.com/uk/stories/case-studies/t-quality-grows-with-choco",
      "customer": "T. Quality",
      "industry": "Food Distribution",
      "headline_pain": "Scaling sales efficiently across multiple depots while onboarding all customers onto a digital platform was a key challenge.",
      "summary": "T. Quality scaled sales across 11 depots, onboarded every customer onto Choco, and turned AI prospecting and quoting into a competitive edge.",
      "relevance_reason": "T. Quality mirrors Kitwave Foodservice almost exactly - a multi-depot UK food distributor scaling across 11 sites, directly matching Kitwave's 10-site challenge of standardising order operations post-acquisition while freeing sales office staff to focus on commercial activity.",
      "one_liner": "T. Quality scaled Choco across 11 depots and turned their sales offices into a commercial engine - exactly the capacity-release story Marcus wants to take into the August review.",
      "relevance_score": 10
    },
    {
      "title": "FB the Wholesaler + Choco",
      "url": "https://choco.com/uk/stories/case-studies/fb-the-wholesaler-digitize-every-order-and-unlock-growth",
      "customer": "FB the Wholesaler",
      "industry": "Food Wholesale / Distribution",
      "headline_pain": "Orders pouring in from calls, voicemails, texts, and handwritten notes caused constant errors, rescheduled deliveries, and wasted fuel and time.",
      "summary": "Adopting Choco's OrderAgent and eCommerce enabled FB the Wholesaler to digitize every order channel and achieve 250% dairy sales growth.",
      "relevance_reason": "FB the Wholesaler's exact channel mix - calls, voicemails, texts, and handwritten notes causing errors and credits - is a near-perfect match for Kitwave's 68% manual order burden and £1.7m addressable leakage from pricing and data-entry errors.",
      "one_liner": "FB the Wholesaler eliminated errors across calls, voicemails, texts, and handwritten notes to achieve 250% sales growth - the same manual channel mix driving Kitwave's £1.7m credit leakage today.",
      "relevance_score": 9
    },
    {
      "title": "Reach Food Group + Choco",
      "url": "https://choco.com/uk/stories/case-studies",
      "customer": "Reach Food Group",
      "industry": "Food Distribution",
      "headline_pain": "Order processing was taking up to 40 hours and accuracy was a persistent challenge.",
      "summary": "Using Choco AI, Reach Food Group achieved 96% order accuracy and reduced processing time from 40 hours to just 4 hours within 3 weeks.",
      "relevance_reason": "Reach Food Group's dramatic accuracy improvement and processing-time reduction within weeks provides a credible, UK-market proof point for the order accuracy and leakage prevention story at the centre of Kitwave's August business case.",
      "one_liner": "Reach Food Group hit 96% order accuracy and cut processing time from 40 hours to 4 within three weeks - a concrete UK benchmark for the accuracy gains underpinning Kitwave's £1.7m leakage case.",
      "relevance_score": 8
    }
  ],
  "baseline": [
    {
      "key": "loaded_annual_cost_order_entry_staff",
      "label": "Total loaded annual cost of order entry headcount",
      "raw_value": "just over one point six million a year",
      "numeric_value": 1600000,
      "unit": "/year",
      "currency": "GBP",
      "evidence": "the forty-six reconcile to just over one point six million a year, which squares with what Gemma quoted you in May, I checked before this call",
      "category": "cost",
      "direction": "decrease"
    },
    {
      "key": "weekly_hours_pricing_credit_resolution",
      "label": "Hours per week spent resolving pricing discrepancies and credits",
      "raw_value": "A hundred and ten hours a week, division-wide",
      "numeric_value": 110,
      "unit": "hours/week",
      "currency": null,
      "evidence": "A hundred and ten hours a week, division-wide. Raising the credit, investigating, agreeing it with the customer, pushing it through Swords.",
      "category": "time",
      "direction": "decrease"
    },
    {
      "key": "average_credit_resolution_time",
      "label": "Average time to resolve a single credit",
      "raw_value": "Twenty-two minutes on average",
      "numeric_value": 22,
      "unit": "minutes/credit",
      "currency": null,
      "evidence": "Twenty-two minutes on average, from the same two-week tracking exercise.",
      "category": "time",
      "direction": "decrease"
    },
    {
      "key": "annual_credit_leakage_total",
      "label": "Total annual credit leakage value",
      "raw_value": "two point eight million a year",
      "numeric_value": 2800000,
      "unit": "/year",
      "currency": "GBP",
      "evidence": "Three hundred a week at one eighty is two point eight million a year, which is the leakage figure we gave you in May arriving from a completely different direction.",
      "category": "error_rate",
      "direction": "decrease"
    },
    {
      "key": "addressable_credit_leakage_preventable",
      "label": "Preventable share of annual credit leakage (pricing/data entry causes)",
      "raw_value": "about sixty percent, so one point seven million",
      "numeric_value": 1700000,
      "unit": "/year",
      "currency": "GBP",
      "evidence": "Our analysis says about sixty percent, so one point seven million, traces to pricing and data entry causes a real-time check at capture would stop",
      "category": "error_rate",
      "direction": "decrease"
    },
    {
      "key": "annual_staff_turnover_rate_sales_offices",
      "label": "Annual staff turnover rate in sales offices",
      "raw_value": "twenty-eight percent a year on the sales offices",
      "numeric_value": 28,
      "unit": "%/year",
      "currency": null,
      "evidence": "Turnover's twenty-eight percent a year on the sales offices against fourteen percent group-wide, so double.",
      "category": "kpi",
      "direction": "decrease"
    },
    {
      "key": "annual_turnover_replacement_cost",
      "label": "Annual cost of replacing sales office coordinator leavers",
      "raw_value": "call it fifty-five thousand a year in pure replacement cost",
      "numeric_value": 55000,
      "unit": "/year",
      "currency": "GBP",
      "evidence": "At twenty-eight percent on forty-six people that's about thirteen leavers a year, call it fifty-five thousand a year in pure replacement cost.",
      "category": "cost",
      "direction": "decrease"
    },
    {
      "key": "new_coordinator_ramp_to_full_productivity",
      "label": "Weeks for a new coordinator to reach full productivity",
      "raw_value": "Eight weeks",
      "numeric_value": 8,
      "unit": "weeks/hire",
      "currency": null,
      "evidence": "Eight weeks, honestly, and it's got worse with every acquisition, because a new starter now learns Swords plus whichever legacy quirks their site's catalogue still carries.",
      "category": "time",
      "direction": "decrease"
    },
    {
      "key": "weekly_management_time_supervising_order_entry",
      "label": "Weekly management hours spent supervising or quality-checking manual order entry",
      "raw_value": "twenty hours a week combined",
      "numeric_value": 20,
      "unit": "hours/week",
      "currency": null,
      "evidence": "Across the ten sales office managers and the site GMs who get dragged in, we put it at twenty hours a week combined. Spot checks, escalations, the Monday morning arguments about whose credit it was.",
      "category": "time",
      "direction": "decrease"
    },
    {
      "key": "manual_order_channel_share",
      "label": "Proportion of weekly orders requiring manual entry",
      "raw_value": "sixty-eight percent manual",
      "numeric_value": 68,
      "unit": "% of orders",
      "currency": null,
      "evidence": "Phone's thirty-nine percent. Email's thirteen. The overnight voicemails are eight, WhatsApp and texts six, and photographed notes about two. That's your sixty-eight manual.",
      "category": "kpi",
      "direction": "decrease"
    },
    {
      "key": "average_order_value",
      "label": "Average order value across the division",
      "raw_value": "Four hundred pounds, near enough",
      "numeric_value": 400,
      "unit": "/order",
      "currency": "GBP",
      "evidence": "Four hundred pounds, near enough. Two hundred and forty million over roughly five hundred and ninety-eight thousand orders a year.",
      "category": "kpi",
      "direction": "increase"
    },
    {
      "key": "revenue_at_risk_from_error_driven_attrition",
      "label": "Annual revenue tied to accounts where errors materially drove attrition or reduced spend",
      "raw_value": "roughly three hundred and ten thousand in combined annual revenue",
      "numeric_value": 310000,
      "unit": "/year",
      "currency": "GBP",
      "evidence": "Fourteen accounts flagged, roughly three hundred and ten thousand in combined annual revenue, where the ASM believes errors were a material factor in the account leaving or cutting back.",
      "category": "error_rate",
      "direction": "decrease"
    }
  ],
  "delta": {
    "metrics": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "economic_buyer": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_criteria": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "decision_process": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "paper_process": {
      "prev": 1,
      "curr": 1,
      "change": 0
    },
    "identify_pain": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "champion": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "competition": {
      "prev": 3,
      "curr": 3,
      "change": 0
    },
    "overall_prev": 22,
    "overall_curr": 22,
    "overall_change": 0
  },
  "risks": [
    {
      "key": "oep-as-hidden-decision-layer",
      "risk": "OEP retains an unconfirmed approval layer above Marcus that could apply its own diligence criteria or contract-value thresholds to a division-wide rollout, meaning Marcus's strong recommendation alone may be insufficient to close in August.",
      "evidence": "Marcus said 'the August review will assume every number is wrong until shown otherwise' and 'attribution is what makes it survive the room, they trust our numbers, not vendors'' - but neither he nor anyone else on this call confirmed whether his recommendation is self-sufficient at the portfolio review or whether OEP runs a parallel approval process for a contract of this size.",
      "severity": "high",
      "suggested_action": "Before the August review, ask Marcus directly whether his recommendation to the portfolio review is sufficient to approve the division-wide contract, or whether OEP's ownership team has a separate sign-off threshold - and if so, request the chance to brief that layer with the same evidenced case Will is building."
    },
    {
      "key": "no-paper-process-visibility",
      "risk": "The legal turnaround timeline for the master agreement remains unresolved, creating real risk that redlines or procurement counter-sign delays eat into the August portfolio review window and decouple contract execution from the business case approval.",
      "evidence": "Will said 'the proposal's with your legal, and Andrea's already scoped Staverton and Ilkeston, High Wycombe's booked for next week. Nothing on my side blocks contract' - but no legal contact name, no redline status, no contract-value approval threshold, and no expected turnaround date was surfaced by any Kitwave attendee.",
      "severity": "high",
      "suggested_action": "Ask Marcus or Fiona to name the legal contact handling the master agreement and confirm whether any redlines have been raised, then establish a hard turnaround date that keeps contract execution aligned with the August portfolio review rather than trailing it."
    },
    {
      "key": "rekki-failure-legacy-scepticism",
      "risk": "Residual category-level scepticism from the failed REKKI deployment - particularly at High Wycombe, which is now actively being scoped for rollout next week - could surface resistance from site-level staff and managers who were absent from the pilot and the value engineering process entirely.",
      "evidence": "Will said 'High Wycombe's booked for next week' - but High Wycombe was not represented on this call or any prior call, and nothing in this transcript contradicts or resolves the previously identified structural credibility problem at that site from the failed REKKI deployment.",
      "severity": "medium",
      "suggested_action": "Before Andrea's High Wycombe scoping visit, ask Gemma or Lee to brief the High Wycombe site manager directly on the South West pilot results - ideally sharing the reconciled numbers from this call - so Andrea arrives at a site that has been warmed, not one encountering Choco cold after a prior category failure."
    },
    {
      "key": "champion-authority-gap",
      "risk": "Gemma has no confirmed budget ownership or cross-site mandate, so the path from a successful workshop to a signed division-wide rollout depends entirely on Marcus and the commercial track remaining actively engaged through a legal and rollout process Gemma cannot independently drive.",
      "evidence": "Marcus directed all commercial momentum explicitly - 'both tracks hold their pace' - and Gemma's contributions throughout were operational and evidential rather than commercial or budgetary; no budget authority or cross-site mandate was asserted by Gemma at any point in this call.",
      "severity": "medium",
      "suggested_action": "Ask Marcus to explicitly designate Gemma - or another named internal owner - as the day-to-day commercial point of contact with authority to progress the contract and rollout schedule, so the deal does not stall if Marcus's attention shifts in the weeks before August."
    },
    {
      "key": "creed-site-competitive-friction",
      "risk": "The Creed sites sequenced first for post-August rollout have no named manager engaged or briefed on the decision, leaving passive resistance or existing vendor relationships at those sites as an unmitigated risk to the rollout schedule.",
      "evidence": "Not mentioned in the transcript. Andrea confirmed Staverton and Ilkeston are already scoped and High Wycombe is booked, but no Creed site manager has appeared on any call, and no confirmation was given that Creed GMs have been briefed on or are supportive of the rollout decision.",
      "severity": "low",
      "suggested_action": "Ask Gemma to arrange a brief introductory call between Will or Andrea and the Creed site GMs before the August review, framed as a rollout readiness conversation, to surface any site-level concerns before they become blockers post-approval."
    }
  ],
  "email": "Subject: Value model inputs confirmed -- Kitwave Foodservice\n\nThe numbers are locked. Fiona's reconciliation of the £1.6m loaded headcount cost, the two-week time-tracking that produced the 110 hours and 22-minute credit resolution figures, and the three-way cross-check arriving at £2.8m total leakage (£1.7m addressable) give the August portfolio review exactly what Marcus asked for: every input traceable to a name, not an extrapolation. I'll build the case around the £1.7m preventable leakage with the pilot's evidenced £1.4m sitting inside it as the proof point, with the £55k turnover line and reclaimed management time as secondary drivers, and peak capacity framed as the organic growth story rather than a cost line.\n\nI'll have the value model with live assumption sliders ready for your review before it goes anywhere near the August session. The one thing I need from your side before I finalise it: confirmation from Fiona that the replacement cost boundary holds as documented, specifically that the ramp cost inside the £4,200 figure covers weeks one to three only, with no overlap into the eight-week productivity figure.\n\nCan we book 45 minutes in the week of 4 August to walk through the model before it goes to the review? I'll send a calendar invite once you confirm the slot suits.\n\nWill Terry",
  "actions": [
    {
      "action": "Build division-wide business case from ground-up with all ten sites' data",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Anchor value case on £1.7M addressable leakage with pilot's £1.4M as evidence",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Include £55K turnover cost and reclaimed management time as secondary drivers",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Frame capacity release as organic growth story, not a cost line",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Present peak delay and attrition figures as directional context only",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Explicitly disclaim the 40% non-preventable credit leakage in the business case",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Present £310K at-risk revenue as judgement-based directional context, sourced clearly",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Label customer order frequency reduction as a data gap, not a number",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Document boundary between 3-week ramp cost and 8-week full productivity figure",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Build value proposition with live-adjustable assumption sliders for August review",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Attribute every input to a named attendee from this call in the business case",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Submit completed business case in time for August portfolio review",
      "owner": "SC",
      "suggested_reminder_date": "2026-08-05"
    },
    {
      "action": "Complete High Wycombe site scoping visit (booked for next week)",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Legal team to progress contract review (proposal already submitted)",
      "owner": "Prospect",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Jordan to continue progressing commercial/proposal track on Choco side",
      "owner": "SC",
      "suggested_reminder_date": "2026-07-29"
    },
    {
      "action": "Maintain pace on both contract and value case tracks independently",
      "owner": "Joint",
      "suggested_reminder_date": "2026-08-05"
    }
  ],
  "stakeholders": [
    {
      "name": "Marcus Threlfall",
      "role": "Managing Director, Kitwave Foodservice"
    },
    {
      "name": "Gemma Hartley",
      "role": "Head of Sales Office Operations, Kitwave Foodservice"
    },
    {
      "name": "Fiona Drummond",
      "role": "Finance Business Partner, Kitwave Foodservice"
    },
    {
      "name": "Lee Trevaskis",
      "role": "General Manager, South West Distribution Centre, Kitwave Foodservice"
    },
    {
      "name": "David Miller",
      "role": null
    },
    {
      "name": "Andrea",
      "role": null
    }
  ],
  "completedTasks": [
    {
      "description": "Send division-wide proposal covering all ten sites, Creed sequenced first",
      "evidence": "as of Friday the proposal's with your legal"
    },
    {
      "description": "Marcus to present pilot results to August OEP portfolio review",
      "evidence": "Marcus to present pilot results to August OEP portfolio review"
    }
  ],
  "callDate": "2026-07-22"
}
