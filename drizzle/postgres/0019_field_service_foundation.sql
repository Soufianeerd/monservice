-- Migration 0019: Field Service Foundation & Generalized Sector/Profession Constraint

ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_profession_health_check";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_sector_profession_check";

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_sector_profession_check" CHECK (
  (
    (sector = 'health' AND profession IN (
      'physiotherapist', 'osteopath', 'speech_therapist', 'podiatrist',
      'occupational_therapist', 'psychomotor_therapist', 'dietitian'
    ))
    OR
    (sector IN ('field_services', 'artisan') AND profession IN (
      'mason', 'plumber', 'electrician', 'heating_technician', 'hvac_technician',
      'roofer', 'carpenter', 'joiner', 'painter', 'plasterer', 'insulation_specialist',
      'tiler', 'earthworks_contractor', 'facade_specialist', 'locksmith', 'glazier',
      'sanitation_specialist', 'renovation_contractor', 'pool_specialist', 'architect',
      'construction_project_manager', 'engineering_office', 'quantity_surveyor',
      'maintenance_technician', 'technical_installer', 'auto_mechanic',
      'auto_body_repairer', 'auto_service_center', 'phone_repairer',
      'computer_repairer', 'appliance_repairer', 'electronics_repairer',
      'landscaper', 'custom_manufacturer', 'artisan_retailer',
      'technical_service_provider'
    ))
    OR
    (profession IS NULL)
  ) AND NOT (sector IS NULL AND profession IS NOT NULL)
);
