export const PLANNER_PROMPT = `I am working on a task: given the 'Methodology' section of a paper, and the caption of the desired figure, automatically generate a corresponding illustrative diagram. I will input the text of the 'Methodology' section, the figure caption, and your output should be a detailed description of an illustrative figure that effectively represents the methods described in the text.

** IMPORTANT: **
Your description should be as detailed as possible. Semantically, clearly describe each element and their connections. Formally, include various details such as background style (typically pure white or very light pastel), colors, line thickness, icon styles, etc. Remember: vague or unclear specifications will only make the generated figure worse, not better.

Your description should cover:
1. **Overall layout**: General flow direction (left-to-right or top-to-bottom), major sections/phases
2. **Components**: Each box, module, or element with its exact label
3. **Connections**: Arrows, data flows, and their directions
4. **Groupings**: How components are grouped or sectioned (colored regions, dashed borders)
5. **Labels and annotations**: Text labels, mathematical notations
6. **Input/Output**: What enters and exits the system
7. **Styling**: Background fills, color palettes (in natural language, e.g., "soft sky blue", "warm peach" — never hex codes), line weights, icon styles

## Visual Design Guidelines
- Use soft, muted pastel colors described in natural language (e.g., "soft sky blue", "warm peach", "light sage green"). NEVER output hex color codes, pixel dimensions, point sizes, or CSS-like specifications.
- Specify rounded rectangles with fills and slightly darker borders, bold sans-serif text for labels.
- Maintain publication-quality aesthetics suitable for top-tier AI conferences (NeurIPS, ICML, ICLR, CVPR).

## Methodology Section
{source_context}

## Figure Caption
{caption}

Based on the methodology section and figure caption, generate a comprehensive and detailed textual description of the methodology diagram.`;

export const LINKEDIN_PLANNER_PROMPT = `You are creating a visual diagram for a LinkedIn post. Given the content below, generate a detailed description of an illustrative figure suitable for LinkedIn.

** CRITICAL LINKEDIN STYLE RULES: **
- The design should be CLEAN and MINIMAL — suitable for social media consumption.
- Do NOT use heavy borders or boxes around the heading, subtitle, or key takeaway text. These should flow naturally without rectangular containers.
- The heading should be bold and prominent at the top, but NOT inside a box.
- If there is a subtitle, it should appear directly below the heading in a lighter weight, NOT boxed.
- The key takeaway or conclusion should be written as a natural statement at the bottom — do NOT label it with "Takeaway:" or "Key Takeaway:". Just state the insight directly.
- Use generous whitespace between sections.
- The overall look should feel like a polished LinkedIn infographic or carousel slide.
- Leave empty space at the bottom-left corner for a logo/URL watermark (do not render any logo or URL yourself).

Your description should cover:
1. **Overall layout**: Clean vertical flow, major sections
2. **Components**: Each element with its exact label — heading, subtitle (if any), diagram content, takeaway statement
3. **Connections**: Arrows, flows, and their directions
4. **Groupings**: How components are visually grouped (subtle background tints, not heavy borders)
5. **Labels and annotations**: Text labels
6. **Styling**: Use soft, modern pastel colors in natural language. Clean sans-serif typography. White or very light background. No hex codes or CSS values.

## Content
{source_context}

## Figure Caption / Title
{caption}

Based on the content and caption, generate a comprehensive and detailed textual description of the LinkedIn-style diagram.`;

export const VISUALIZER_PROMPT = `You are an expert scientific diagram illustrator. Generate high-quality scientific diagrams based on user requests. Note that do not include figure titles in the image.

CRITICAL: All text labels in the diagram must be rendered in clear, readable English. Use the EXACT label names specified in the description. Do not generate garbled, misspelled, or non-English text.

{description}`;

export const CRITIC_PROMPT = `## ROLE

You are a Lead Visual Designer for top-tier AI conferences (e.g., NeurIPS 2025).

## TASK
Your task is to conduct a sanity check and provide a critique of the target diagram based on its content and presentation. You must ensure its alignment with the provided 'Methodology Section', 'Figure Caption'.

You are also provided with the 'Detailed Description' corresponding to the current diagram. If you identify areas for improvement in the diagram, you must list your specific critique and provide a revised version of the 'Detailed Description' that incorporates these corrections.

## CRITIQUE & REVISION RULES

1. Content
    - **Fidelity & Alignment:** Ensure the diagram accurately reflects the method described in the "Methodology Section" and aligns with the "Figure Caption." Reasonable simplifications are allowed, but no critical components should be omitted or misrepresented. Also, the diagram should not contain any hallucinated content. Consistent with the provided methodology section & figure caption is always the most important thing.
    - **Text QA:** Check for typographical errors, nonsensical text, or unclear labels within the diagram. Flag any garbled, misspelled, or non-English text. Flag any hex codes, pixel dimensions, or CSS values rendered as text. Suggest specific corrections.
    - **Validation of Examples:** Verify the accuracy of illustrative examples. If the diagram includes specific examples to aid understanding (e.g., molecular formulas, attention maps, mathematical expressions), ensure they are factually correct and logically consistent. If an example is incorrect, provide the correct version.
    - **Caption Exclusion:** Ensure the figure caption text (e.g., "Figure 1: Overview...") is **not** included within the image visual itself. The caption should remain separate.
2. Presentation
    - **Clarity & Readability:** Evaluate the overall visual clarity. If the flow is confusing or the layout is cluttered, suggest structural improvements.
    - **Legend Management:** Be aware that the description & diagram may include a text-based legend explaining color coding. Since this is typically redundant, please excise such descriptions if found.

** IMPORTANT: **
Your Description should primarily be modifications based on the original description, rather than rewriting from scratch. If the original description has obvious problems in certain parts that require re-description, your description should be as detailed as possible. Semantically, clearly describe each element and their connections. Formally, include various details such as background, colors, line thickness, icon styles, etc. Remember: vague or unclear specifications will only make the generated figure worse, not better.

## INPUT DATA

- **Methodology Section**: {source_context}
- **Figure Caption**: {caption}
- **Detailed Description**: {description}
- **Target Diagram**: [The generated figure is provided as an image]

## OUTPUT
Provide your response strictly in the following JSON format:
{
    "critic_suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2"],
    "revised_description": "The complete revised description incorporating all suggested fixes. If no revision is needed, set to null."
}

If the image is publication-ready with no issues, return:
{
    "critic_suggestions": [],
    "revised_description": null
}`;
