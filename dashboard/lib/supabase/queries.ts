import { createClient } from "@/lib/supabase/server"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Brief = {
  id: string
  date: string
  content: string
  status: string
  approved_at: string | null
  created_at: string
}

export type Post = {
  id: string
  agent: string
  type: string
  content: string
  status: string
  scheduled_for: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
  published_at: string | null
  metadata?: Record<string, unknown> | null
  image_url?: string | null
  image_prompt?: string | null
  art_director_approved?: boolean
  ceo_approved?: boolean
  aspect_ratio?: "1:1" | "9:16" | "4:5" | null
}

export type Metric = {
  id: string
  platform: string
  metric_name: string
  value: number
  post_id: string | null
  collected_at: string
}

export type AgentLog = {
  id: string
  agent: string
  action: string
  status: string
  output: string | null
  error: string | null
  tokens_used: number | null
  duration_ms: number | null
  created_at: string
}

export type LifecycleStage = "onboarding" | "active" | "at_risk" | "churned"
export type WorkStyle = "retainer" | "project" | "one_off"
export type PaymentMethod = "pix" | "boleto" | "credit_card"
export type NfConfig = "automatic" | "manual"

export type FirstPaymentStatus = "paid" | "pending" | "overdue"

export type Client = {
  id: string
  name: string
  email: string | null
  ticket: number
  status: string
  started_at: string
  next_delivery: string | null
  notes: string | null
  created_at: string
  lifecycle_stage: LifecycleStage
  tokens_used_mtd: number
  work_style: WorkStyle | null
  recurring: boolean
  payment_method: PaymentMethod | null
  nf_config: NfConfig | null
  contract_url: string | null
  phone: string | null
  project_title: string | null
  briefing: string | null
  recurring_amount: number | null
}

export type PipelineItem = {
  id: string
  name: string
  company: string | null
  email: string | null
  stage: string
  estimated_ticket: number | null
  win_probability: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvoiceStatus = "paid" | "pending" | "overdue"

export type Transaction = {
  id: string
  type: "income" | "expense"
  description: string
  amount: number
  category: string | null
  date: string
  client_id: string | null
  created_at: string
  invoice_status: InvoiceStatus | null
  invoice_number: string | null
}

export type Okr = {
  id: string
  quarter: string
  objective: string
  key_results: Array<{ title: string; target: number; current: number; unit: string }>
  status: string
  created_at: string
}

// Mirrors the WeeklyPlanOutput from agents/agents/research-weekly-agent.ts.
export type WeeklyPlanData = {
  week_of: string
  theme: string
  market_gaps: Array<{ gap: string; evidence: string; why_now: string }>
  angles: Array<{
    angle: string
    thesis: string
    best_format: "carousel" | "stories" | "post_unico"
    risk: string
  }>
  weekly_plan: {
    pillar: { title: string; format: "carousel"; angle_ref: string }
    satellites: Array<{
      title: string
      format: "stories" | "post_unico"
      angle_ref: string
    }>
  }
  narrative_risks: string[]
}

export type WeeklyPlan = {
  id: string
  week_of: string
  theme: string
  plan: WeeklyPlanData
  status: string
  approved_at: string | null
  created_at: string
}

// ─── Briefs ───────────────────────────────────────────────────────────────────

export async function getLatestBrief(): Promise<Brief | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("briefs")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getPendingBriefs(): Promise<Brief[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("briefs")
    .select("*")
    .eq("status", "pending")
    .order("date", { ascending: false })
  return data ?? []
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getPendingPosts(): Promise<Post[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getPublishedPostsThisWeek(): Promise<number> {
  const supabase = createClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", weekAgo.toISOString())
  return count ?? 0
}

export async function getPostsByStatus(status: string): Promise<Post[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
  return data ?? []
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function getRecentMetrics(limit = 20): Promise<Metric[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("metrics")
    .select("*")
    .order("collected_at", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getLatestMetricByName(
  platform: string,
  metricName: string,
): Promise<Metric | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("metrics")
    .select("*")
    .eq("platform", platform)
    .eq("metric_name", metricName)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ─── Agent logs ───────────────────────────────────────────────────────────────

export async function getAgentLogs(limit = 40): Promise<AgentLog[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getLastRunPerAgent(): Promise<Record<string, AgentLog>> {
  const supabase = createClient()
  const agents = ["ceo", "research", "content", "analytics"]
  const results = await Promise.all(
    agents.map((agent) =>
      supabase
        .from("agent_logs")
        .select("*")
        .eq("agent", agent)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  )
  const map: Record<string, AgentLog> = {}
  for (let i = 0; i < agents.length; i++) {
    const row = results[i]?.data
    if (row) map[agents[i]!] = row as AgentLog
  }
  return map
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getActiveClients(): Promise<Client[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
  return data ?? []
}

export async function getAllClients(): Promise<Client[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("started_at", { ascending: false })
  return data ?? []
}

export async function getClientInvoices(clientId: string): Promise<Transaction[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("client_id", clientId)
    .not("invoice_status", "is", null)
    .order("date", { ascending: false })
  return (data ?? []) as Transaction[]
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function getPipeline(): Promise<PipelineItem[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("pipeline")
    .select("*")
    .order("created_at", { ascending: false })
  return data ?? []
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(limit = 200): Promise<Transaction[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getMRRCurrentMonth(): Promise<number> {
  const supabase = createClient()
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  const { data } = await supabase
    .from("transactions")
    .select("amount")
    .eq("type", "income")
    .eq("category", "mrr")
    .gte("date", start)
    .lte("date", end)
  return (data ?? []).reduce((sum, r) => sum + r.amount, 0)
}

// ─── Weekly plans ─────────────────────────────────────────────────────────────

export async function getPendingWeeklyPlans(): Promise<WeeklyPlan[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("status", "pending")
    .order("week_of", { ascending: false })
  return data ?? []
}

export async function getLatestWeeklyPlan(): Promise<WeeklyPlan | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("weekly_plans")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ─── OKRs ─────────────────────────────────────────────────────────────────────

export async function getActiveOkrs(): Promise<Okr[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("okrs")
    .select("*")
    .eq("status", "active")
    .order("quarter", { ascending: false })
  return data ?? []
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export type MeetingType = "weekly_planning" | "crisis" | "content_review" | "ad_hoc"
export type MeetingStatus = "active" | "awaiting_user" | "completed" | "archived"
export type MeetingSender =
  | "user"
  | "research_agent"
  | "content_agent"
  | "ceo_agent"
  | "analytics_agent"
  | "devils_advocate"

export type Meeting = {
  id: string
  title: string
  type: MeetingType
  status: MeetingStatus
  created_at: string
  completed_at: string | null
}

export type MeetingMessage = {
  id: string
  meeting_id: string
  sender: MeetingSender
  role: "user" | "assistant" | "system"
  content: string
  sequence: number
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function listMeetings(limit = 30): Promise<Meeting[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("agent_meetings")
    .select("id, title, type, status, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as Meeting[]
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("agent_meetings")
    .select("id, title, type, status, created_at, completed_at")
    .eq("id", id)
    .maybeSingle()
  return (data ?? null) as Meeting | null
}

export async function getMeetingMessages(meeting_id: string): Promise<MeetingMessage[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("meeting_messages")
    .select("id, meeting_id, sender, role, content, sequence, metadata, created_at")
    .eq("meeting_id", meeting_id)
    .order("sequence", { ascending: true })
  return (data ?? []) as MeetingMessage[]
}

export async function getLatestCompletedWeeklyPlanningMeeting(): Promise<Meeting | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("agent_meetings")
    .select("id, title, type, status, created_at, completed_at")
    .eq("type", "weekly_planning")
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  return (data ?? null) as Meeting | null
}

export async function getPostsBySourceMeeting(meetingId: string): Promise<Post[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("metadata->>source_meeting_id", meetingId)
    .order("created_at", { ascending: true })
  return (data ?? []) as Post[]
}

export async function inferTeseCentral(meetingId: string): Promise<string | null> {
  const messages = await getMeetingMessages(meetingId)
  const ceoMsg = messages.find(
    (m) => m.sender === "ceo_agent" && /tese central/i.test(m.content),
  )
  if (!ceoMsg) return null
  const match = ceoMsg.content.match(
    /tese central[^\n:]*[:\-–]\s*([^\n]+(?:\n(?!\s*\n)[^\n]+)*)/i,
  )
  if (!match || !match[1]) return null
  return match[1].trim().replace(/^\*+|\*+$/g, "").trim()
}

// ─── Derived / computed ───────────────────────────────────────────────────────

export async function getWeightedPipeline(): Promise<number> {
  const items = await getPipeline()
  return items.reduce((sum, item) => {
    const ticket = item.estimated_ticket ?? 0
    const prob = item.win_probability ?? 0
    return sum + ticket * (prob / 100)
  }, 0)
}
