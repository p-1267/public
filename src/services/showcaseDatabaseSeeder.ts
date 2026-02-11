import { supabase } from '../lib/supabase';
import { seedShowcaseTasks } from './showcaseTaskSeeder';

const SHOWCASE_AGENCY_ID = 'showcase-agency-001';
const SHOWCASE_SUPERVISOR_ID = 'showcase-user-supervisor';
const SHOWCASE_CAREGIVER_ID = 'showcase-user-caregiver';
const SHOWCASE_RESIDENT_IDS = ['showcase-resident-a', 'showcase-resident-b'];

export async function initializeShowcaseDatabase(): Promise<void> {
  console.log('[ShowcaseDBSeeder] Initializing showcase database...');

  try {
    // Call the comprehensive seed function that creates 20 residents and 400+ tasks
    const { data, error } = await supabase.rpc('seed_showcase_scenario');

    if (error) {
      console.error('[ShowcaseDBSeeder] Seed error:', error);
    } else {
      console.log('[ShowcaseDBSeeder] Database initialization complete!', data);
    }
  } catch (error) {
    console.error('[ShowcaseDBSeeder] Initialization failed:', error);
  }
}

async function seedAgency(): Promise<void> {
  const { data, error } = await supabase.rpc('seed_showcase_agency', {
    p_id: SHOWCASE_AGENCY_ID,
    p_name: 'Demo Care Agency',
    p_operating_mode: 'AGENCY',
    p_metadata: {
      total_staff: 5,
      total_residents: 2,
      active_assignments: 2,
      compliance_score: 98
    }
  });

  if (error) {
    console.warn('Seed agency error:', error);
  } else {
    console.log('[ShowcaseDBSeeder] Agency created');
  }
}

async function seedResidents(): Promise<void> {
  const residents = [
    {
      id: 'showcase-resident-a',
      full_name: 'Pat Anderson',
      date_of_birth: '1948-03-15',
      metadata: { floor: 1, unit: 'East Wing', room: '102' }
    },
    {
      id: 'showcase-resident-b',
      full_name: 'Jordan Martinez',
      date_of_birth: '1942-07-22',
      metadata: { floor: 2, unit: 'West Wing', room: '205' }
    }
  ];

  for (const resident of residents) {
    const { error } = await supabase.rpc('seed_showcase_resident', {
      p_id: resident.id,
      p_agency_id: SHOWCASE_AGENCY_ID,
      p_full_name: resident.full_name,
      p_date_of_birth: resident.date_of_birth,
      p_metadata: resident.metadata
    });

    if (error) {
      console.warn(`Seed resident ${resident.id} error:`, error);
    }
  }

  console.log('[ShowcaseDBSeeder] Residents created');
}

export async function checkShowcaseDataExists(): Promise<boolean> {
  const { data, error } = await supabase.rpc('seed_showcase_agency', {
    p_id: SHOWCASE_AGENCY_ID,
    p_name: 'Demo Care Agency',
    p_operating_mode: 'AGENCY',
    p_metadata: {
      total_staff: 5,
      total_residents: 2,
      active_assignments: 2,
      compliance_score: 98
    }
  });

  if (error) {
    console.warn('Check showcase data error:', error);
    return false;
  }

  return data?.success === true;
}
