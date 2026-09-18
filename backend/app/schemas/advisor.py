"""Pydantic schemas for the Advisor domain."""

from pydantic import BaseModel, Field

from app.services.advisor_service import get_valid_personas


class ChatRequest(BaseModel):
    """Request body for the advisor chat endpoint."""

    message: str = Field(
        min_length=1,
        max_length=2000,
        examples=["How should I save tax this year?"],
    )
    persona: str = Field(
        default="warren_buffett",
        description="Advisor persona — one of: " + ", ".join(get_valid_personas()),
    )
    top_k: int | None = Field(
        default=None,
        ge=1,
        le=20,
        description="How many knowledge chunks to retrieve (defaults to RAG_TOP_K)",
    )


class RetrievedChunk(BaseModel):
    """One knowledge-base passage that informed the reply."""

    text: str = Field(description="The retrieved passage")
    source: str = Field(description="Document title, or the topic label for seed facts")
    topic: str | None = Field(default=None, description="Topic key, e.g. 'indian_tax'")
    section: str | None = Field(
        default=None,
        description="Heading of the document section the passage came from",
    )
    score: float | None = Field(
        default=None,
        description="Cosine similarity to the question, 0–1 (higher is closer)",
    )
    persona_match: bool = Field(
        default=False,
        description="True when the passage is the answering persona's own material",
    )


class ChatResponse(BaseModel):
    """Non-streaming response from the advisor."""

    reply: str
    persona: str
    sources: list[str] = Field(
        description="Knowledge-base excerpts that informed the reply",
    )
    citations: list[RetrievedChunk] = Field(
        default_factory=list,
        description="The same excerpts with their topic and similarity score",
    )


class KnowledgeStatus(BaseModel):
    """Diagnostic description of the retrieval stack."""

    vector_store: str = Field(description="'chroma' or 'keyword-fallback'")
    embeddings: str = Field(description="Embedding backend in use")
    splitter: str = Field(description="Text splitter in use")
    documents: int = Field(description="Number of indexed chunks")
    source_documents: int = Field(
        default=0,
        description="Number of markdown knowledge documents on disk",
    )
    collection: str = Field(description="Vector-store collection name")
    error: str | None = Field(
        default=None,
        description="Why the vector store is unavailable, if it is",
    )


# ── Tax planning ─────────────────────────────────────────────────────────


class TaxPlanRequest(BaseModel):
    """Optional overrides for the tax estimate."""

    annual_income: float | None = Field(
        default=None,
        ge=0,
        description="Gross annual income. Defaults to monthly income on your profile × 12.",
    )
    declared_deductions: float | None = Field(
        default=None,
        ge=0,
        description=(
            "Total old-regime deductions (80C + 80D + NPS + home loan interest…). "
            "Overrides the amount inferred from your transactions."
        ),
    )
    persona: str = Field(
        default="indian_finance",
        description="Which advisor persona explains the result",
    )
    explain: bool = Field(
        default=True,
        description="Set false to get the numbers without calling the LLM",
    )


class RegimeBreakdown(BaseModel):
    """Tax computed under one regime."""

    regime: str
    gross_income: float
    deductions_applied: float
    taxable_income: float
    tax_before_rebate: float
    rebate: float
    surcharge: float
    cess: float
    total_tax: float


class DeductionHeadroom(BaseModel):
    """One deduction, how much is estimated used, and what remains."""

    section: str = Field(description="Familiar section name, e.g. '80C'")
    new_section: str = Field(description="Equivalent under the Income-tax Act, 2025")
    label: str
    limit: float
    estimated_used: float
    headroom: float
    available_in_new_regime: bool
    note: str = ""


class TaxPlanResponse(BaseModel):
    """Regime comparison, deduction headroom, and a grounded explanation."""

    tax_year: str
    annual_income: float
    new_regime: RegimeBreakdown
    old_regime: RegimeBreakdown
    recommended_regime: str = Field(description="'new' or 'old'")
    potential_saving: float = Field(
        description="Difference in total tax between the two regimes",
    )
    opportunities: list[DeductionHeadroom]
    assumptions: list[str] = Field(
        description="What the estimate assumed — read these before acting on it",
    )
    explanation: str = Field(
        default="",
        description="The advisor's explanation, grounded in the tax documents",
    )
    citations: list[RetrievedChunk] = Field(
        default_factory=list,
        description="Knowledge-base passages the explanation drew on",
    )
    disclaimer: str = Field(
        default=(
            "This is an estimate based on the income and transactions in this app, "
            "not a tax computation. It does not account for capital gains, other "
            "income heads, or deductions recorded elsewhere. Verify with a "
            "chartered accountant before filing."
        ),
    )
