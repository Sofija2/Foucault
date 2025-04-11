CREATE DATABASE foucault;
\c foucault  -- Подключение к БД

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DECIMAL(9,6) NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng DECIMAL(9,6) NOT NULL CHECK (lng BETWEEN -180 AND 180),
    altitude DECIMAL(6,2)
);

-- Включение PostGIS
CREATE EXTENSION postgis;

-- Индекс для геоданных
CREATE INDEX idx_locations_geo ON locations USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326
);

CREATE TABLE pendulums (
    id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id),
    length DECIMAL(5,2) NOT NULL CHECK (length > 0),
    initial_angle DECIMAL(5,2) NOT NULL,
    mass DECIMAL(6,3) NOT NULL CHECK (mass > 0)
);

CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    pendulum_id INT REFERENCES pendulums(id),
    start_time TIMESTAMP DEFAULT NOW(),
    trajectory JSONB
);

INSERT INTO locations (name, lat, lng) VALUES
('Париж', 48.858844, 2.294351),
('Санкт-Петербург', 59.934280, 30.335099),
('Экватор (0 широты)', 0.0, -78.463806),
('Северный полюс', 90.0, 0.0),
('Сингапур', 1.3521, 103.8198);

CREATE OR REPLACE FUNCTION calculate_precession(latitude DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    omega_earth DECIMAL := 7.2921159e-5;  -- Угловая скорость Земли
BEGIN
    RETURN omega_earth * SIN(RADIANS(latitude));
END;
$$ LANGUAGE plpgsql;

-- Функция триггера
CREATE OR REPLACE FUNCTION update_simulation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO simulations (pendulum_id, trajectory)
    VALUES (
        NEW.id,
        jsonb_build_array(
            jsonb_build_object('x', 0, 'y', 0, 't', NOW())
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Привязка триггера
CREATE TRIGGER after_pendulum_insert
AFTER INSERT ON pendulums
FOR EACH ROW EXECUTE FUNCTION update_simulation();

SELECT 
    p.id,
    l.name AS location,
    calculate_precession(l.lat) AS precession
FROM pendulums p
JOIN locations l ON p.location_id = l.id
WHERE l.lat BETWEEN 45 AND 55;

EXPLAIN ANALYZE
SELECT * FROM locations 
WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(30.335099, 59.934280)::geography,
    100000  -- 100 км
);

