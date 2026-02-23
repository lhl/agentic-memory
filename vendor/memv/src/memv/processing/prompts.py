# Knowledge extraction patterns adapted from Nemori (MIT License)
# https://github.com/ergut/nemori
#
# Core insight: importance emerges from prediction error, not upfront scoring.
# Quality tests and category taxonomy empirically validated.

"""
Centralized prompt templates and knowledge extraction criteria.
"""

# =============================================================================
# QUALITY TESTS
# Apply these to candidate knowledge before extraction.
# =============================================================================

QUALITY_TESTS = """
Apply these quality tests to each candidate fact:

1. **Persistence Test**: Will this still be true in 6 months?
   - YES: "User works as a software engineer" → extract
   - NO: "User is tired today" → skip

2. **Specificity Test**: Does it contain concrete, searchable information?
   - YES: "User prefers Python over JavaScript for backend" → extract
   - NO: "User likes programming" → skip (too vague)

3. **Utility Test**: Can this help predict future user needs or preferences?
   - YES: "User is building a mobile app for their startup" → extract
   - NO: "User said hello" → skip

4. **Independence Test**: Can it be understood without conversation context?
   - YES: "User's dog is named Max" → extract
   - NO: "User prefers the second option" → skip (requires context)
"""

# =============================================================================
# KNOWLEDGE CATEGORIES
# Taxonomy of extractable knowledge types.
# =============================================================================

KNOWLEDGE_CATEGORIES = """
Extract knowledge that fits these categories:

- **Identity & Background**: Name, profession, location, education, demographics
- **Persistent Preferences**: Technology choices, communication style, work patterns
- **Technical Details**: Stack, tools, projects, codebases, technical constraints
- **Relationships**: Family, colleagues, pets, organizations they belong to
- **Goals & Plans**: Short and long-term objectives, deadlines, milestones
- **Beliefs & Values**: Opinions, priorities, decision-making criteria
- **Habits & Patterns**: Recurring behaviors, routines, typical responses
"""

# =============================================================================
# EXCLUSIONS
# What NOT to extract.
# =============================================================================

EXCLUSIONS = """
Do NOT extract:

- Temporary emotions or reactions ("user seems frustrated")
- Single conversation acknowledgments ("user said thanks")
- Vague statements without specifics ("user likes food")
- Context-dependent information ("user prefers this one")
- Generic pleasantries or filler
- Obvious or common knowledge
- Speculative or uncertain claims
- Conversation events ("User asked about X", "User requested Y") - extract the FACT, not the action

**CRITICAL SOURCE RULES - READ CAREFULLY:**
- Extract facts the user explicitly stated in their own messages
- DO extract factual information communicated by the assistant (dates, appointments, confirmations, scheduled events)
- NEVER extract assistant suggestions, recommendations, or hypotheticals as user facts
  ("was advised to", "was suggested to", "was recommended to")
- Treat assistant suggestions about user intent as speculative — never encode them as facts
- NEVER attribute intent/action/statement to user if it originated in a hypothetical/suggestion/conditional from the assistant
- Ignore assistant-led topics unless user acts on them
- Attribute preferences only to explicit user claims — never to questions or reactions
- If assistant says "use Python" and user doesn't respond with "yes" or confirm - DO NOT extract "User uses Python"
- If assistant provides code in language X but user says "I use Y" - extract Y, not X
- The user ASKING about something is NOT the same as the user USING it
- Look for USER messages containing "I use", "I prefer", "I like", "I work with", "my project uses"
- Extract opinions WITH reasons when stated: "User finds X too basic" or "User likes Y because it's intuitive"
"""

# =============================================================================
# ATOMIZATION RULES
# Self-contained statement constraints for extraction quality.
# =============================================================================

ATOMIZATION_RULES = """
## Self-Contained Statement Rules (MANDATORY)

Every extracted statement MUST be independently interpretable without conversation context.

**PROHIBIT in output statements:**
- Pronouns as subjects: "he", "she", "they", "it" — use the actual name or "User"
- Relative time: "yesterday", "today", "tomorrow", "last week", "next month", "recently", "soon"
- Ambiguous references: "the project", "the tool", "that place", "the same thing"
- First person: "I", "my", "me", "we", "our"

**REQUIRE in output statements:**
- Absolute dates when temporal info exists: "on [resolved date]", not "yesterday"
- Specific names: "User's React project at Vstorm", not "the project"
- Third person: "User prefers Python", not "I prefer Python"

**Coreference resolution — resolve BEFORE writing the statement:**
- "my kids" → "User's children"
- "he said" → "[Name from conversation] said"
- "this place" → "[specific location mentioned]"
- "the same library" → "[library name]"
"""

# =============================================================================
# BOUNDARY DETECTION SIGNALS
# Patterns that indicate episode boundaries.
# =============================================================================

BOUNDARY_SIGNALS = """
Evaluate these signals for topic/intent shifts:

**High confidence boundary signals:**
- Explicit topic change ("speaking of...", "by the way", "anyway")
- Clear intent transition (asking → deciding, learning → implementing)
- Temporal gap markers (>30 minutes since last message)

**Medium confidence signals:**
- Subject matter shift (different project, different domain)
- New question unrelated to prior discussion
- Structural markers ("quick question", "one more thing")

**NOT boundaries:**
- Follow-up questions on same topic
- Clarifications or elaborations
- Natural conversation flow within same subject
- Building on previous response
"""

# =============================================================================
# PROMPT TEMPLATES
# =============================================================================


def boundary_detection_prompt(context: str, new_message: str) -> str:
    """Prompt for detecting episode boundaries."""
    return f"""Analyze whether the new message represents a topic or intent shift from the current conversation.

<current_conversation>
{context}
</current_conversation>

<new_message>
{new_message}
</new_message>

{BOUNDARY_SIGNALS}

Respond with JSON:
{{
    "is_boundary": true/false,
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
}}"""


def episode_generation_prompt(conversation: str, reference_timestamp: str) -> str:
    """Prompt for generating episode title and detailed content."""
    return f"""Transform this conversation into a structured episodic memory.

<conversation>
{conversation}
</conversation>

<reference_timestamp>
{reference_timestamp}
</reference_timestamp>

Generate:
1. **Title**: A concise phrase (3-7 words) capturing the episode's main theme
2. **Content**: A detailed third-person narrative that includes:
   - Who participated and relevant context about them
   - What was discussed (specific topics, technologies, names, tools)
   - What decisions were made or preferences expressed
   - What plans, outcomes, or next steps were formed
   - Convert relative dates to absolute dates using the reference timestamp
   - Include ALL specific details mentioned (company names, tool names, data formats, etc.)

**IMPORTANT:**
- Do NOT expand technical acronyms - preserve exactly as user said (RAG, API, LLM, PDF, etc.)
- Preserve the user's exact opinions and reasons (e.g., "finds X too basic", "likes Y because...")

Write the content as a coherent story with ALL important details preserved.
This content will be used for knowledge extraction, so SPECIFICS matter.

Respond with JSON:
{{
    "title": "...",
    "content": "..."
}}"""


def prediction_prompt(existing_knowledge: str, episode_title: str) -> str:
    """Prompt for predicting episode content from existing knowledge."""
    return f"""You have the following knowledge about the user:

<existing_knowledge>
{existing_knowledge}
</existing_knowledge>

A conversation episode titled "{episode_title}" just occurred.

Based on what you already know, predict what information, facts, or events this episode likely contains. Be specific about:
- Topics the user probably discussed
- Preferences or opinions they might have expressed
- Decisions or plans they may have mentioned
- Any updates to known facts

Write your prediction as a list of expected statements."""


def cold_start_extraction_prompt(episode_title: str, original_messages: list[dict], reference_timestamp: str | None = None) -> str:
    """
    Prompt for extracting knowledge when no prior knowledge exists (cold start).

    IMPORTANT: Only use original messages as source of truth.
    Episode content is for retrieval, not extraction - it's LLM-generated and can corrupt facts.
    """
    formatted = "\n".join(
        f">>> USER: {m['content']}" if m["role"] == "user" else f"ASSISTANT: {m['content']}" for m in original_messages
    )

    timestamp_section = ""
    if reference_timestamp:
        timestamp_section = f"""
<reference_timestamp>
{reference_timestamp}
</reference_timestamp>
You MUST resolve ALL relative dates using this timestamp.
Statements with unresolved relative time ("yesterday", "last week") are INVALID — resolve them or omit.
"""

    return f"""Extract HIGH-VALUE, PERSISTENT knowledge from this conversation.
{timestamp_section}

**SOURCE RULES:**
- Lines starting with ">>> USER:" are the user's actual words — the primary source of truth
- DO extract factual information communicated by the assistant (dates, appointments, confirmations)
- Do NOT extract assistant suggestions, recommendations, or hypotheticals as user facts
- Treat assistant suggestions about user intent as speculative — never encode them as facts
- Attribute preferences only to explicit user claims — never to assistant questions or reactions
- Preserve the user's exact phrasing and technical terms

<episode_context>
Topic: {episode_title}
</episode_context>

<conversation>
{formatted}
</conversation>

{KNOWLEDGE_CATEGORIES}

{QUALITY_TESTS}

{EXCLUSIONS}

{ATOMIZATION_RULES}

## Examples

### GOOD Extractions:
- "User's name is Bartosz"
- "User works at Vstorm"
- "User is building a multimodal RAG system"
- "User prefers PyTorch over TensorFlow"
- "User uses Qdrant as their vector database"
- "User is working with PDFs containing embedded images"
- "User likes Chroma because it's the most intuitive for them"
- "User finds Faiss too basic for their needs"
- "User had problems with Milvus due to hosting overhead"
- "User uses JavaScript" (correct third-person form)
- "User started using FastAPI on 2024-06-14" (absolute date, not "yesterday")
- "User moved to Berlin in 2023" (resolved, not "last year")

### BAD Extractions:
- "I use JavaScript" (raw copy - should be "User uses JavaScript")
- "He started using it yesterday" (unresolved pronoun + relative time → "User started using FastAPI on 2024-06-14")
- "They moved there last year" (unresolved pronoun + relative time → "User moved to Berlin in 2023")
- "User requested code for X" (conversation event, not fact about user)
- "User discussed X" (conversation event)
- "User asked about X" (conversation event - extract the preference instead)
- "Random Access Group (RAG)" (don't expand acronyms - preserve "RAG" as-is)
- Expanding ANY acronym the user used (RAG, API, LLM, PDF, etc.)
- "User is interested in machine learning" (too vague)
- "User received advice about X" (conversation event)
- "User was advised to use X" (assistant-sourced, not user fact)
- "User prefers Python" when assistant suggested Python but user didn't confirm (VIOLATES SOURCE RULE)
- "User uses library X" when assistant recommended it but user didn't adopt it (VIOLATES SOURCE RULE)
- "User is using Python" when assistant provided Python code but user said "I use JavaScript" (WRONG - user stated JavaScript)

## Output Format

For each extracted item, specify:
- statement: A concrete, self-contained fact from the conversation (see SOURCE RULES above)
- knowledge_type: "new"
- temporal_info: Human-readable description if mentioned ("since January 2024", "until next month")
- valid_at: ISO 8601 datetime when fact became true, or null if unknown/always true (e.g., "2024-01-01T00:00:00Z")
- invalid_at: ISO 8601 datetime when fact stops being true, or null if still true (e.g., "2024-12-31T23:59:59Z")
- confidence: 0.0-1.0

Extract ALL concrete facts. Multiple extractions from one episode is expected."""


def extraction_prompt_with_prediction(prediction: str, conversation: str, reference_timestamp: str | None = None) -> str:
    """Prompt for extracting knowledge by comparing prediction vs reality."""
    timestamp_section = ""
    if reference_timestamp:
        timestamp_section = f"""
<reference_timestamp>
{reference_timestamp}
</reference_timestamp>
You MUST resolve ALL relative dates using this timestamp.
Statements with unresolved relative time ("yesterday", "last week") are INVALID — resolve them or omit.
"""

    return f"""Extract valuable knowledge by comparing actual conversation with predicted content.
{timestamp_section}
**SOURCE RULES:**
- Lines starting with ">>> USER:" are the user's actual words — the primary source of truth.
- DO extract factual info communicated by the assistant (dates, appointments, confirmations).
- Do NOT extract assistant suggestions, recommendations, or hypotheticals as user facts.

<prediction>
{prediction}
</prediction>

<actual_conversation>
{conversation}
</actual_conversation>

Extract knowledge that exists in the conversation but is MISSING, MISREPRESENTED, or provides NEW DETAILS beyond the prediction.

Focus on SPECIFIC DETAILS even if the general topic was predicted:
- Reasons WHY the user likes/dislikes something
- Specific problems or issues mentioned
- Concrete preferences with justifications

{KNOWLEDGE_CATEGORIES}

{QUALITY_TESTS}

{EXCLUSIONS}

{ATOMIZATION_RULES}

## Examples

### GOOD Extractions (concrete facts):
- "User works at ByteDance as a senior ML engineer"
- "User prefers PyTorch over TensorFlow for debugging"
- "User is building a video understanding system for their thesis"
- "User uses Kinetics-400 dataset for video research"
- "User likes Chroma because it's intuitive"
- "User finds Faiss too basic"
- "User had issues with Milvus due to hosting overhead"
- "User started using FastAPI on 2024-06-14" (absolute date, not "yesterday")
- "User moved to Berlin in 2023" (resolved, not "last year")

### BAD Extractions:
- "He started using it yesterday" (unresolved pronoun + relative time)
- "They moved there last year" (unresolved pronoun + relative time)
- "User is interested in X" (too vague)
- "User asked about X" (conversation event, not fact)
- "User asked for suggestions on X" (conversation event - extract the preference instead)
- "User discussed X" (conversation event)
- "User was advised to use X" (assistant-sourced, not user fact)
- "User prefers X" when assistant suggested X but user didn't confirm (VIOLATES SOURCE RULE)
- "User uses Python" when assistant provided Python code but user said they use JavaScript (WRONG)

## Output Format

For each extracted item, specify:
- statement: A concrete, self-contained fact from the conversation (see SOURCE RULES above)
- knowledge_type: "new" if entirely new, "update" if refines existing, "contradiction" if conflicts
- temporal_info: Human-readable description if mentioned ("since January 2024", "until next month")
- valid_at: ISO 8601 datetime when fact became true, or null if unknown/always true (e.g., "2024-01-01T00:00:00Z")
- invalid_at: ISO 8601 datetime when fact stops being true, or null if still true (e.g., "2024-12-31T23:59:59Z")
- confidence: 0.0-1.0

Return EMPTY LIST if no concrete facts found beyond the prediction."""


# =============================================================================
# BATCH SEGMENTATION
# Groups messages into coherent episodes in a single pass.
# =============================================================================


def batch_segmentation_prompt(messages_text: str) -> str:
    """Prompt for batch segmentation of messages into episode groups."""
    return f"""Analyze the following conversation and group messages into coherent episodes.

<conversation>
{messages_text}
</conversation>

Group messages that belong to the same topic or task together.
Each group should be a coherent unit of conversation about a single topic.

**Grouping rules:**
1. Messages about the same topic/task belong together
2. A topic shift starts a new group
3. Follow-ups and clarifications stay with their parent topic
4. Messages can be in non-consecutive groups if topics interleave (e.g., returning to an earlier topic)

**Output format:**
Return a JSON array where each element is an array of message indices (0-based) belonging to that episode.
Messages must appear in exactly one group. Groups should be in chronological order of their first message.

Example:
- If messages 0-3 are about weather, 4-6 about coding, and 7-8 return to weather:
  [[0, 1, 2, 3, 7, 8], [4, 5, 6]]

Respond with ONLY the JSON array, no explanation."""


# =============================================================================
# EPISODE MERGING
# Decides whether similar episodes should be merged.
# =============================================================================


def merge_decision_prompt(episode1_title: str, episode1_content: str, episode2_title: str, episode2_content: str) -> str:
    """Prompt for deciding if two episodes should be merged."""
    return f"""Determine if these two episodes should be merged into one.

<episode_1>
Title: {episode1_title}
Content: {episode1_content}
</episode_1>

<episode_2>
Title: {episode2_title}
Content: {episode2_content}
</episode_2>

Episodes should be merged if they:
1. Discuss the same topic or project
2. Are logically part of the same conversation flow
3. Would make more sense as a single coherent unit

Episodes should NOT be merged if they:
1. Cover distinctly different topics
2. Represent separate tasks or decisions
3. Are only superficially related

Respond with JSON:
{{
    "should_merge": true/false,
    "reason": "brief explanation"
}}"""


def merge_content_prompt(episode1_title: str, episode1_content: str, episode2_title: str, episode2_content: str) -> str:
    """Prompt for generating merged episode content."""
    return f"""Merge these two episodes into a single coherent episode.

<episode_1>
Title: {episode1_title}
Content: {episode1_content}
</episode_1>

<episode_2>
Title: {episode2_title}
Content: {episode2_content}
</episode_2>

Create a merged episode that:
1. Has a title capturing the combined theme (3-7 words)
2. Has content combining ALL important information from both
3. Eliminates redundancy while preserving all specific details

Respond with JSON:
{{
    "title": "...",
    "content": "..."
}}"""
