export interface MySkillAssignment {
  id: number;
  skill: number;
  skill_name: string;
  category_name: string;
  level: number;
  status: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface SkillLevelDescription {
  id: number;
  skill: number;
  level: number;
  description: string;
}

export interface Skill {
  id: number;
  name: string;
  category: number;
  level_descriptions: SkillLevelDescription[];
}

export interface SkillCategory {
  id: number;
  name: string;
  parent: number | null;
}

export interface MatrixEmployee {
  id: number;
  full_name: string;
}

export interface MatrixSkill {
  id: number;
  name: string;
  category_name: string;
}

export interface MatrixAssignment {
  id: number;
  employee: number;
  skill: number;
  level: number;
  status: string;
}

export interface SkillMatrixData {
  employees: MatrixEmployee[];
  skills: MatrixSkill[];
  assignments: MatrixAssignment[];
}

export interface SkillGap {
  employee_id: number;
  employee_name: string;
  team_name: string;
  skill_id: number;
  skill_name: string;
  category_name: string;
  required_level: number;
  actual_level: number;
  gap: number;
}

export interface SkillRequirement {
  id: number;
  team: number;
  team_name: string;
  skill: number;
  skill_name: string;
  category_name: string;
  required_level: number;
}

export interface TeamAssignment {
  id: number;
  employee: number;
  employee_name: string;
  skill: number;
  skill_name: string;
  category_name: string;
  level: number;
  status: string;
  created_at: string;
}

export interface SkillTrendData {
  skill_name: string;
  points: { date: string; level: number }[];
}

export interface TeamComparisonEntry {
  skill_id: number;
  skill_name: string;
  category_name: string;
  teams: Record<string, number | null>;
}

export interface SkillRecommendation {
  skill_id: number;
  skill_name: string;
  category_name: string;
  team_name: string;
  current_level: number;
  required_level: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RoleTemplateSkill {
  id: number;
  skill: number;
  skill_name: string;
  required_level: number;
}

export interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  skills: RoleTemplateSkill[];
}

export interface LevelDistribution {
  overall: Record<string, number>;
  teams: { team_id: number; team_name: string; distribution: Record<string, number> }[];
}

export interface SkillHistoryEntry {
  id: number;
  employee: number;
  employee_name: string;
  skill: number;
  skill_name: string;
  old_level: number | null;
  new_level: number | null;
  action: string;
  changed_by: number | null;
  changed_by_name: string | null;
  timestamp: string;
}

export interface KpiEntry {
  team_id: number;
  team_name: string;
  member_count: number;
  avg_level: number;
  coverage: number;
  total_assignments: number;
  confirmed_ratio: number;
}
