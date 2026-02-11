/*
  # Comprehensive Health Metrics System (Device & Wearable Integration)
  
  ## Purpose
  Mandatory device and wearable integration for Independent Senior + Family scenario.
  Supports automatic health data ingestion from medical-grade, consumer, and personal devices.
  
  ## New Tables
  
  ### `wearable_devices`
  Extends device_registry with wearable-specific metadata
  - `device_registry_id` (uuid, FK to device_registry)
  - `device_class` (text) - MEDICAL_GRADE, ADVANCED_CONSUMER, PERSONAL_CONSUMER
  - `sync_method` (text) - BLUETOOTH_BLE, COMPANION_APP, CLOUD_API, SDK
  - `sync_frequency_minutes` (int) - expected sync interval
  - `auto_sync_enabled` (boolean) - whether automatic sync is active
  - `last_auto_sync` (timestamptz) - last automatic sync timestamp
  - `supported_metrics` (jsonb) - array of metric types this device supports
  
  ### `health_metrics`
  Comprehensive health metric storage with device source tracking
  - `id` (uuid)
  - `resident_id` (uuid, FK)
  - `device_registry_id` (uuid, FK, nullable) - null = manual entry
  - `metric_category` (text) - CARDIOVASCULAR, BLOOD_PRESSURE, RESPIRATORY, etc.
  - `metric_type` (text) - specific metric name
  - `value_numeric` (decimal) - numeric value
  - `value_json` (jsonb) - complex values (ECG waveform, sleep stages)
  - `unit` (text) - measurement unit
  - `confidence_level` (text) - HIGH, MEDIUM, LOW based on device trust
  - `measurement_source` (text) - AUTOMATIC_DEVICE, MANUAL_ENTRY
  - `recorded_at` (timestamptz) - when measurement was taken
  - `synced_at` (timestamptz) - when data was synced to system
  - `device_firmware_version` (text)
  - `device_battery_level` (int)
  - `created_at` (timestamptz)
  
  ### `health_metric_trends`
  7-day and 30-day baseline trends for each metric
  - `id` (uuid)
  - `resident_id` (uuid, FK)
  - `metric_type` (text)
  - `period` (text) - DAY_7, DAY_30
  - `avg_value` (decimal)
  - `min_value` (decimal)
  - `max_value` (decimal)
  - `std_deviation` (decimal)
  - `sample_count` (int)
  - `last_calculated_at` (timestamptz)
  - `trend_direction` (text) - INCREASING, DECREASING, STABLE
  
  ### `device_sync_log`
  Audit trail of all automatic sync operations
  - `id` (uuid)
  - `device_registry_id` (uuid, FK)
  - `sync_timestamp` (timestamptz)
  - `sync_status` (text) - SUCCESS, FAILED, PARTIAL
  - `metrics_synced_count` (int)
  - `error_message` (text, nullable)
  - `sync_method_used` (text)
  
  ## Supported Metric Types
  
  BLOOD_PRESSURE: systolic, diastolic, mean_arterial_pressure, pulse_pressure
  CARDIOVASCULAR: heart_rate, resting_hr, max_hr, hrv, ecg, afib_detected, irregular_heartbeat
  BLOOD_CIRCULATION: spo2, perfusion_index, blood_volume_pulse
  RESPIRATORY: respiratory_rate, apnea_events
  TEMPERATURE: skin_temp, core_temp
  ACTIVITY: steps, distance, calories, active_minutes, intensity_level, floors_climbed
  SLEEP: sleep_duration, deep_sleep, light_sleep, rem_sleep, sleep_score, sleep_efficiency, wake_events
  SAFETY: fall_detected, sos_triggered
  STRESS: stress_score, gsr_eda
  OTHER: body_position, motion_pattern
  
  ## Security
  - RLS enabled on all tables
  - Residents can view their own metrics
  - Family members can view linked resident metrics
  - Device data immutable (append-only)
  
  ## Enforcement Rules
  1. Manual entry MUST be clearly labeled
  2. Device source MUST be tracked
  3. Automatic sync MUST NOT use fake/inferred data
  4. Device capabilities MUST match actual hardware
  5. All metrics auditable back to source device
*/

-- Wearable Devices Table
CREATE TABLE IF NOT EXISTS wearable_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registry_id uuid NOT NULL REFERENCES device_registry(id) ON DELETE CASCADE,
  device_class text NOT NULL CHECK (device_class IN (
    'MEDICAL_GRADE',
    'ADVANCED_CONSUMER',
    'PERSONAL_CONSUMER'
  )),
  sync_method text NOT NULL CHECK (sync_method IN (
    'BLUETOOTH_BLE',
    'COMPANION_APP',
    'CLOUD_API',
    'SDK',
    'MANUAL_ONLY'
  )),
  sync_frequency_minutes int NOT NULL DEFAULT 60 CHECK (sync_frequency_minutes > 0),
  auto_sync_enabled boolean NOT NULL DEFAULT true,
  last_auto_sync timestamptz,
  supported_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  vendor_api_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_registry_id)
);

CREATE INDEX IF NOT EXISTS idx_wearable_devices_registry ON wearable_devices(device_registry_id);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_class ON wearable_devices(device_class);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_auto_sync ON wearable_devices(auto_sync_enabled, last_auto_sync);

-- Health Metrics Table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  device_registry_id uuid REFERENCES device_registry(id) ON DELETE SET NULL,
  metric_category text NOT NULL CHECK (metric_category IN (
    'BLOOD_PRESSURE',
    'CARDIOVASCULAR',
    'BLOOD_CIRCULATION',
    'RESPIRATORY',
    'TEMPERATURE',
    'ACTIVITY',
    'SLEEP',
    'SAFETY',
    'STRESS',
    'OTHER'
  )),
  metric_type text NOT NULL,
  value_numeric decimal(10, 2),
  value_json jsonb,
  unit text,
  confidence_level text NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW', 'REJECTED')),
  measurement_source text NOT NULL CHECK (measurement_source IN ('AUTOMATIC_DEVICE', 'MANUAL_ENTRY')),
  recorded_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  device_firmware_version text,
  device_battery_level int CHECK (device_battery_level >= 0 AND device_battery_level <= 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_required_for_automatic CHECK (
    (measurement_source = 'AUTOMATIC_DEVICE' AND device_registry_id IS NOT NULL)
    OR measurement_source = 'MANUAL_ENTRY'
  )
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_resident ON health_metrics(resident_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_device ON health_metrics(device_registry_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_category ON health_metrics(metric_category, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_source ON health_metrics(measurement_source);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded ON health_metrics(recorded_at DESC);

-- Health Metric Trends Table
CREATE TABLE IF NOT EXISTS health_metric_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  period text NOT NULL CHECK (period IN ('DAY_7', 'DAY_30')),
  avg_value decimal(10, 2),
  min_value decimal(10, 2),
  max_value decimal(10, 2),
  std_deviation decimal(10, 2),
  sample_count int NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  trend_direction text CHECK (trend_direction IN ('INCREASING', 'DECREASING', 'STABLE', 'INSUFFICIENT_DATA')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, metric_type, period)
);

CREATE INDEX IF NOT EXISTS idx_health_metric_trends_resident ON health_metric_trends(resident_id);
CREATE INDEX IF NOT EXISTS idx_health_metric_trends_type ON health_metric_trends(metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metric_trends_period ON health_metric_trends(period);

-- Device Sync Log Table
CREATE TABLE IF NOT EXISTS device_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_registry_id uuid NOT NULL REFERENCES device_registry(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  sync_timestamp timestamptz NOT NULL DEFAULT now(),
  sync_status text NOT NULL CHECK (sync_status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
  metrics_synced_count int NOT NULL DEFAULT 0,
  error_message text,
  sync_method_used text NOT NULL,
  sync_duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_sync_log_device ON device_sync_log(device_registry_id, sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_sync_log_resident ON device_sync_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_device_sync_log_status ON device_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_device_sync_log_timestamp ON device_sync_log(sync_timestamp DESC);

-- Enable RLS
ALTER TABLE wearable_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metric_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wearable_devices
CREATE POLICY "Residents can view own wearable devices"
  ON wearable_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM device_registry dr
      WHERE dr.id = wearable_devices.device_registry_id
      AND dr.resident_id IN (
        SELECT r.id FROM residents r
        INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
        WHERE srl.senior_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Family can view linked resident wearable devices"
  ON wearable_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM device_registry dr
      WHERE dr.id = wearable_devices.device_registry_id
      AND dr.resident_id IN (
        SELECT r.id FROM residents r
        INNER JOIN family_resident_links frl ON frl.resident_id = r.id
        WHERE frl.family_user_id = auth.uid()
      )
    )
  );

-- RLS Policies for health_metrics
CREATE POLICY "Residents can view own health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
      WHERE srl.senior_user_id = auth.uid()
    )
  );

CREATE POLICY "Family can view linked resident health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN family_resident_links frl ON frl.resident_id = r.id
      WHERE frl.family_user_id = auth.uid()
    )
  );

CREATE POLICY "Residents can insert own health metrics"
  ON health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
      WHERE srl.senior_user_id = auth.uid()
    )
  );

-- RLS Policies for health_metric_trends
CREATE POLICY "Residents can view own health trends"
  ON health_metric_trends FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
      WHERE srl.senior_user_id = auth.uid()
    )
  );

CREATE POLICY "Family can view linked resident health trends"
  ON health_metric_trends FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN family_resident_links frl ON frl.resident_id = r.id
      WHERE frl.family_user_id = auth.uid()
    )
  );

-- RLS Policies for device_sync_log
CREATE POLICY "Residents can view own device sync logs"
  ON device_sync_log FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN senior_resident_links srl ON srl.resident_id = r.id
      WHERE srl.senior_user_id = auth.uid()
    )
  );

CREATE POLICY "Family can view linked resident device sync logs"
  ON device_sync_log FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN family_resident_links frl ON frl.resident_id = r.id
      WHERE frl.family_user_id = auth.uid()
    )
  );