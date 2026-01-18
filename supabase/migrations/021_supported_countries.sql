-- Add supported countries to platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('supported_countries', '[
    {"code": "KE", "name": "Kenya", "enabled": true},
    {"code": "UG", "name": "Uganda", "enabled": true},
    {"code": "TZ", "name": "Tanzania", "enabled": true},
    {"code": "NG", "name": "Nigeria", "enabled": true},
    {"code": "GH", "name": "Ghana", "enabled": true},
    {"code": "ZA", "name": "South Africa", "enabled": true},
    {"code": "RW", "name": "Rwanda", "enabled": true},
    {"code": "ET", "name": "Ethiopia", "enabled": true},
    {"code": "ZM", "name": "Zambia", "enabled": true},
    {"code": "MW", "name": "Malawi", "enabled": true}
  ]'::jsonb, 'Supported countries for lending')
ON CONFLICT (key) DO NOTHING;
