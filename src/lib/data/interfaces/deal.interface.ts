export type DealStage = 'Prospect' | 'Qualification' | 'Proposition' | 'Négociation' | 'Gagné' | 'Perdu';

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  clientId: string;
  organizationId: string;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}
