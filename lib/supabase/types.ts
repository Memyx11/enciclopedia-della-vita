/**
 * NUR: LIFE RPG - Database Types
 * Auto-generated from schema v1.0.0
 */

// ============================================
// ENUMS
// ============================================

export type GoalType = 'obiettivo' | 'boss' | 'sogno'
export type GoalStatus = 'active' | 'completed' | 'failed' | 'blocked'
export type TaskStatus = 'pending' | 'completed' | 'failed' | 'skipped'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'
export type SkillLevel = 'base' | 'competente' | 'esperto' | 'maestro' | 'leggenda'
export type MaterialRarity = 'comune' | 'non_comune' | 'raro' | 'epico' | 'leggendario'
export type MemoryType = 'fact' | 'preference' | 'achievement' | 'struggle' | 'insight' | 'relationship' | 'goal_context' | 'emotional_state'
export type ActivityType = 'task_completed' | 'goal_completed' | 'boss_task_completed' | 'routine_completed' | 'skill_leveled' | 'material_obtained' | 'achievement_unlocked' | 'test_passed' | 'test_failed' | 'streak_milestone' | 'level_up' | 'xp_gained'
export type TestType = 'mental' | 'physical'
export type TestStatus = 'pending' | 'passed' | 'failed' | 'expired'

// ============================================
// AREA SLUGS
// ============================================

export type AreaSlug =
    | 'finanze'
    | 'carriera'
    | 'formazione'
    | 'salute'
    | 'spiritualita'
    | 'relazioni'
    | 'casa'
    | 'hobby'
    | 'esperienze'
    | 'sociale'

export const AREA_SLUGS: AreaSlug[] = [
    'finanze', 'carriera', 'formazione', 'salute', 'spiritualita',
    'relazioni', 'casa', 'hobby', 'esperienze', 'sociale'
]

export const AREA_INFO: Record<AreaSlug, { name: string; icon: string; color: string }> = {
    finanze: { name: 'Finanze', icon: '💰', color: '#10B981' },
    carriera: { name: 'Carriera', icon: '💼', color: '#3B82F6' },
    formazione: { name: 'Formazione', icon: '📚', color: '#8B5CF6' },
    salute: { name: 'Salute', icon: '❤️', color: '#EF4444' },
    spiritualita: { name: 'Spiritualità', icon: '🧘', color: '#F59E0B' },
    relazioni: { name: 'Relazioni', icon: '👥', color: '#EC4899' },
    casa: { name: 'Casa', icon: '🏠', color: '#6366F1' },
    hobby: { name: 'Hobby', icon: '🎨', color: '#14B8A6' },
    esperienze: { name: 'Esperienze', icon: '✈️', color: '#F97316' },
    sociale: { name: 'Sociale', icon: '🌍', color: '#84CC16' }
}

// ============================================
// DATABASE TABLES
// ============================================

export interface Profile {
    id: string
    clerk_user_id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
    birth_date: string | null
    city: string | null
    bio: string | null
    wake_time: string // TIME as string "HH:MM"
    sleep_time: string
    xp: number
    level: number
    title: string
    streak_days: number
    streak_last_date: string | null
    lives: number
    lives_last_lost: string | null
    onboarding_completed: boolean
    onboarding_step: number
    nur_narrative_memory: string | null
    created_at: string
    updated_at: string
}

export interface LifeArea {
    id: string
    clerk_user_id: string
    slug: AreaSlug
    name: string
    icon: string | null
    color: string | null
    progress: number
    priority: number
    has_primary_goal: boolean
    created_at: string
    updated_at: string
}

export interface Goal {
    id: string
    clerk_user_id: string
    area_id: string
    title: string
    description: string | null
    type: GoalType
    status: GoalStatus
    progress: number
    is_primary: boolean
    is_blocked: boolean
    chain_order: number | null
    xp_reward: number
    due_date: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
}

export interface GoalDependency {
    id: string
    goal_id: string
    depends_on_goal_id: string
    created_at: string
}

export interface Task {
    id: string
    clerk_user_id: string
    goal_id: string | null
    area_id: string | null
    title: string
    description: string | null
    is_boss_task: boolean
    is_routine: boolean
    recurrence: RecurrenceType
    recurrence_days: number[] | null
    status: TaskStatus
    scheduled_date: string
    xp_reward: number
    completed_at: string | null
    created_at: string
    updated_at: string
}

export interface RoutineItem {
    id: string
    clerk_user_id: string
    title: string
    description: string | null
    time_of_day: string | null
    duration_minutes: number
    days_of_week: number[]
    area_id: string | null
    is_active: boolean
    order_index: number
    xp_reward: number
    created_at: string
    updated_at: string
}

export interface Skill {
    id: string
    clerk_user_id: string
    name: string
    description: string | null
    icon: string | null
    level: SkillLevel
    progress: number
    area_id: string | null
    created_at: string
    updated_at: string
}

export interface Material {
    id: string
    clerk_user_id: string
    name: string
    description: string | null
    icon: string | null
    rarity: MaterialRarity
    quantity: number
    area_id: string | null
    is_obtained: boolean
    obtained_at: string | null
    created_at: string
    updated_at: string
}

export interface GoalSkill {
    id: string
    goal_id: string
    skill_id: string
    required_level: SkillLevel
    created_at: string
}

export interface GoalMaterial {
    id: string
    goal_id: string
    material_id: string
    required_quantity: number
    created_at: string
}

export interface NurMemory {
    id: string
    clerk_user_id: string
    type: MemoryType
    content: string
    area_id: string | null
    related_goal_id: string | null
    importance: number
    is_current: boolean
    superseded_by: string | null
    created_at: string
    updated_at: string
}

export interface ChatMessage {
    id: string
    clerk_user_id: string
    conversation_id: string
    role: 'user' | 'assistant'
    content: string
    tokens_used: number | null
    area_context: string | null
    created_at: string
}

export interface ActivityLog {
    id: string
    clerk_user_id: string
    activity_type: ActivityType
    description: string | null
    xp_gained: number
    related_goal_id: string | null
    related_task_id: string | null
    related_skill_id: string | null
    related_area_id: string | null
    created_at: string
}

export interface Achievement {
    id: string
    clerk_user_id: string
    slug: string
    name: string
    description: string | null
    icon: string | null
    xp_reward: number
    unlocked_at: string
}

export interface CurrentActivity {
    id: string
    clerk_user_id: string
    title: string
    task_id: string | null
    routine_item_id: string | null
    started_at: string
    planned_duration_minutes: number | null
    is_active: boolean
    ended_at: string | null
}

export interface UserTest {
    id: string
    clerk_user_id: string
    title: string
    description: string
    type: TestType
    verifies: string
    related_goal_id: string | null
    related_skill_id: string | null
    status: TestStatus
    user_response: string | null
    nur_evaluation: string | null
    due_date: string | null
    completed_at: string | null
    xp_reward: number
    created_at: string
    updated_at: string
}

export interface AchievementDefinition {
    id: string
    slug: string
    name: string
    description: string | null
    icon: string | null
    xp_reward: number
    category: string | null
    requirement_type: string | null
    requirement_value: number | null
    created_at: string
}

// ============================================
// INSERT TYPES (without auto-generated fields)
// ============================================

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type LifeAreaInsert = Omit<LifeArea, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
    id?: string
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
    id?: string
}

export type RoutineItemInsert = Omit<RoutineItem, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type SkillInsert = Omit<Skill, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type MaterialInsert = Omit<Material, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type NurMemoryInsert = Omit<NurMemory, 'id' | 'created_at' | 'updated_at'> & {
    id?: string
}

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at'> & {
    id?: string
}

export type UserTestInsert = Omit<UserTest, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
    id?: string
}

// ============================================
// UPDATE TYPES (partial)
// ============================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'clerk_user_id' | 'created_at'>>
export type LifeAreaUpdate = Partial<Omit<LifeArea, 'id' | 'clerk_user_id' | 'slug' | 'created_at'>>
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'clerk_user_id' | 'created_at'>>
export type TaskUpdate = Partial<Omit<Task, 'id' | 'clerk_user_id' | 'created_at'>>
export type SkillUpdate = Partial<Omit<Skill, 'id' | 'clerk_user_id' | 'created_at'>>
export type UserTestUpdate = Partial<Omit<UserTest, 'id' | 'clerk_user_id' | 'created_at'>>

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================

export interface GoalWithArea extends Goal {
    area: LifeArea
}

export interface GoalWithDependencies extends Goal {
    dependencies: Goal[]
    dependents: Goal[]
}

export interface GoalFull extends Goal {
    area: LifeArea
    required_skills: (GoalSkill & { skill: Skill })[]
    required_materials: (GoalMaterial & { material: Material })[]
    dependencies: Goal[]
}

export interface TaskWithGoal extends Task {
    goal: Goal | null
    area: LifeArea | null
}

export interface AreaWithGoals extends LifeArea {
    goals: Goal[]
}

export interface AreaWithStats extends LifeArea {
    goals_count: number
    goals_completed: number
    primary_goal: Goal | null
}

export interface ProfileWithStats extends Profile {
    total_goals: number
    completed_goals: number
    total_tasks: number
    completed_tasks: number
    skills_count: number
    materials_count: number
    achievements_count: number
}

// ============================================
// GAMIFICATION HELPERS
// ============================================

export interface LevelInfo {
    level: number
    title: string
    currentXp: number
    xpForNextLevel: number
    progress: number // 0-100
}

export const LEVEL_TITLES: Record<number, string> = {
    1: 'Nuovo Arrivato',
    5: 'Principiante',
    10: 'Apprendista',
    15: 'Praticante',
    20: 'Competente',
    25: 'Guerriero',
    30: 'Veterano',
    35: 'Esperto',
    40: 'Maestro',
    50: 'Leggenda'
}

export function getTitleForLevel(level: number): string {
    const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a)
    for (const threshold of thresholds) {
        if (level >= threshold) {
            return LEVEL_TITLES[threshold]
        }
    }
    return 'Nuovo Arrivato'
}

export function calculateXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5))
}

export function calculateLevelFromXp(xp: number): number {
    return Math.max(1, Math.floor(Math.pow(xp / 100, 2 / 3)))
}

export function getLevelInfo(xp: number): LevelInfo {
    const level = calculateLevelFromXp(xp)
    const xpForCurrentLevel = calculateXpForLevel(level)
    const xpForNextLevel = calculateXpForLevel(level + 1)
    const xpIntoLevel = xp - xpForCurrentLevel
    const xpNeeded = xpForNextLevel - xpForCurrentLevel

    return {
        level,
        title: getTitleForLevel(level),
        currentXp: xp,
        xpForNextLevel,
        progress: Math.floor((xpIntoLevel / xpNeeded) * 100)
    }
}

// ============================================
// SKILL LEVEL HELPERS
// ============================================

export const SKILL_LEVELS_ORDER: SkillLevel[] = ['base', 'competente', 'esperto', 'maestro', 'leggenda']

export function getSkillLevelIndex(level: SkillLevel): number {
    return SKILL_LEVELS_ORDER.indexOf(level)
}

export function getNextSkillLevel(current: SkillLevel): SkillLevel | null {
    const index = getSkillLevelIndex(current)
    if (index === -1 || index >= SKILL_LEVELS_ORDER.length - 1) return null
    return SKILL_LEVELS_ORDER[index + 1]
}

export function isSkillLevelSufficient(current: SkillLevel, required: SkillLevel): boolean {
    return getSkillLevelIndex(current) >= getSkillLevelIndex(required)
}

// ============================================
// MATERIAL RARITY HELPERS
// ============================================

export const RARITY_ORDER: MaterialRarity[] = ['comune', 'non_comune', 'raro', 'epico', 'leggendario']

export const RARITY_COLORS: Record<MaterialRarity, string> = {
    comune: '#9CA3AF',      // gray
    non_comune: '#10B981',  // green
    raro: '#3B82F6',        // blue
    epico: '#8B5CF6',       // purple
    leggendario: '#F59E0B'  // amber/gold
}

export function getRarityIndex(rarity: MaterialRarity): number {
    return RARITY_ORDER.indexOf(rarity)
}
